import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "../styles/global.css";

export default function RegisterHospital() {
  const [form, setForm] = useState({ hospital_name: "", hospital_code: "", admin_email: "", password: "" });
  const [msg, setMsg]   = useState("");
  const [err, setErr]   = useState("");
  const nav = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setMsg(""); setErr("");
    try {
      await API.post("/auth/register-hospital", form);
      setMsg("Hospital registered! You can now register doctors.");
      setTimeout(() => nav("/register-doctor"), 1500);
    } catch (e) {
      setErr(e.response?.data?.detail || "Registration failed");
    }
  };

  return (
    <div className="auth-container">
      <h1>Register Hospital</h1>
      <input placeholder="Hospital Name"  onChange={e => set("hospital_name", e.target.value)} />
      <input placeholder="Hospital Code"  onChange={e => set("hospital_code", e.target.value)} />
      <input placeholder="Admin Email"    onChange={e => set("admin_email",   e.target.value)} />
      <input placeholder="Password" type="password" onChange={e => set("password", e.target.value)} />
      <button className="btn-primary" style={{ width: "100%" }} onClick={submit}>Register</button>
      {msg && <p className="msg-success">{msg}</p>}
      {err && <p className="msg-error">{err}</p>}
      <div className="auth-links">
        <a onClick={() => nav("/")}>Back to Login</a>
      </div>
    </div>
  );
}
