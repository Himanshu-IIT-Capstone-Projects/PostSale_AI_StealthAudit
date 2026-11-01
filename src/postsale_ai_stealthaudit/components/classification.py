from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
import pandas as pd
from tqdm import tqdm


# -----------------------------
# Schema
# -----------------------------

class ClassificationOutput(BaseModel):
    call_type: str = Field(description="Type of customer call")
    confidence: float = Field(description="Confidence score between 0 and 1")


# -----------------------------
# Chain Builder
# -----------------------------

def get_classification_chain(llm, config):
    """
    Creates and returns the classification chain.
    """
    print("\n [get_classification_chain()] started")
    try:
        parser = PydanticOutputParser(pydantic_object=ClassificationOutput)

        prompt = PromptTemplate(
            template="""
You are a call classification assistant.

Classify the following customer support transcript into one of these categories:
{labels}

Transcript:
{transcript}

{format_instructions}
""",
            input_variables=["transcript"],
            partial_variables={
                "format_instructions": parser.get_format_instructions(),
                "labels": config["classification"]["labels"]
            }
        )

        classification_chain = prompt | llm | parser

        return classification_chain
    except Exception as error:
        print(f"\n [get_classification_chain()] error: {error!r}")
        raise
    finally:
        print("\n [get_classification_chain()] end")


# =====================================================
# Classification Step (Already added earlier)
# =====================================================

def run_classification(df: pd.DataFrame, classification_chain):
    print("\n [run_classification()] started")
    try:
        results = []

        for i, row in tqdm(df.iterrows(), total=len(df), desc="Classifying Calls"):
            try:
                output = classification_chain.invoke({
                    "transcript": row["transcript"]
                })

                results.append({
                    "call_id": row["call_id"],
                    "predicted_call_type": output.call_type,
                    "confidence": output.confidence
                })

            except Exception as error:
                print(f"\n [run_classification()] error at row {i}: {error!r}")

                results.append({
                    "call_id": row["call_id"],
                    "predicted_call_type": None,
                    "confidence": None
                })

        results_df = pd.DataFrame(results)
        df = df.merge(results_df, on="call_id")

        return df
    except Exception as error:
        print(f"\n [run_classification()] error: {error!r}")
        raise
    finally:
        print("\n [run_classification()] end")


# =====================================================
# Evaluation Step
# =====================================================

def run_evaluations(transcript, eval_plan, tone_chain, knowledge_chain, resolution_chain):
    """
    Runs required evaluators for a single transcript.
    """
    print("\n [run_evaluations()] started")
    try:
        results = {}

        if "tone_empathy" in eval_plan:
            try:
                tone_result = tone_chain.invoke({"transcript": transcript})
                results["tone"] = tone_result.model_dump()
            except Exception as error:
                print(f"\n [run_evaluations()] tone evaluation error: {error!r}")
                results["tone"] = {"error": str(error)}

        if "knowledge_accuracy" in eval_plan:
            try:
                knowledge_result = knowledge_chain.invoke({"transcript": transcript})
                results["knowledge"] = knowledge_result.model_dump()
            except Exception as error:
                print(f"\n [run_evaluations()] knowledge evaluation error: {error!r}")
                results["knowledge"] = {"error": str(error)}

        if "resolution_quality" in eval_plan:
            try:
                resolution_result = resolution_chain.invoke({"transcript": transcript})
                results["resolution"] = resolution_result.model_dump()
            except Exception as error:
                print(f"\n [run_evaluations()] resolution evaluation error: {error!r}")
                results["resolution"] = {"error": str(error)}

        return results
    except Exception as error:
        print(f"\n [run_evaluations()] error: {error!r}")
        raise
    finally:
        print("\n [run_evaluations()] end")


