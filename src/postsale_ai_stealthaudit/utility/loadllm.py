import os
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama

def load_llm(config: dict):
    print("\n [load_llm()] started")
    try:
        print(f"\n [load_llm()] config: {config}")

        provider = config["provider"]  # Extracts 'ollama'
        print(f"\n [load_llm()] provider: {provider}")

        # Grab the specific provider's block (e.g., config['ollama'])
        provider_config = config[provider]

        if provider == "openai":
            return ChatOpenAI(
                model=provider_config["model"],
                temperature=provider_config["temperature"]
            )
        elif provider == "gemini":
            return ChatGoogleGenerativeAI(
                model=provider_config["model"],
                temperature=provider_config["temperature"]
            )
        elif provider == "ollama":
            return ChatOllama(
                model=provider_config["model"], 
                temperature=provider_config["temperature"]
            )
        else:
            raise ValueError(f"Invalid provider: {provider}")
    except Exception as error:
        print(f"\n [load_llm()] error: {error!r}")
        raise
