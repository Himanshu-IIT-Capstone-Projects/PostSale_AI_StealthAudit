import os
import json
from dotenv import load_dotenv


def load_config(config_path: str = "config/config.json") -> dict:
    """
    Load environment variables and config file.
    """
    load_dotenv()
    
    try:
        print(f"\n [load_config()] loading config from: {config_path}")
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Config file not found at {config_path}")

        with open(config_path, "r") as f:
            config = json.load(f)

        return config
    except Exception as error:
        print(f"\n [load_config()] error: {error!r}")
        raise ValueError(f"Failed to load config: {error}")