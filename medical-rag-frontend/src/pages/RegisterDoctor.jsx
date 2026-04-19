import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "../styles/global.css";

export default function RegisterDoctor() {
  const [form, setForm] = useState({ name: "", specialization: "", email: "", password: "", hospital_code: "" });
  const [msg, setMsg]   = useState("");
  const [err, setErr]   = useState("");
  const nav = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setMsg(""); setErr("");
    try {
      await API.post("/auth/register-doctor", form);
      setMsg("Doctor registered! Redirecting to login...");
      setTimeout(() => nav("/"), 1500);
    } catch (e) {
      setErr(e.response?.data?.detail || "Registration failed");
    }
  };

  return (
    <div className="auth-container">
      <h1>Register Doctor</h1>
      <input placeholder="Full Name"       onChange={e => set("name",           e.target.value)} />
      <input placeholder="Specialization"  onChange={e => set("specialization", e.target.value)} />
      <input placeholder="Email"           onChange={e => set("email",          e.target.value)} />
      <input placeholder="Password" type="password" onChange={e => set("password", e.target.value)} />
      <input placeholder="Hospital Code"   onChange={e => set("hospital_code",  e.target.value)} />
      <button className="btn-primary" style={{ width: "100%" }} onClick={submit}>Register</button>
      {msg && <p className="msg-success">{msg}</p>}
      {err && <p className="msg-error">{err}</p>}
      <div className="auth-links">
        <a onClick={() => nav("/")}>Back to Login</a>
      </div>
    </div>
  );
}
