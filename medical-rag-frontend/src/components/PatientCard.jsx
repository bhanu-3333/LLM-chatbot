import { useNavigate } from "react-router-dom";

export default function PatientCard({ patient }) {
  const nav = useNavigate();

  return (
    <div onClick={() => nav(`/chat/${patient.patient_id}`)}>
      <h3>{patient.name}</h3>
      <p>{patient.age} | {patient.gender}</p>
    </div>
  );
}