import { useNavigate } from "react-router-dom";
import "../styles/Home.css";
import "../styles/About.css";
import img1 from '../assets/img1.jpg';
import img2 from '../assets/img2.jpeg';
import img3 from '../assets/img3.jpeg';
import img4 from '../assets/img4.jpeg';
import logoutIcon from '../assets/logout.png';
import uploadIcon from '../assets/upload.png';
import recordsIcon from '../assets/records.png';


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
        
        {/* Navbar */}
        <nav className="navbar">
          <div className="logo">LLM Chatbot</div>
          <div className="nav-links">
            <a onClick={() => nav('/dashboard')} className="nav-item" style={{ cursor: 'pointer' }}>Home</a>
            <a onClick={() => nav('/upload')}    className="nav-item" style={{ cursor: 'pointer' }}>Upload Reports</a>
            <a onClick={() => nav('/library')}   className="nav-item" style={{ cursor: 'pointer' }}>Library</a>
            <a onClick={() => nav('/about')}     className="nav-item" style={{ cursor: 'pointer' }}>About</a>
          </div>
          <button className="login-btn-nav logout-btn" onClick={logout}>
            <img src={logoutIcon} alt="Logout" className="btn-enter-icon" />
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
                privacy-preserving AI for clinical decision support. built on patient goals, 
                lifestyle, and comfort.
              </p>
              
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button 
                  className="cta-button" 
                  onClick={() => nav('/upload')}
                  style={{ 
                    flex: 'none',
                    minWidth: '180px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img src={uploadIcon} alt="Upload" style={{ width: '18px', height: '18px', marginRight: '8px' }} />
                  Upload Report
                </button>
                <button 
                  className="cta-button" 
                  onClick={() => nav('/library')}
                  style={{ 
                    flex: 'none',
                    minWidth: '180px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img src={recordsIcon} alt="Library" style={{ width: '18px', height: '18px', marginRight: '8px' }} />
                  Library
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
