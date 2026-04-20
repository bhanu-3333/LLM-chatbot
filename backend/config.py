import os

# Base storage path — resolved relative to this file, always correct
BASE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "storage", "patients"))

# Embedding model
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# LLM model (Ollama) — use a small model to fit in available RAM
# Options: "tinyllama" (~1GB), "phi" (~1.6GB), "mistral" (~4.5GB needs 5GB+ free RAM)
LLM_MODEL = "mistral"

# Retrieval
TOP_K_CHUNKS = 3
