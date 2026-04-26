import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';
import '../styles/About.css';
import enterIcon from '../assets/enter.png';
import logoutIcon from '../assets/logout.png';

const isLoggedIn = () => !!localStorage.getItem('token');

export default function About() {
  const nav = useNavigate();
  const [toast, setToast] = useState(false);

  const guarded = (path) => {
    if (isLoggedIn()) {
      nav(path);
    } else {
      setToast(true);
      setTimeout(() => setToast(false), 3000);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('doctor_name');
    nav('/');
  };

  return (
    <div className="home-root">
      {/* ── Login toast ── */}
      {toast && (
        <div className="home-toast">
          🔒 Please <span onClick={() => nav('/login')}>log in</span> to access this feature.
        </div>
      )}

      <div className="page-wrapper">

        {/* ── Navbar ── */}
        <nav className="navbar">
          <div className="logo" onClick={() => nav('/')} style={{ cursor: 'pointer' }}>
            MedIntel AI
          </div>
          <div className="nav-links">
            <a onClick={() => guarded('/dashboard')} className="nav-item" style={{ cursor: 'pointer' }}>Home</a>
            <a onClick={() => guarded('/upload')}    className="nav-item" style={{ cursor: 'pointer' }}>Upload Reports</a>
            <a onClick={() => guarded('/library')}   className="nav-item" style={{ cursor: 'pointer' }}>Library</a>
            <a onClick={() => nav('/about')}         className="nav-item" style={{ cursor: 'pointer' }}>About</a>
          </div>
          {isLoggedIn() ? (
            <button className="login-btn-nav logout-btn" onClick={logout}>
              Logout
              <img src={logoutIcon} alt="Logout" className="btn-enter-icon" style={{ width: '18px', height: '18px', marginLeft: '8px' }} />
            </button>
          ) : (
            <button className="login-btn-nav" onClick={() => nav('/login')}>
              Login
              <img src={enterIcon} alt="Enter" className="btn-enter-icon" />
            </button>
          )}
        </nav>

        {/* ── Hero / About Content ── */}
        <div className="hero-container about-hero">
          <div className="about-hero-inner">

            <div className="about-badge">About the Project</div>

            <h1 className="about-h1">
              Smarter Access to<br /><em>Medical Records,</em><br />Instantly.
            </h1>

            <p className="about-lead">
              In today's busy hospital environment, doctors often have to go through multiple patient
              reports, lab results, and clinical notes to find important information. This process takes
              time and can delay quick decision making, especially in critical situations.
            </p>

            <p className="about-body" style={{ marginTop: '44px' }}>
              Our system is designed to simplify this. A doctor can upload a patient's report whether
              it's a lab report, discharge summary, or clinical document and interact with it through a
              simple chat interface. Instead of reading the entire document, the doctor can ask questions
              like <em>"What is the CRP level?"</em>, <em>"Does the patient have any previous conditions?"</em>,
              or <em>"What treatment was given?"</em> and instantly receive clear, accurate answers.
            </p>

            <p className="about-body">
              The system intelligently reads and understands the uploaded documents, retrieves the most
              relevant information, and provides responses along with the exact source from the report.
              This helps doctors trust the answers and verify them quickly.
            </p>

            <p className="about-body">
              Most importantly, the entire system works <strong>completely offline</strong> within the
              hospital network. No patient data is sent to external servers, ensuring full privacy and
              compliance with data protection requirements.
            </p>



            <p className="about-goal">
              Our goal is to reduce the time doctors spend searching for information, support faster
              clinical decisions, and ultimately improve patient care by making medical data easier to
              access and understand.
            </p>

          </div>
        </div>

      </div>

      {/* ── Scroller ── */}
      <div className="scroller-wrapper">
        <div className="scroller-track">
          {[
            'Discharge Summaries', 'Lab Reports', 'Clinical Notes',
            'Treatment Protocols', 'ICU Notes', 'Radiology Reports',
            'Discharge Summaries', 'Lab Reports', 'Clinical Notes',
            'Treatment Protocols', 'ICU Notes', 'Radiology Reports',
          ].map((item, i) => (
            <div key={i} className="scroller-item">
              {item}<span className="star-sep">★</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
