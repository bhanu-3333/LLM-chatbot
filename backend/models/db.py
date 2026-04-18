from sqlalchemy import Column, String, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
import uuid
import os

DATABASE_URL = f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'medical_rag.db'))}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class Hospital(Base):
    __tablename__ = "hospitals"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    hospital_name = Column(String, nullable=False)
    hospital_code = Column(String, unique=True, nullable=False)
    admin_email   = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)

    doctors  = relationship("Doctor",  back_populates="hospital")


class Doctor(Base):
    __tablename__ = "doctors"

    id             = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name           = Column(String, nullable=False)
    specialization = Column(String, nullable=False)
    email          = Column(String, unique=True, nullable=False)
    password_hash  = Column(String, nullable=False)
    hospital_id    = Column(String, ForeignKey("hospitals.id"), nullable=False)

    hospital = relationship("Hospital", back_populates="doctors")
    patients = relationship("Patient",  back_populates="doctor")


class Patient(Base):
    __tablename__ = "patients"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, unique=True, nullable=False)   # e.g. P001
    name       = Column(String, nullable=False)
    age        = Column(String, nullable=False)
    gender     = Column(String, nullable=False)
    doctor_id  = Column(String, ForeignKey("doctors.id"), nullable=False)

    doctor = relationship("Doctor", back_populates="patients")


def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
