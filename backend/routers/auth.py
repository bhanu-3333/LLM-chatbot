from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid

from models.db import get_db, Hospital, Doctor
from services.auth import hash_password, verify_password, create_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class HospitalRegister(BaseModel):
    hospital_name: str
    hospital_code: str
    admin_email:   str
    password:      str

class DoctorRegister(BaseModel):
    name:           str
    specialization: str
    email:          str
    password:       str
    hospital_code:  str  # links doctor to hospital


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register-hospital", summary="Register a new hospital")
def register_hospital(data: HospitalRegister, db: Session = Depends(get_db)):
    if db.query(Hospital).filter(Hospital.hospital_code == data.hospital_code).first():
        raise HTTPException(status_code=400, detail="Hospital code already registered")
    if db.query(Hospital).filter(Hospital.admin_email == data.admin_email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    hospital = Hospital(
        id            = str(uuid.uuid4()),
        hospital_name = data.hospital_name,
        hospital_code = data.hospital_code,
        admin_email   = data.admin_email,
        password_hash = hash_password(data.password),
    )
    db.add(hospital)
    db.commit()
    print(f"[auth] Hospital registered: {data.hospital_name} ({data.hospital_code})")
    return {"status": "success", "message": f"Hospital '{data.hospital_name}' registered"}


@router.post("/register-doctor", summary="Register a doctor under a hospital")
def register_doctor(data: DoctorRegister, db: Session = Depends(get_db)):
    hospital = db.query(Hospital).filter(Hospital.hospital_code == data.hospital_code).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital code not found")
    if db.query(Doctor).filter(Doctor.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    doctor = Doctor(
        id             = str(uuid.uuid4()),
        name           = data.name,
        specialization = data.specialization,
        email          = data.email,
        password_hash  = hash_password(data.password),
        hospital_id    = hospital.id,
    )
    db.add(doctor)
    db.commit()
    print(f"[auth] Doctor registered: {data.name} at {hospital.hospital_name}")
    return {
        "status":    "success",
        "message":   f"Doctor '{data.name}' registered",
        "doctor_id": doctor.id,
        "hospital":  hospital.hospital_name,
    }


@router.post("/login", summary="Doctor login — returns JWT token")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.email == form.username).first()
    if not doctor or not verify_password(form.password, doctor.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token({"sub": doctor.id, "email": doctor.email})
    print(f"[auth] Doctor logged in: {doctor.name}")
    return {
        "access_token": token,
        "token_type":   "bearer",
        "doctor_id":    doctor.id,
        "name":         doctor.name,
        "specialization": doctor.specialization,
    }
