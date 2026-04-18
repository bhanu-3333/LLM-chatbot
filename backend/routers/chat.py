import os
import re
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from config import BASE_PATH, TOP_K_CHUNKS
from services.embedder import get_embeddings
from services.faiss_manager import load_db
from services.ollama_client import generate_answer, NOT_FOUND_RESPONSE

router = APIRouter(tags=["Chat"])

WORD_TO_NUM = {
    "first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5,
    "sixth": 6, "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10
}

def _error(message: str, status_code: int = 400):
    return JSONResponse(status_code=status_code, content={"status": "error", "message": message})

def _extract_page(query: str):
    """Return 0-based page number if query mentions a specific page, else None."""
    q = query.lower()
    m = re.search(r'page\s*(\d+)', q)
    if m:
        return int(m.group(1)) - 1
    for word, num in WORD_TO_NUM.items():
        if re.search(rf'\b{word}\s+page\b', q):
            return num - 1
    return None

def _build_citations(docs):
    seen = {}
    for doc in docs:
        name = os.path.basename(doc.metadata.get("source", "unknown"))
        page = doc.metadata.get("page", 0)
        label = f"Source: {name} (Page {page + 1})"
        seen[label] = page
    return [label for label, _ in sorted(seen.items(), key=lambda x: x[1])][:TOP_K_CHUNKS]

@router.post("/chat", summary="Query a patient's indexed documents")
def chat(patient_id: str, query: str):
    try:
        if not query or not query.strip():
            return _error("Please enter a valid question")

        print(f"[chat] patient='{patient_id}' query='{query}'")

        faiss_path = os.path.join(BASE_PATH, patient_id, "faiss")
        if not os.path.exists(os.path.join(faiss_path, "index.faiss")):
            return _error("Patient data not available", 404)

        db = load_db(faiss_path, get_embeddings())

        requested_page = _extract_page(query)

        if requested_page is not None:
            print(f"[chat] Page filter → page {requested_page + 1}")
            all_docs = list(db.docstore._dict.values())
            docs = [d for d in all_docs if d.metadata.get("page") == requested_page][:TOP_K_CHUNKS]
            if not docs:
                return {
                    "status": "NOT_FOUND",
                    "patient_id": patient_id,
                    "answer": "No data found for that page",
                    "citations": []
                }
        else:
            docs = db.similarity_search(query, k=TOP_K_CHUNKS)

        print(f"[chat] Retrieved {len(docs)} chunks")

        if not docs:
            return {"status": "NOT_FOUND", "patient_id": patient_id, "answer": "No relevant data found", "citations": []}

        context = "\n".join([d.page_content for d in docs])
        answer  = generate_answer(context, query)
        status  = "NOT_FOUND" if answer == NOT_FOUND_RESPONSE else "SUCCESS"

        return {
            "status": status,
            "patient_id": patient_id,
            "answer": answer,
            "citations": _build_citations(docs) if status == "SUCCESS" else []
        }

    except Exception as e:
        print(f"[chat] Unexpected error: {e}")
        return _error(f"Unexpected error: {str(e)}", 500)
