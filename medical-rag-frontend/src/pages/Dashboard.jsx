import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/global.css";

export default function Dashboard() {
  const nav  = useNavigate();
  const name = localStorage.getItem("doctor_name") || "Doctor";

  return (
    <div>
      <Navbar />
      <div className="page">
        <h1>Welcome, Dr. {name}</h1>
        <div style={{ display: "flex", gap: 16 }}>
          <div className="card" style={{ flex: 1 }} onClick={() => nav("/upload")}>
            <h2>📤 Upload Records</h2>
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Upload patient PDFs and index them for AI retrieval</p>
          </div>
          <div className="card" style={{ flex: 1 }} onClick={() => nav("/library")}>
            <h2>📚 Patient Library</h2>
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Browse all patients and open their AI chatbot</p>
          </div>
        </div>
      </div>
    </div>
  );
}
