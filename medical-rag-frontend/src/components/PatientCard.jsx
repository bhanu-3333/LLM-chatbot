import { useNavigate } from "react-router-dom";
import "../styles/global.css";

export default function PatientCard({ patient }) {
  const nav = useNavigate();

  return (
    <div className="card" onClick={() => nav(`/chat/${patient.patient_id}`)}>
      <h2>{patient.name}</h2>
      <p style={{ color: "#94a3b8", fontSize: 13 }}>
        {patient.patient_id}  ·  Age {patient.age}  ·  {patient.gender}
      </p>
    </div>
  );
}
