import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "../styles/global.css";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const nav = useNavigate();

  const login = async () => {
    setError("");
    try {
      // OAuth2 requires form-encoded, not JSON
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);

      const res = await API.post("/auth/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("doctor_name", res.data.name);
      nav("/dashboard");
    } catch (e) {
      setError(e.response?.data?.detail || "Login failed");
    }
  };

  return (
    <div className="auth-container">
      <h1>Medical RAG</h1>
      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === "Enter" && login()}
      />
      <button className="btn-primary" style={{ width: "100%" }} onClick={login}>
        Login
      </button>
      {error && <p className="msg-error">{error}</p>}
      <div className="auth-links">
        <a onClick={() => nav("/register-doctor")}>Register Doctor</a>
      </div>
    </div>
  );
}
