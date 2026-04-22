from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid

from models.db import get_db, Doctor
from services.auth import hash_password, verify_password, create_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class DoctorRegister(BaseModel):
    name:           str
    specialization: str
    email:          str
    password:       str

# ── Endpoints ─────────────────────────────────────────────────────────────────



@router.post("/register-doctor", summary="Register a doctor")
def register_doctor(data: DoctorRegister, db: Session = Depends(get_db)):
    if db.query(Doctor).filter(Doctor.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    doctor = Doctor(
        id             = str(uuid.uuid4()),
        name           = data.name,
        specialization = data.specialization,
        email          = data.email,
        password_hash  = hash_password(data.password),
    )
    db.add(doctor)
    db.commit()
    print(f"[auth] Doctor registered: {data.name}")
    return {
        "status":    "success",
        "message":   f"Doctor '{data.name}' registered",
        "doctor_id": doctor.id,
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
