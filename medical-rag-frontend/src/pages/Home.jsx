import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

import img1 from '../assets/img1.jpg';
import img2 from '../assets/img2.jpeg';
import img3 from '../assets/img3.jpeg';
import img4 from '../assets/img4.jpeg';
import enterIcon from '../assets/enter.png';
import logoutIcon from '../assets/logout.png';

const isLoggedIn = () => !!localStorage.getItem('token');

export default function Home() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(false);

  const scrollItems = [
    "Discharge Summaries",
    "Lab Reports",
    "Clinical Notes",
    "Treatment Protocols",
    "ICU Notes",
    "Radiology Reports"
  ];

  const loopItems = [...scrollItems, ...scrollItems];

  /* Guard: show toast if not logged in, else navigate */
  const guarded = (path) => {
    if (isLoggedIn()) {
      navigate(path);
    } else {
      setToast(true);
      setTimeout(() => setToast(false), 3000);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('doctor_name');
    navigate('/');
  };

  return (
    <div className="home-root">

      {/* ── Login toast ── */}
      {toast && (
        <div className="home-toast">
          🔒 Please <span onClick={() => navigate('/login')}>log in</span> to access this feature.
        </div>
      )}

      <div className="page-wrapper">
        <nav className="navbar">
          <div className="logo">LLM Chatbot</div>

          <div className="nav-links">
            <a onClick={() => guarded('/dashboard')} className="nav-item" style={{ cursor: 'pointer' }}>Home</a>
            <a onClick={() => guarded('/upload')}    className="nav-item" style={{ cursor: 'pointer' }}>Upload Reports</a>
            <a onClick={() => guarded('/library')}   className="nav-item" style={{ cursor: 'pointer' }}>Library</a>
            <a onClick={() => navigate('/about')}    className="nav-item" style={{ cursor: 'pointer' }}>About</a>
          </div>

          {isLoggedIn() ? (
            <button className="login-btn-nav logout-btn" onClick={logout}>
              Logout
              <img src={logoutIcon} alt="Logout" className="btn-enter-icon" style={{ width: '18px', height: '18px', marginLeft: '8px' }} />
            </button>
          ) : (
            <button className="login-btn-nav" onClick={() => navigate('/login')}>
              Login
            </button>
          )}
        </nav>

        <div className="hero-container">
          <div className="hero-layout">
            <div className="hero-content">
              <h1>From Reports to Answers, Instantly.</h1>
              <p>
               Understand patient data in seconds, not minutes.
Offline AI built for safe and smarter decisions.
              </p>
              <button className="cta-button" onClick={() => navigate('/login')}>
                Login to Continue
              </button>
            </div>

            <div className="hero-visuals">
              <div className="v-img v-img-bg"     style={{ backgroundImage: `url(${img4})` }}></div>
              <div className="v-img v-img-right"  style={{ backgroundImage: `url(${img3})` }}></div>
              <div className="v-img v-img-center" style={{ backgroundImage: `url(${img2})` }}></div>
              <div className="v-img v-img-top"    style={{ backgroundImage: `url(${img1})` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Seamless Infinite Scroller */}
      <div className="scroller-wrapper">
        <div className="scroller-track">
          {loopItems.map((item, index) => (
            <div key={index} className="scroller-item">
              {item}
              <span className="star-sep">★</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
