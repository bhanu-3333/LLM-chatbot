import os
import time
import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from config import BASE_PATH
from models.db import get_db, Patient, Doctor
from services.auth import get_current_doctor, verify_token
from services.embedder import get_embeddings
from services.chunker import split_docs
from services.faiss_manager import save_db
from services.file_loader import load_file, SUPPORTED_EXTENSIONS

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("/", summary="List all patients for the logged-in doctor")
def list_patients(
    search: str     = Query(default="", description="Search by patient name"),
    db:     Session = Depends(get_db),
    doctor: Doctor  = Depends(get_current_doctor),
):
    query = db.query(Patient).filter(Patient.doctor_id == doctor.id)

    if search.strip():
        query = query.filter(Patient.name.ilike(f"%{search.strip()}%"))

    patients = query.order_by(Patient.name).all()

    return {
        "status":  "success",
        "doctor":  doctor.name,
        "total":   len(patients),
        "patients": [
            {
                "patient_id": p.patient_id,
                "name":       p.name,
                "age":        p.age,
                "gender":     p.gender,
            }
            for p in patients
        ]
    }


@router.get("/{patient_id}", summary="Get a single patient's details")
def get_patient(
    patient_id: str,
    db:         Session = Depends(get_db),
    doctor:     Doctor  = Depends(get_current_doctor),
):
    patient = db.query(Patient).filter(
        Patient.patient_id == patient_id,
        Patient.doctor_id  == doctor.id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found or access denied")

    return {
        "patient_id": patient.patient_id,
        "name":       patient.name,
        "age":        patient.age,
        "gender":     patient.gender,
    }


@router.get("/{patient_id}/files", summary="List all files for a patient")
def list_patient_files(
    patient_id: str,
    db:         Session = Depends(get_db),
    doctor:     Doctor  = Depends(get_current_doctor),
):
    # Verify patient belongs to doctor
    patient = db.query(Patient).filter(
        Patient.patient_id == patient_id,
        Patient.doctor_id  == doctor.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    docs_path = os.path.join(BASE_PATH, doctor.id, patient_id, "docs")
    if not os.path.exists(docs_path):
        return {"files": []}

    files = os.listdir(docs_path)
    # Sort files by name or timestamp if possible
    files.sort()
    return {"files": files}


@router.get("/{patient_id}/files/{filename}", summary="Download/View a patient file")
def get_patient_file(
    patient_id: str,
    filename:   str,
    token:      str = Query(...),
    db:         Session = Depends(get_db),
):
    # Manually verify token since it's in query param
    doctor_id = verify_token(token)
    if not doctor_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=401, detail="Doctor not found")

    # Verify patient belongs to doctor
    patient = db.query(Patient).filter(
        Patient.patient_id == patient_id,
        Patient.doctor_id  == doctor.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    file_path = os.path.join(BASE_PATH, doctor.id, patient_id, "docs", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)


@router.post("/{patient_id}/upload", summary="Upload multiple files for a patient")
async def upload_patient_files(
    patient_id: str,
    files:      List[UploadFile] = File(...),
    db:         Session = Depends(get_db),
    doctor:     Doctor  = Depends(get_current_doctor),
):
    # Verify patient belongs to doctor
    patient = db.query(Patient).filter(
        Patient.patient_id == patient_id,
        Patient.doctor_id  == doctor.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    docs_path  = os.path.join(BASE_PATH, doctor.id, patient_id, "docs")
    faiss_path = os.path.join(BASE_PATH, doctor.id, patient_id, "faiss")
    os.makedirs(docs_path,  exist_ok=True)
    os.makedirs(faiss_path, exist_ok=True)

    uploaded_files = []
    total_chunks = 0
    all_chunks = []

    for file in files:
        # Generate filename with timestamp
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        original_name = file.filename or "unnamed_file"
        new_filename = f"{timestamp}_{original_name}"
        
        file_path = os.path.join(docs_path, new_filename)
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        uploaded_files.append(new_filename)

        # Process for indexing
        try:
            documents = load_file(file_path)
            chunks = split_docs(documents)
            if chunks:
                all_chunks.extend(chunks)
                total_chunks += len(chunks)
        except Exception as e:
            print(f"[upload] Error processing {new_filename}: {e}")
            # Continue with other files even if one fails

    # Update FAISS index if new chunks were added
    if all_chunks:
        save_db(all_chunks, get_embeddings(), faiss_path)

    return {
        "status": "success",
        "message": f"Successfully uploaded {len(uploaded_files)} files",
        "files": uploaded_files,
        "total_chunks": total_chunks
    }
