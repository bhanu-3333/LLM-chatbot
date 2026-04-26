from sqlalchemy import Column, String, ForeignKey, create_engine, DateTime, Integer, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import uuid
import os

DATABASE_URL = f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'medical_rag.db'))}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()



class Doctor(Base):
    __tablename__ = "doctors"

    id             = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name           = Column(String, nullable=False)
    specialization = Column(String, nullable=False)
    email          = Column(String, unique=True, nullable=False)
    password_hash  = Column(String, nullable=False)
    hospital_id    = Column(String, nullable=True) # Optional now

    patients = relationship("Patient",  back_populates="doctor")


class Patient(Base):
    __tablename__ = "patients"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, nullable=False)        # e.g. 3597084A-P001
    name       = Column(String, nullable=False)
    age        = Column(String, nullable=False)
    gender     = Column(String, nullable=False)
    doctor_id  = Column(String, ForeignKey("doctors.id"), nullable=False)

    doctor   = relationship("Doctor", back_populates="patients")
    messages = relationship("ChatMessage", back_populates="patient", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id         = Column(Integer, primary_key=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"))
    doctor_id  = Column(String, ForeignKey("doctors.id"))
    role       = Column(String) # "user" or "assistant"
    text       = Column(Text)
    citations  = Column(Text, nullable=True) # JSON string of citations
    timestamp  = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="messages")
    doctor  = relationship("Doctor")


def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
