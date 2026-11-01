
from postsale_ai_stealthaudit.utility.loadconfig import load_config
from postsale_ai_stealthaudit.utility.loadllm import load_llm


def run_full_pipeline(df):
    """
    Executes the complete QA evaluation pipeline.
    """

    # Load config
    config = load_config()

    # Initialize LLM
    llm = load_llm(config)
    
    return df

'''
    # Initialize chains
    classification_chain = get_classification_chain(llm, config)

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
'''