def apply_evaluations(df, tone_chain, knowledge_chain, resolution_chain):
    """
    Applies evaluation logic to entire dataset.
    """
    print("\n [apply_evaluations()] started")
    try:
        evaluation_outputs = []

        for i, row in tqdm(df.iterrows(), total=len(df), desc="Running Evaluations"):
            output = run_evaluations(
                transcript=row["transcript"],
                eval_plan=row["evaluation_plan"],
                tone_chain=tone_chain,
                knowledge_chain=knowledge_chain,
                resolution_chain=resolution_chain
            )

            scores = {
                "tone_empathy_score": output.get("tone", {}).get("score") or 0,
                "knowledge_accuracy_score": output.get("knowledge", {}).get("score") or 0,
                "resolution_quality_score": output.get("resolution", {}).get("score") or 0
            }
            available_scores = [score for score in scores.values() if score is not None]

            evaluation_outputs.append({
                "call_id": row["call_id"],
                "evaluation_output": output,
                **scores,
                "overall_score": (
                    round(sum(available_scores) / len(available_scores), 2)
                    if available_scores else None
                )
            })

        eval_df = pd.DataFrame(evaluation_outputs)

        df = df.merge(eval_df, on="call_id")

        return df
    except Exception as error:
        print(f"\n [apply_evaluations()] error: {error!r}")
        raise
    finally:
        print("\n [apply_evaluations()] end")


# =====================================================
# Final Reporting Step
# =====================================================

def generate_final_report(evaluation_output, final_chain):
    """
    Generates summary + recommendations for a single record.
    """
    print("\n [generate_final_report()] started")
    try:
        result = final_chain.invoke({
            "evaluation_output": evaluation_output
        })

        return {
            "summary": result.summary,
            "recommendations": result.recommendations
        }
    except Exception as error:
        print(f"\n [generate_final_report()] error: {error!r}")
        return {
            "summary": None,
            "recommendations": None,
            "error": str(error)
        }
    finally:
        print("\n [generate_final_report()] end")


def apply_final_reports(df, final_chain):
    """
    Applies final reporting to entire dataset.
    """
    print("\n [apply_final_reports()] started")
    try:
        final_outputs = []

        for i, row in tqdm(df.iterrows(), total=len(df), desc="Generating Final Reports"):
            output = generate_final_report(
                evaluation_output=row["evaluation_output"],
                final_chain=final_chain
            )

            final_outputs.append({
                "call_id": row["call_id"],
                "summary": output.get("summary"),
                "recommendations": output.get("recommendations")
            })

        final_df = pd.DataFrame(final_outputs)

        df = df.merge(final_df, on="call_id")

        return df
    except Exception as error:
        print(f"\n [apply_final_reports()] error: {error!r}")
        raise
    finally:
        print("\n [apply_final_reports()] end")

# -----------------------------
# Routing Logic
# -----------------------------

def route_call(call_type: str):
    """
    Determines evaluation plan based on call type.
    """
    print("\n [route_call()] started")
    try:
        # hard coded all three evaluations for UI 
        return ["knowledge_accuracy", "resolution_quality", "tone_empathy"]

        if call_type == "billing":
            return ["knowledge_accuracy", "resolution_quality"]

        elif call_type == "claims":
            return ["knowledge_accuracy", "resolution_quality"]

        elif call_type == "complaint":
            return ["tone_empathy", "resolution_quality"]

        elif call_type == "general_query":
            return ["knowledge_accuracy"]

        else:
            return ["knowledge_accuracy"]  # fallback
    except Exception as error:
        print(f"\n [route_call()] error: {error!r}")
        raise
    finally:
        print("\n [route_call()] end")

# -----------------------------
# Apply Routing to DataFrame
# -----------------------------

def apply_routing(df):
    """
    Adds evaluation_plan column to DataFrame.
    """
    print("\n [apply_routing()] started")
    try:
        df["evaluation_plan"] = df["predicted_call_type"].apply(route_call)
        return df
    except Exception as error:
        print(f"\n [apply_routing()] error: {error!r}")
        raise
    finally:
        print("\n [apply_routing()] end")
