import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

// Importing custom images for the hero section
import img1 from '../assets/img1.jpg';
import img2 from '../assets/img2.jpeg';
import img3 from '../assets/img3.jpeg';
import img4 from '../assets/img4.jpeg';
import enterIcon from '../assets/enter.png';

export default function Home() {
  const navigate = useNavigate();

  const scrollItems = [
    "Discharge Summaries",
    "Lab Reports",
    "Clinical Notes",
    "Treatment Protocols",
    "ICU Notes",
    "Radiology Reports"
  ];

  // Two copies are sufficient for a seamless loop with -50% animation
  const loopItems = [...scrollItems, ...scrollItems];

  return (
    <div className="home-root">
      <div className="page-wrapper">
        <nav className="navbar">
          <div className="logo">LLM Chatbot</div>
          <div className="nav-links">
            <a href="#" className="nav-item">Product</a>
            <a href="#" className="nav-item">Service</a>
            <a href="#" className="nav-item">Features</a>
            <a href="#" className="nav-item">Contact</a>
          </div>
          <button className="login-btn-nav" onClick={() => navigate('/login')}>
            Login
            <img src={enterIcon} alt="Enter" className="btn-enter-icon" />
          </button>
        </nav>

        <div className="hero-container">
          <div className="hero-layout">
            <div className="hero-content">
              <h1>Smarter Medical<br/>Insights, Instantly.</h1>
              <p>
                Query patient reports using natural language. Fully offline, 
                privacy-preserving AI for clinical decision support — built on patient goals, 
                lifestyle, and comfort.
              </p>
              <button className="cta-button" onClick={() => navigate('/login')}>
                Login to Continue
                <img src={enterIcon} alt="Enter" className="btn-enter-icon" />
              </button>
            </div>

            <div className="hero-visuals">
              <div 
                className="v-img v-img-bg" 
                style={{ backgroundImage: `url(${img4})` }}
              ></div>
              <div 
                className="v-img v-img-right" 
                style={{ backgroundImage: `url(${img3})` }}
              ></div>
              <div 
                className="v-img v-img-center" 
                style={{ backgroundImage: `url(${img2})` }}
              ></div>
              <div 
                className="v-img v-img-top" 
                style={{ backgroundImage: `url(${img1})` }}
              ></div>
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
