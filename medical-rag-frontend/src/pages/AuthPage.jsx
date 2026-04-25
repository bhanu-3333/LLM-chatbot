import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "./AuthPage.css";
import cancelIcon from "../assets/cancel.png";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login"); // "login" | "register"
  const nav = useNavigate();

  /* ── Login state ── */
  const [loginEmail, setLoginEmail]       = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError]       = useState("");
  const [loginLoading, setLoginLoading]   = useState(false);

  /* ── Register state ── */
  const [form, setForm] = useState({ name: "", specialization: "", email: "", password: "" });
  const [regMsg, setRegMsg]   = useState("");
  const [regErr, setRegErr]   = useState("");
  const [regLoading, setRegLoading] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  /* ── Handlers ── */
  const handleLogin = async () => {
    setLoginError("");
    setLoginLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("username", loginEmail);
      params.append("password", loginPassword);
      const res = await API.post("/auth/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("doctor_name", res.data.name);
      nav("/dashboard");
    } catch (e) {
      setLoginError(e.response?.data?.detail || "Login failed. Please check your credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    setRegMsg(""); setRegErr("");
    setRegLoading(true);
    try {
      await API.post("/auth/register-doctor", form);
      setRegMsg("Account created! Redirecting to login…");
      setTimeout(() => {
        setActiveTab("login");
        setRegMsg("");
      }, 1800);
    } catch (e) {
      setRegErr(e.response?.data?.detail || "Registration failed.");
    } finally {
      setRegLoading(false);
    }
  };

  const isRegister = activeTab === "register";

  return (
    <div className="auth-root">
      <div className="auth-page-wrapper">

        {/* ── Navbar ── */}
        <nav className="auth-navbar">
          <div className="auth-logo" onClick={() => nav("/")} style={{ cursor: "pointer" }}>
            MedIntel AI
          </div>
          <div className="auth-nav-links">
            <a onClick={() => nav('/')}          className="auth-nav-item" style={{ cursor: 'pointer' }}>Home</a>
            <a onClick={() => nav('/upload')}    className="auth-nav-item" style={{ cursor: 'pointer' }}>Upload Reports</a>
            <a onClick={() => nav('/library')}   className="auth-nav-item" style={{ cursor: 'pointer' }}>Library</a>
            <a onClick={() => nav('/about')}     className="auth-nav-item" style={{ cursor: 'pointer' }}>About</a>
          </div>
          <div style={{ width: 120 }} /> {/* balance spacer */}
        </nav>

        {/* ── Hero Container ── */}
        <div className="auth-hero-container">
          <div className="auth-hero-layout">

            {/* LEFT: copy */}
            <div className="auth-hero-content">
              <h1>
                {isRegister ? (
                  <>From Data to<br /><em>Decisions.</em><br />Effortlessly.</>
                ) : (
                  <>Access Smarter<br /><em>Medical</em><br />Insights.</>
                )}
              </h1>
              <p>
                {isRegister
                  ? "Join a system that helps you ask, understand, and act on patient reports in seconds."
                  : "Log in to securely explore patient data and get instant answers."}
              </p>
            </div>

            {/* RIGHT: auth card */}
            <div className="auth-form-wrapper">
              {/* Close button */}
              <button className="auth-close-btn" onClick={() => nav("/")} title="Go Home">
                <img src={cancelIcon} alt="Close" />
              </button>

              {/* Tab switcher */}
              <div className="auth-tabs">
                <div
                  className="tab-indicator"
                  style={{ left: isRegister ? "calc(50%)" : "4px" }}
                />
                <button
                  id="tab-login"
                  className={`auth-tab ${!isRegister ? "active" : ""}`}
                  onClick={() => setActiveTab("login")}
                >
                  Sign In
                </button>
                <button
                  id="tab-register"
                  className={`auth-tab ${isRegister ? "active" : ""}`}
                  onClick={() => setActiveTab("register")}
                >
                  Register
                </button>
              </div>

              {/* Sliding forms track */}
              <div className="forms-slider">
                <div className={`forms-track ${isRegister ? "slide-left" : ""}`}>

                  {/* ── LOGIN PANEL ── */}
                  <div className="form-slide" id="panel-login">
                    <p className="form-title">Welcome back</p>
                    <p className="form-sub">Sign in to your doctor account</p>

                    <div className="field-group">
                      <label className="field-label" htmlFor="login-email">Email</label>
                      <input
                        id="login-email"
                        className="auth-input"
                        type="email"
                        placeholder="doctor@hospital.com"
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="login-password">Password</label>
                      <input
                        id="login-password"
                        className="auth-input"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                      />
                    </div>

                    {loginError && <div className="auth-error">{loginError}</div>}

                    <button
                      id="btn-login"
                      className="auth-btn"
                      onClick={handleLogin}
                      disabled={loginLoading}
                    >
                      {loginLoading ? "Signing in…" : "Sign In"}
                    </button>

                    <p className="auth-switch-hint">
                      New here?{" "}
                      <span onClick={() => setActiveTab("register")}>Create an account</span>
                    </p>
                  </div>

                  {/* ── REGISTER PANEL ── */}
                  <div className="form-slide" id="panel-register">
                    <p className="form-title">Create account</p>
                    <p className="form-sub">Register as a doctor in seconds</p>

                    <div className="field-row">
                      <div className="field-group" style={{ flex: 1 }}>
                        <label className="field-label" htmlFor="reg-name">Full Name</label>
                        <input
                          id="reg-name"
                          className="auth-input"
                          placeholder="Dr. Jane Smith"
                          onChange={e => setField("name", e.target.value)}
                        />
                      </div>
                      <div className="field-group" style={{ flex: 1 }}>
                        <label className="field-label" htmlFor="reg-spec">Specialization</label>
                        <input
                          id="reg-spec"
                          className="auth-input"
                          placeholder="Cardiology"
                          onChange={e => setField("specialization", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="reg-email">Email</label>
                      <input
                        id="reg-email"
                        className="auth-input"
                        type="email"
                        placeholder="doctor@hospital.com"
                        onChange={e => setField("email", e.target.value)}
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="reg-password">Password</label>
                      <input
                        id="reg-password"
                        className="auth-input"
                        type="password"
                        placeholder="Create a strong password"
                        onChange={e => setField("password", e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleRegister()}
                      />
                    </div>

                    {regErr && <div className="auth-error">{regErr}</div>}
                    {regMsg && <div className="auth-success">{regMsg}</div>}

                    <button
                      id="btn-register"
                      className="auth-btn"
                      onClick={handleRegister}
                      disabled={regLoading}
                    >
                      {regLoading ? "Creating account…" : "Create Account"}
                    </button>

                    <p className="auth-switch-hint">
                      Already have an account?{" "}
                      <span onClick={() => setActiveTab("login")}>Sign in</span>
                    </p>
                  </div>

                </div>
              </div>
              {/* end forms-slider */}

            </div>
            {/* end auth-form-wrapper */}

          </div>
        </div>
        {/* end auth-hero-container */}

      </div>

      {/* ── Seamless scroller (same as Home) ── */}
      <div className="auth-scroller-wrapper">
        <div className="auth-scroller-track">
          {[
            "Discharge Summaries", "Lab Reports", "Clinical Notes",
            "Treatment Protocols", "ICU Notes", "Radiology Reports",
            "Discharge Summaries", "Lab Reports", "Clinical Notes",
            "Treatment Protocols", "ICU Notes", "Radiology Reports",
          ].map((item, i) => (
            <div key={i} className="auth-scroller-item">
              {item}<span className="auth-star-sep">★</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
