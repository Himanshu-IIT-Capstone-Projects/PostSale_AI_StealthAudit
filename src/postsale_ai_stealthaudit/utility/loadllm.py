import os
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama

def load_llm(config: dict):
    """
    Initialize LLM based on provider from environment.
    """
    provider = os.getenv("provider")

    if provider is None:
        raise ValueError("provider not set in environment")

    provider = provider.lower()

    if provider == "openai":
        return ChatOpenAI(
            model=config["openai"]["model"],
            temperature=config["llm"]["temperature"]
        )
    elif provider == "gemini":
        return ChatGoogleGenerativeAI(
            model=config["gemini"]["model"],
            temperature=config["llm"]["temperature"]
        )
    elif provider == "ollama":
         return ChatOllama(
            model=config["ollama"]["model"], 
            temperature=config["llm"]["temperature"]
        )

    else:
        raise ValueError(f"Invalid provider: {provider}")