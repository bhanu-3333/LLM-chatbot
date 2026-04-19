import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session

from config import BASE_PATH
from models.db import get_db, Patient, Doctor
from services.auth import get_current_doctor
from services.embedder import get_embeddings
from services.chunker import split_docs
from services.faiss_manager import save_db
from services.pdf_loader import load_pdf

router = APIRouter(tags=["Ingestion"])


def _generate_patient_id(doctor_id: str, db: Session) -> str:
    """Auto-generate unique patient ID scoped to this doctor: {doctor_prefix}-P001"""
    count = db.query(Patient).filter(Patient.doctor_id == doctor_id).count()
    # Use first 6 chars of doctor_id to namespace the patient ID
    prefix = doctor_id[:6].upper()
    return f"{prefix}-P{str(count + 1).zfill(3)}"


@router.post(
    "/upload",
    summary="Upload and index a patient PDF",
    openapi_extra={
        "requestBody": {
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "required": ["patient_name", "age", "gender", "file"],
                        "properties": {
                            "patient_name": {"type": "string"},
                            "age":          {"type": "string"},
                            "gender":       {"type": "string"},
                            "file":         {"type": "string", "format": "binary"},
                        },
                    }
                }
            },
            "required": True,
        }
    },
)
async def upload_file(
    patient_name: str = Form(...),
    age:          str = Form(...),
    gender:       str = Form(...),
    file:         UploadFile = File(...),
    db:           Session = Depends(get_db),
    doctor:       Doctor  = Depends(get_current_doctor),
):
    try:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted")

        # Check if patient already exists for this doctor (by name match)
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

        # Store under doctor's own folder to prevent cross-doctor access
        docs_path  = os.path.join(BASE_PATH, doctor.id, patient_id, "docs")
        faiss_path = os.path.join(BASE_PATH, doctor.id, patient_id, "faiss")
        os.makedirs(docs_path,  exist_ok=True)
        os.makedirs(faiss_path, exist_ok=True)

        file_path = os.path.join(docs_path, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        print(f"[ingest] Saved → {file_path}")

        try:
            documents = load_pdf(file_path)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        chunks = split_docs(documents)
        if not chunks:
            raise HTTPException(status_code=422, detail="No content could be extracted from PDF")

        print(f"[ingest] {len(documents)} pages → {len(chunks)} chunks for patient '{patient_id}'")
        save_db(chunks, get_embeddings(), faiss_path)

        return {
            "status":        "success",
            "message":       "File uploaded and indexed",
            "patient_id":    patient_id,
            "patient_name":  patient_name,
            "age":           age,
            "gender":        gender,
            "file":          file.filename,
            "pages_indexed": len(documents),
            "chunks_created": len(chunks),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ingest] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
