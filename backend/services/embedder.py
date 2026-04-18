from langchain_huggingface import HuggingFaceEmbeddings
from config import EMBEDDING_MODEL

# Singleton — loaded once at first request, reused for all subsequent calls
_embeddings = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        print(f"[embedder] Loading embedding model: {EMBEDDING_MODEL}")
        _embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        print("[embedder] Embedding model ready.")
    return _embeddings
