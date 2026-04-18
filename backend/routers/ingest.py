import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from langchain_community.document_loaders import PyPDFLoader

from config import BASE_PATH
from services.embedder import get_embeddings
from services.chunker import split_docs
from services.faiss_manager import save_db

router = APIRouter(tags=["Ingestion"])

@router.post("/upload", summary="Upload and index a patient PDF")
async def upload_file(
    patient_id: str = Form(...),
    patient_name: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        if not patient_id.strip():
            raise HTTPException(status_code=400, detail="patient_id is required")
        if not patient_name.strip():
            raise HTTPException(status_code=400, detail="patient_name is required")
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted")

        docs_path  = os.path.join(BASE_PATH, patient_id, "docs")
        faiss_path = os.path.join(BASE_PATH, patient_id, "faiss")
        os.makedirs(docs_path,  exist_ok=True)
        os.makedirs(faiss_path, exist_ok=True)

        file_path = os.path.join(docs_path, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        print(f"[ingest] Saved file → {file_path}")

        documents = PyPDFLoader(file_path).load()
        if not documents:
            raise HTTPException(status_code=422, detail="PDF appears to be empty or unreadable")

        # Drop image-only / blank pages
        documents = [d for d in documents if d.page_content.strip()]
        if not documents:
            raise HTTPException(status_code=422, detail="PDF contains no extractable text (may be scanned/image-only)")

        chunks = split_docs(documents)
        if not chunks:
            raise HTTPException(status_code=422, detail="No content could be extracted from PDF")

        print(f"[ingest] {len(documents)} pages → {len(chunks)} chunks for patient '{patient_id}'")

        save_db(chunks, get_embeddings(), faiss_path)

        return {
            "status": "success",
            "message": "File uploaded and indexed",
            "patient_id": patient_id,
            "patient_name": patient_name,
            "file": file.filename,
            "pages_indexed": len(documents),
            "chunks_created": len(chunks)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ingest] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
