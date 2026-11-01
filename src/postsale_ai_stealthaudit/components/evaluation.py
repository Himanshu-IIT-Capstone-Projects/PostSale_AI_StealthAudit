from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

# =====================================================
# Final Report Schema
# =====================================================

class FinalReport(BaseModel):
    summary: str = Field(description="Overall evaluation summary")
    recommendations: list[str] = Field(description="List of actionable improvements")


# =====================================================
# Final Report Chain
# =====================================================

def get_final_report_chain(llm):
    """
    Creates final QA reporting chain.
    """
    print("\n [get_final_report_chain()] started")
    try:
        parser = PydanticOutputParser(pydantic_object=FinalReport)

        prompt = PromptTemplate(
            template="""
You are a QA manager reviewing customer support calls.

Based on the evaluation results below, generate:

1. A concise summary of the agent's performance
2. A list of actionable recommendations for improvement

Evaluation Data:
{evaluation_output}

IMPORTANT:
- Be specific and practical
- Do not repeat scores
- Focus on improvement

{format_instructions}
""",
            input_variables=["evaluation_output"],
            partial_variables={
                "format_instructions": parser.get_format_instructions()
            }
        )

        return prompt | llm | parser
    except Exception as error:
        print(f"\n [get_final_report_chain()] error: {error!r}")
        raise
    finally:
        print("\n [get_final_report_chain()] end")


# =====================================================
# Tone Evaluation
# =====================================================

class ToneEvaluation(BaseModel):
    score: int = Field(ge=1, le=5, description="Score between 1 and 5")
    reasoning: str = Field(description="Explanation of the score")


def get_tone_chain(llm):
    print("\n [get_tone_chain()] started")
    try:
        parser = PydanticOutputParser(pydantic_object=ToneEvaluation)

        prompt = PromptTemplate(
            template="""
You are a QA evaluator for customer support calls.

Evaluate the agent's tone and empathy in the following transcript.

Consider:
- Did the agent acknowledge the customer's issue?
- Was the tone polite and professional?
- Did the agent show empathy?

Transcript:
{transcript}

{format_instructions}
""",
            input_variables=["transcript"],
            partial_variables={
                "format_instructions": parser.get_format_instructions()
            }
        )

        return prompt | llm | parser
    except Exception as error:
        print(f"\n [get_tone_chain()] error: {error!r}")
        raise
    finally:
        print("\n [get_tone_chain()] end")


# =====================================================
# Knowledge Evaluation
# =====================================================

class KnowledgeEvaluation(BaseModel):
    score: int = Field(ge=1, le=5, description="Score between 1 and 5")
    reasoning: str = Field(description="Explanation of the score")


def get_knowledge_chain(llm):
    print("\n [get_knowledge_chain()] started")
    try:
        parser = PydanticOutputParser(pydantic_object=KnowledgeEvaluation)

        prompt = PromptTemplate(
            template="""
You are a QA evaluator for customer support calls.

Evaluate the agent's knowledge accuracy and clarity.

Consider:
- Did the agent provide correct and relevant information?
- Was the explanation clear and easy to understand?
- Did the agent avoid vague or misleading statements?

IMPORTANT:
- If the transcript does not contain enough information, give a moderate score (2 or 3) and explain why.

Transcript:
{transcript}

{format_instructions}
""",
            input_variables=["transcript"],
            partial_variables={
                "format_instructions": parser.get_format_instructions()
            }
        )

        return prompt | llm | parser
    except Exception as error:
        print(f"\n [get_knowledge_chain()] error: {error!r}")
        raise
    finally:
        print("\n [get_knowledge_chain()] end")


# =====================================================
# Resolution Evaluation
# =====================================================

class ResolutionEvaluation(BaseModel):
    score: int = Field(ge=1, le=5, description="Score between 1 and 5")
    reasoning: str = Field(description="Explanation of the score")


def get_resolution_chain(llm):
    print("\n [get_resolution_chain()] started")
    try:
        parser = PydanticOutputParser(pydantic_object=ResolutionEvaluation)

        prompt = PromptTemplate(
            template="""
You are a QA evaluator for customer support calls.

Evaluate the resolution quality of the agent.

Consider:
- Did the agent fully resolve the customer's issue?
- Were next steps clearly communicated?
- Did the agent confirm resolution before ending?

Transcript:
{transcript}

{format_instructions}
""",
            input_variables=["transcript"],
            partial_variables={
                "format_instructions": parser.get_format_instructions()
            }
        )

        return prompt | llm | parser
    except Exception as error:
        print(f"\n [get_resolution_chain()] error: {error!r}")
        raise
    finally:
        print("\n [get_resolution_chain()] end")
