import os
import uuid
import time
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session

from config import BASE_PATH
from models.db import get_db, Patient, Doctor
from services.auth import get_current_doctor
from services.embedder import get_embeddings
from services.chunker import split_docs
from services.faiss_manager import save_db
from services.file_loader import load_file, SUPPORTED_EXTENSIONS

router = APIRouter(tags=["Ingestion"])

# Allowed MIME types mapped from extension
ALLOWED_EXTENSIONS = set(SUPPORTED_EXTENSIONS.keys())  # .pdf, .jpg, .jpeg, .png, .xlsx, .xls, .txt, .csv


def _generate_patient_id(doctor_id: str, db: Session) -> str:
    """Auto-generate unique patient ID scoped to this doctor: {doctor_prefix}-P001"""
    count = db.query(Patient).filter(Patient.doctor_id == doctor_id).count()
    prefix = doctor_id[:6].upper()
    return f"{prefix}-P{str(count + 1).zfill(3)}"


def _get_file_type_label(ext: str) -> str:
    mapping = {
        ".pdf":  "PDF",
        ".jpg":  "JPEG Image",
        ".jpeg": "JPEG Image",
        ".png":  "PNG Image",
        ".xlsx": "Excel Spreadsheet",
        ".xls":  "Excel Spreadsheet",
        ".txt":  "Text File",
        ".csv":  "CSV File",
    }
    return mapping.get(ext.lower(), ext.upper())


@router.post(
    "/upload",
    summary="Upload and index multiple patient documents (PDF, Image, Excel, Text)",
    openapi_extra={
        "requestBody": {
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "required": ["patient_name", "age", "gender", "files"],
                        "properties": {
                            "patient_name": {"type": "string"},
                            "age":          {"type": "string"},
                            "gender":       {"type": "string"},
                            "files":        {"type": "array", "items": {"type": "string", "format": "binary"}},
                        },
                    }
                }
            },
            "required": True,
        }
    },
)
async def upload_files(
    patient_name: str = Form(...),
    age:          str = Form(...),
    gender:       str = Form(...),
    files:        List[UploadFile] = File(...),
    db:           Session = Depends(get_db),
    doctor:       Doctor  = Depends(get_current_doctor),
):
    try:
        # ── Patient lookup / creation ──────────────────────────────────────────
        existing = db.query(Patient).filter(
            Patient.doctor_id == doctor.id,
            Patient.name == patient_name.strip()
        ).first()

        if existing:
            patient_id = existing.patient_id
            print(f"[ingest] Existing patient '{patient_name}' → {patient_id}")
        else:
            patient_id = _generate_patient_id(doctor.id, db)
            patient = Patient(
                id         = str(uuid.uuid4()),
                patient_id = patient_id,
                name       = patient_name.strip(),
                age        = age.strip(),
                gender     = gender.strip(),
                doctor_id  = doctor.id,
            )
            db.add(patient)
            db.commit()
            print(f"[ingest] New patient '{patient_name}' → {patient_id}")

        docs_path  = os.path.join(BASE_PATH, doctor.id, patient_id, "docs")
        faiss_path = os.path.join(BASE_PATH, doctor.id, patient_id, "faiss")
        os.makedirs(docs_path,  exist_ok=True)
        os.makedirs(faiss_path, exist_ok=True)

        results = []
        total_chunks = 0
        all_chunks = []

        for file in files:
            filename = file.filename or "unnamed_file"
            name_ext = os.path.splitext(filename)
            # Truncate original filename to 50 chars to avoid Windows MAX_PATH issues
            safe_basename = name_ext[0][:50].strip()
            ext = name_ext[1].lower()

            if ext not in ALLOWED_EXTENSIONS:
                results.append({"file": filename, "status": "error", "message": f"Unsupported extension {ext}"})
                continue

            # Save file with timestamp
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            unique_filename = f"{timestamp}_{safe_basename}{ext}"
            file_path = os.path.join(docs_path, unique_filename)
            
            with open(file_path, "wb") as f:
                f.write(await file.read())

            try:
                documents = load_file(file_path)
                chunks = split_docs(documents)
                if chunks:
                    all_chunks.extend(chunks)
                    total_chunks += len(chunks)
                    results.append({
                        "file": filename,
                        "status": "success",
                        "sections": len(documents),
                        "chunks": len(chunks)
                    })
                else:
                    results.append({"file": filename, "status": "error", "message": "No content extracted"})
            except Exception as e:
                results.append({"file": filename, "status": "error", "message": str(e)})

        if all_chunks:
            save_db(all_chunks, get_embeddings(), faiss_path)

        return {
            "status":       "success",
            "message":      f"Processed {len(files)} files",
            "patient_id":   patient_id,
            "patient_name": patient_name,
            "results":      results,
            "total_chunks": total_chunks
        }

    except Exception as e:
        print(f"[ingest] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
