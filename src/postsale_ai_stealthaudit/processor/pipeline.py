from postsale_ai_stealthaudit.components.evaluation import (
    get_resolution_chain, 
    get_knowledge_chain, 
    get_tone_chain,
    get_final_report_chain
)
from postsale_ai_stealthaudit.components.classification import (
    get_classification_chain,
    run_classification,
    apply_routing,
    apply_evaluations,
    apply_final_reports
)
from postsale_ai_stealthaudit.utility.loadconfig import load_config
from postsale_ai_stealthaudit.utility.loadllm import load_llm


# =====================================================
# Full Pipeline Execution
def run_full_pipeline(df):
    """
    Executes the complete QA evaluation pipeline.
    """
    print("\n [run_full_pipeline()] started")
    try:
        # Load config
        config = load_config()

        # Initialize LLM
        llm = load_llm(config)

        # Initialize chains
        classification_chain = get_classification_chain(llm, config)

        # Initialize other chains (tone, knowledge, resolution, final report)
        tone_chain = get_tone_chain(llm)
        knowledge_chain = get_knowledge_chain(llm)
        resolution_chain = get_resolution_chain(llm)
        final_chain = get_final_report_chain(llm)

        # Execute pipeline
        df = run_classification(df, classification_chain)
        df = apply_routing(df)
        df = apply_evaluations(
            df,
            tone_chain,
            knowledge_chain,
            resolution_chain
        )
        df = apply_final_reports(df, final_chain)

        return df
    except Exception as error:
        print(f"\n [run_full_pipeline()] error: {error!r}")
        raise
    finally:
        print("\n [run_full_pipeline()] end")
