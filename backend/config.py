import os

# Base storage path — resolved relative to this file, always correct
BASE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "storage", "patients"))

# Embedding model
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# LLM model (Ollama)
LLM_MODEL = "mistral"

# Retrieval
TOP_K_CHUNKS = 3
