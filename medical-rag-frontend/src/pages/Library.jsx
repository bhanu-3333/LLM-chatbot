import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "../styles/Home.css";
import "../styles/About.css";
import searchIcon from "../assets/search.png";
import logoutIcon from "../assets/logout.png";
import chatIcon from "../assets/chat.png";

export default function Library() {
  const nav = useNavigate();
  const name = localStorage.getItem("doctor_name") || "Doctor";
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("doctor_name");
    nav("/");
  };

  const load = async () => {
    setErr("");
    try {
      const res = await API.get(`/patients/?search=${search}`);
      setPatients(res.data.patients || []);
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to load patients");
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  return (
    <div className="home-root">
      <div className="page-wrapper">

        {/* Navbar */}
        <nav className="navbar">
          <div className="logo">MedIntel AI</div>
          <div className="nav-links">
            <a onClick={() => nav('/dashboard')} className="nav-item" style={{ cursor: 'pointer' }}>Home</a>
            <a onClick={() => nav('/upload')}    className="nav-item" style={{ cursor: 'pointer' }}>Upload Reports</a>
            <a onClick={() => nav('/library')}   className="nav-item" style={{ cursor: 'pointer' }}>Library</a>
            <a onClick={() => nav('/about')}     className="nav-item" style={{ cursor: 'pointer' }}>About</a>
          </div>
          <button className="login-btn-nav logout-btn" onClick={logout}>
            Logout
            <img src={logoutIcon} alt="Logout" className="btn-enter-icon" style={{ width: '18px', height: '18px', marginLeft: '8px' }} />
          </button>
        </nav>

        {/* Hero Container with scrollable content */}
        <div className="hero-container" style={{ padding: '40px', overflow: 'hidden', display: 'flex', flexDirection: 'column', marginBottom: '40px' }}>
          <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h1 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 'clamp(2.5rem, 4vw, 3rem)',
              lineHeight: 1.1,
              color: '#000',
              marginBottom: '8px',
              fontWeight: 900
            }}>
              Patient Library
            </h1>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              color: '#666',
              marginBottom: '24px'
            }}>
              Access and manage all active patient profiles and historical records.
            </p>

            {/* Search bar with icon */}
            <div style={{ marginBottom: '24px', position: 'relative', maxWidth: '700px' }}>
              <img
                src={searchIcon}
                alt="Search"
                style={{
                  position: 'absolute',
                  left: '20px',
                  top: '16px',
                  width: '20px',
                  height: '20px',
                  pointerEvents: 'none',
                  opacity: 0.5
                }}
              />
              <input
                type="text"
                placeholder="Search patients by name or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 20px 14px 52px',
                  border: '1.5px solid #e0e0d8',
                  borderRadius: '50px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  color: '#1a1a1a',
                  background: '#fff',
                  outline: 'none',
                  boxSizing: 'border-box',
                  lineHeight: '1.5'
                }}
              />
            </div>

            {err && (
              <div style={{
                padding: '12px 16px',
                background: '#fef2f2',
                borderRadius: '10px',
                border: '1px solid #dc2626',
                color: '#dc2626',
                fontSize: '13px',
                marginBottom: '20px'
              }}>
                {err}
              </div>
            )}

            {/* Scrollable patient grid */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
              {patients.length === 0 && !err && (
                <div style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  color: '#888'
                }}>
                  <p style={{ fontSize: '15px' }}>No patients found. Upload a record to get started.</p>
                </div>
              )}

              {/* Patient cards grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
                paddingBottom: '20px'
              }}>
                {patients.map(p => (
                  <div
                    key={p.patient_id}
                    style={{
                      background: '#fff',
                      border: '1px solid #e0e0d8',
                      borderRadius: '16px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#000';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#e0e0d8';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Header with name and ID */}
                    <div>
                      <h3 style={{
                        fontFamily: 'Playfair Display, serif',
                        fontSize: '18px',
                        fontWeight: 700,
                        color: '#1a1a1a',
                        marginBottom: '4px'
                      }}>
                        {p.name}
                      </h3>
                      <p style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
                        ID: {p.patient_id}
                      </p>
                    </div>

                    {/* Info grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{
                        background: '#fafaf8',
                        padding: '10px 12px',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Age
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>
                          {p.age} Years
                        </div>
                      </div>
                      <div style={{
                        background: '#fafaf8',
                        padding: '10px 12px',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Gender
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>
                          {p.gender}
                        </div>
                      </div>
                    </div>

                    {/* Footer with file count and action */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '4px'
                    }}>
                      <button
                        onClick={() => nav(`/chat/${p.patient_id}`)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#b8a820',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <img src={chatIcon} alt="Chat" style={{ width: '14px', height: '14px' }} />
                        View Records →
                      </button>
                      <span style={{ fontSize: '12px', color: '#888' }}>
                        {p.file_count} file{p.file_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
