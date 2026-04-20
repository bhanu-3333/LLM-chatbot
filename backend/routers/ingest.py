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
    summary="Upload and index a patient document (PDF, Image, Excel, Text)",
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
        # ── Validate file extension ────────────────────────────────────────────
        filename = file.filename or ""
        ext = os.path.splitext(filename)[1].lower()

        if ext not in ALLOWED_EXTENSIONS:
            allowed_str = ", ".join(sorted(ALLOWED_EXTENSIONS))
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{ext}'. Allowed: {allowed_str}"
            )

        file_type_label = _get_file_type_label(ext)
        print(f"[ingest] Received file '{filename}' (type={file_type_label})")

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

        # ── Save file to disk ──────────────────────────────────────────────────
        docs_path  = os.path.join(BASE_PATH, doctor.id, patient_id, "docs")
        faiss_path = os.path.join(BASE_PATH, doctor.id, patient_id, "faiss")
        os.makedirs(docs_path,  exist_ok=True)
        os.makedirs(faiss_path, exist_ok=True)

        file_path = os.path.join(docs_path, filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        print(f"[ingest] Saved → {file_path}")

        # ── Load & extract content ─────────────────────────────────────────────
        try:
            documents = load_file(file_path)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        chunks = split_docs(documents)
        if not chunks:
            raise HTTPException(
                status_code=422,
                detail=f"No content could be extracted from the {file_type_label}"
            )

        print(f"[ingest] {len(documents)} section(s) → {len(chunks)} chunks for patient '{patient_id}'")
        save_db(chunks, get_embeddings(), faiss_path)

        # Determine pages/sections label
        file_kind = SUPPORTED_EXTENSIONS.get(ext, "unknown")
        section_label = (
            "pages"   if file_kind == "pdf"   else
            "sheet(s)" if file_kind == "excel" else
            "section(s)"
        )

        return {
            "status":           "success",
            "message":          "File uploaded and indexed",
            "patient_id":       patient_id,
            "patient_name":     patient_name,
            "age":              age,
            "gender":           gender,
            "file":             filename,
            "file_type":        file_type_label,
            "sections_indexed": len(documents),
            "section_label":    section_label,
            "chunks_created":   len(chunks),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ingest] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
