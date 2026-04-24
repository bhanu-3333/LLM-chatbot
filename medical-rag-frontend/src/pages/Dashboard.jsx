import { useNavigate } from "react-router-dom";
import "../styles/Home.css";
import img1 from '../assets/img1.jpg';
import img2 from '../assets/img2.jpeg';
import img3 from '../assets/img3.jpeg';
import img4 from '../assets/img4.jpeg';

export default function Dashboard() {
  const nav = useNavigate();
  const name = localStorage.getItem("doctor_name") || "Doctor";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("doctor_name");
    nav("/");
  };

  const scrollItems = [
    "Discharge Summaries",
    "Lab Reports",
    "Clinical Notes",
    "Treatment Protocols",
    "ICU Notes",
    "Radiology Reports"
  ];

  const loopItems = [...scrollItems, ...scrollItems];

  return (
    <div className="home-root">
      <div className="page-wrapper">
        
        {/* Navbar — same as Home but with Logout */}
        <nav className="navbar">
          <div className="logo">LLM Chatbot</div>
          <div className="nav-links">
            <a href="#" className="nav-item">Product</a>
            <a href="#" className="nav-item">Service</a>
            <a href="#" className="nav-item">Features</a>
            <a href="#" className="nav-item">Contact</a>
          </div>
          <button className="login-btn-nav" onClick={logout}>
            Logout
          </button>
        </nav>

        {/* Hero Container */}
        <div className="hero-container">
          <div className="hero-layout">
            
            {/* Left: Text content */}
            <div className="hero-content">
              <h1>Welcome,<br/><em>Dr. {name}</em></h1>
              <p>
                Query patient reports using natural language. Fully offline, 
                privacy-preserving AI for clinical decision support — built on patient goals, 
                lifestyle, and comfort.
              </p>
              
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button 
                  className="cta-button" 
                  onClick={() => nav('/upload')}
                  style={{ flex: 1 }}
                >
                  📤 Upload Report
                </button>
                <button 
                  className="cta-button" 
                  onClick={() => nav('/library')}
                  style={{ flex: 1 }}
                >
                  📚 Library
                </button>
              </div>
            </div>

            {/* Right: Hero visuals (same as Home) */}
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
