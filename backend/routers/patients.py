from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from models.db import get_db, Patient, Doctor
from services.auth import get_current_doctor

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
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Patient not found or access denied")

    return {
        "patient_id": patient.patient_id,
        "name":       patient.name,
        "age":        patient.age,
        "gender":     patient.gender,
    }
