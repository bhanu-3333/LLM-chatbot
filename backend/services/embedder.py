import os
from langchain_huggingface import HuggingFaceEmbeddings
from config import EMBEDDING_MODEL

# Force offline mode — use locally cached model, no HuggingFace network calls
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Singleton — loaded once at first request, reused for all subsequent calls
_embeddings = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        print(f"[embedder] Loading embedding model: {EMBEDDING_MODEL} (offline mode)")
        _embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        print("[embedder] Embedding model ready.")
    return _embeddings
