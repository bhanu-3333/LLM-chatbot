import os
import re
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from config import BASE_PATH, TOP_K_CHUNKS
from models.db import get_db, Patient, Doctor
from services.auth import get_current_doctor
from services.embedder import get_embeddings
from services.faiss_manager import load_db
from services.ollama_client import generate_answer, NOT_FOUND_RESPONSE

router = APIRouter(tags=["Chat"])
# Cache for loaded FAISS indices to speed up multiple queries
_INDEX_CACHE = {}


WORD_TO_NUM = {
    "first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5,
    "sixth": 6, "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10
}

def _error(message: str, status_code: int = 400):
    return JSONResponse(status_code=status_code, content={"status": "error", "message": message})

def _extract_page(query: str):
    q = query.lower()
    m = re.search(r'page\s*(\d+)', q)
    if m:
        return int(m.group(1)) - 1
    for word, num in WORD_TO_NUM.items():
        if re.search(rf'\b{word}\s+page\b', q):
            return num - 1
    return None

def _build_citation_label(doc) -> str:
    """Build a human-readable citation label based on file type metadata."""
    name     = os.path.basename(doc.metadata.get("source", "unknown"))
    doc_type = doc.metadata.get("type", "pdf")  # pdf | image | excel | text

    if doc_type == "excel":
        sheet = doc.metadata.get("sheet", "Sheet1")
        return f"Source: {name} (Sheet: {sheet})"
    elif doc_type == "image":
        return f"Source: {name} (Image OCR)"
    elif doc_type == "text":
        return f"Source: {name} (Text File)"
    else:  # pdf or unknown
        page = doc.metadata.get("page", 0)
        return f"Source: {name} (Page {page + 1})"


def _build_citations(docs):
    seen = {}
    for doc in docs:
        label    = _build_citation_label(doc)
        sort_key = doc.metadata.get("page", doc.metadata.get("sheet", 0))
        seen[label] = sort_key
    return list(dict.fromkeys(seen.keys()))[:TOP_K_CHUNKS]


@router.post("/chat", summary="Query a patient's indexed documents")
def chat(
    patient_id: str,
    query:      str,
    db:         Session = Depends(get_db),
    doctor:     Doctor  = Depends(get_current_doctor),
):
    try:
        if not query or not query.strip():
            return _error("Please enter a valid question")

        # Verify this patient belongs to the requesting doctor
        patient = db.query(Patient).filter(
            Patient.patient_id == patient_id,
            Patient.doctor_id  == doctor.id
        ).first()

        if not patient:
            return _error("Patient not found or access denied", 404)

        print(f"[chat] doctor='{doctor.name}' patient='{patient_id}' query='{query}'")

        faiss_path = os.path.join(BASE_PATH, doctor.id, patient_id, "faiss")
        if not os.path.exists(os.path.join(faiss_path, "index.faiss")):
            return _error("Patient data not available — please upload documents first", 404)

        # Load index from cache or disk
        if faiss_path not in _INDEX_CACHE:
            print(f"[chat] Loading index from disk: {faiss_path}")
            try:
                _INDEX_CACHE[faiss_path] = load_db(faiss_path, get_embeddings())
            except Exception as load_err:
                # Don't cache failed loads — allow retry on next request
                _INDEX_CACHE.pop(faiss_path, None)
                raise load_err
        
        db_index = _INDEX_CACHE[faiss_path]

        requested_page = _extract_page(query)

        if requested_page is not None:
            print(f"[chat] Page filter → page {requested_page + 1}")
            all_docs = list(db_index.docstore._dict.values())
            docs = [d for d in all_docs if d.metadata.get("page") == requested_page][:TOP_K_CHUNKS]
            if not docs:
                return {
                    "status":     "NOT_FOUND",
                    "patient_id": patient_id,
                    "answer":     "No data found for that page",
                    "citations":  []
                }
        else:
            docs = db_index.similarity_search(query, k=TOP_K_CHUNKS)

        print(f"[chat] Retrieved {len(docs)} chunks")

        if not docs:
            return {"status": "NOT_FOUND", "patient_id": patient_id, "answer": "No relevant data found", "citations": []}

        context = "\n".join([d.page_content for d in docs])
        answer  = generate_answer(context, query)
        status  = "NOT_FOUND" if answer == NOT_FOUND_RESPONSE else "SUCCESS"

        return {
            "status":       status,
            "patient_id":   patient_id,
            "patient_name": patient.name,
            "answer":       answer,
            "citations":    _build_citations(docs) if status == "SUCCESS" else []
        }

    except Exception as e:
        print(f"[chat] Unexpected error: {e}")
        return _error(f"Unexpected error: {str(e)}", 500)
