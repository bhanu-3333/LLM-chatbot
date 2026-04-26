import os
import re
import json
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from config import BASE_PATH, TOP_K_CHUNKS
from models.db import get_db, Patient, Doctor
from services.auth import get_current_doctor
from services.embedder import get_embeddings
from services.faiss_manager import load_db
from services.ollama_client import stream_answer, generate_answer, NOT_FOUND_RESPONSE

router = APIRouter(prefix="/chat", tags=["Chat"])
# Cache for loaded FAISS indices to speed up multiple queries
_INDEX_CACHE = {}

def invalidate_cache(faiss_path: str):
    """Clear cached index when new documents are uploaded."""
    _INDEX_CACHE.pop(faiss_path, None)
    print(f"[chat] Cache invalidated for: {faiss_path}")


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


@router.post("/", summary="Query a patient's indexed documents")
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
            scored = db_index.similarity_search_with_score(query, k=TOP_K_CHUNKS)
            scored.sort(key=lambda x: x[1])
            docs = [doc for doc, score in scored]
            print(f"[chat] Top scores: {[round(s,3) for _,s in scored]}")
            print(f"[chat] Sources: {[os.path.basename(d.metadata.get('source','?')) for d in docs]}")

        print(f"[chat] Retrieved {len(docs)} chunks")

        if not docs:
            return {"status": "NOT_FOUND", "patient_id": patient_id, "answer": "No relevant data found", "citations": []}

        context = "\n".join([d.page_content for d in docs])
        answer  = generate_answer(context, query)
        status  = "NOT_FOUND" if answer == NOT_FOUND_RESPONSE else "SUCCESS"

        # Save messages to database
        from models.db import ChatMessage
        citations_list = _build_citations(docs) if status == "SUCCESS" else []
        
        user_msg = ChatMessage(
            patient_id=patient_id,
            doctor_id=doctor.id,
            role="user",
            text=query
        )
        asst_msg = ChatMessage(
            patient_id=patient_id,
            doctor_id=doctor.id,
            role="assistant",
            text=answer,
            citations=json.dumps(citations_list) if citations_list else None
        )
        db.add(user_msg)
        db.add(asst_msg)
        db.commit()

        return {
            "status":       status,
            "patient_id":   patient_id,
            "patient_name": patient.name,
            "answer":       answer,
            "citations":    citations_list
        }

    except Exception as e:
        print(f"[chat] Unexpected error: {e}")
        return _error(f"Unexpected error: {str(e)}", 500)

@router.get("/history/{patient_id}", summary="Get chat history for a patient")
def get_chat_history(
    patient_id: str,
    db:         Session = Depends(get_db),
    doctor:     Doctor  = Depends(get_current_doctor),
):
    from models.db import ChatMessage
    messages = db.query(ChatMessage).filter(
        ChatMessage.patient_id == patient_id,
        ChatMessage.doctor_id  == doctor.id
    ).order_by(ChatMessage.timestamp.asc()).all()

    return {
        "status": "success",
        "messages": [
            {
                "role":      m.role,
                "text":      m.text,
                "citations": json.loads(m.citations) if m.citations else [],
                "timestamp": m.timestamp.isoformat()
            }
            for m in messages
        ]
    }


@router.get("/stream", summary="Stream a patient's indexed documents response")
def chat_stream(
    patient_id: str,
    query:      str,
    db:         Session = Depends(get_db),
    doctor:     Doctor  = Depends(get_current_doctor),
):
    from models.db import ChatMessage
    try:
        if not query or not query.strip():
            return _error("Please enter a valid question")

        patient = db.query(Patient).filter(
            Patient.patient_id == patient_id,
            Patient.doctor_id  == doctor.id
        ).first()

        if not patient:
            return _error("Patient not found or access denied", 404)

        # 1. Save User Message immediately
        user_msg = ChatMessage(
            patient_id=patient_id,
            doctor_id=doctor.id,
            role="user",
            text=query
        )
        db.add(user_msg)
        db.commit()

        faiss_path = os.path.join(BASE_PATH, doctor.id, patient_id, "faiss")
        if not os.path.exists(os.path.join(faiss_path, "index.faiss")):
            return _error("Patient data not available", 404)

        if faiss_path not in _INDEX_CACHE:
            _INDEX_CACHE[faiss_path] = load_db(faiss_path, get_embeddings())
        
        db_index = _INDEX_CACHE[faiss_path]
        requested_page = _extract_page(query)

        def stream_generator():
            full_answer = ""
            citations_list = []
            try:
                # Retrieval — score-ranked across ALL documents in the patient's index
                if requested_page is not None:
                    all_docs = list(db_index.docstore._dict.values())
                    docs = [d for d in all_docs if d.metadata.get("page") == requested_page][:TOP_K_CHUNKS]
                else:
                    # Use score-based retrieval to rank chunks from ALL uploaded files
                    scored = db_index.similarity_search_with_score(query, k=TOP_K_CHUNKS)
                    # Sort by score ascending (lower = more similar in FAISS L2)
                    scored.sort(key=lambda x: x[1])
                    docs = [doc for doc, score in scored]
                    print(f"[chat] Top scores: {[round(s,3) for _,s in scored]}")
                    print(f"[chat] Sources: {[os.path.basename(d.metadata.get('source','?')) for d in docs]}")

                    # Keyword fallback — scan docstore for chunks containing key query terms
                    # that may have been missed due to chunk boundary splits
                    query_keywords = [w.upper() for w in query.split() if len(w) > 3]
                    retrieved_ids = {id(d) for d in docs}
                    all_stored = list(db_index.docstore._dict.values())
                    for kw in query_keywords:
                        for d in all_stored:
                            if kw in d.page_content.upper() and id(d) not in retrieved_ids:
                                docs.append(d)
                                retrieved_ids.add(id(d))
                                print(f"[chat] Keyword fallback: added chunk containing '{kw}'")
                                break
                    docs = docs[:TOP_K_CHUNKS + 2]

                if not docs:
                    ans = "No relevant data found"
                    yield json.dumps({"answer": ans, "citations": []}) + "\n"
                    # Save assistant response
                    asst_msg = ChatMessage(patient_id=patient_id, doctor_id=doctor.id, role="assistant", text=ans)
                    db.add(asst_msg)
                    db.commit()
                    return

                context = "\n".join([d.page_content for d in docs])
                citations_list = _build_citations(docs)

                # Send citations
                yield json.dumps({"citations": citations_list}) + "\n"

                # Stream and collect the answer
                for line in stream_answer(context, query):
                    yield line
                    try:
                        data = json.loads(line)
                        if "chunk" in data:
                            full_answer += data["chunk"]
                    except: pass
                
                # 2. Save Assistant Message once complete
                if full_answer.strip():
                    asst_msg = ChatMessage(
                        patient_id=patient_id,
                        doctor_id=doctor.id,
                        role="assistant",
                        text=full_answer.strip(),
                        citations=json.dumps(citations_list)
                    )
                    db.add(asst_msg)
                    db.commit()

            except Exception as e:
                yield json.dumps({"error": str(e)}) + "\n"

        return StreamingResponse(stream_generator(), media_type="text/event-stream")

    except Exception as e:
        print(f"[chat_stream] Error: {e}")
        return _error(str(e), 500)
