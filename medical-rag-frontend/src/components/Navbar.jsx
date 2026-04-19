import { useNavigate } from "react-router-dom";
import "../styles/global.css";

export default function Navbar() {
  const nav  = useNavigate();
  const name = localStorage.getItem("doctor_name") || "Doctor";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("doctor_name");
    nav("/");
  };

  return (
    <div className="navbar">
      <span>🏥 Medical RAG</span>
      <span style={{ color: "#94a3b8", fontSize: 13 }}>Dr. {name}</span>
      <button className="btn-secondary" onClick={() => nav("/dashboard")}>Dashboard</button>
      <button className="btn-secondary" onClick={() => nav("/upload")}>Upload</button>
      <button className="btn-secondary" onClick={() => nav("/library")}>Library</button>
      <button className="btn-danger"    onClick={logout}>Logout</button>
    </div>
  );
}
