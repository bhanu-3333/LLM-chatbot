import os
from langchain_community.vectorstores import FAISS

def save_db(chunks, embeddings, path: str):
    """Create a new FAISS index or merge chunks into an existing one."""
    path = os.path.abspath(path)
    index_file = os.path.join(path, "index.faiss")
    print(f"[faiss] Saving index → {path}")

    if os.path.exists(index_file):
        print("[faiss] Existing index found — merging.")
        db = FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True)
        db.merge_from(FAISS.from_documents(chunks, embeddings))
    else:
        print("[faiss] No existing index — creating fresh.")
        db = FAISS.from_documents(chunks, embeddings)

    db.save_local(path)
    print(f"[faiss] Index saved. Total vectors: {db.index.ntotal}")

def load_db(path: str, embeddings):
    """Load FAISS index from disk. Raises FileNotFoundError if missing."""
    path = os.path.abspath(path)
    print(f"[faiss] Loading index ← {path}")

    if not os.path.exists(os.path.join(path, "index.faiss")):
        raise FileNotFoundError(f"No FAISS index at: {path}")

    return FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True)
