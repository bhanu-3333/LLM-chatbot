import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "../styles/Home.css";
import logoutIcon from "../assets/logout.png";

const ACCEPTED_TYPES = {
  "application/pdf": { label: "PDF", icon: "📄", color: "#e74c3c" },
  "image/jpeg": { label: "JPEG", icon: "🖼️", color: "#9b59b6" },
  "image/png": { label: "PNG", icon: "🖼️", color: "#9b59b6" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { label: "Excel", icon: "📊", color: "#27ae60" },
  "application/vnd.ms-excel": { label: "Excel", icon: "📊", color: "#27ae60" },
  "text/plain": { label: "TXT", icon: "📝", color: "#2980b9" },
  "text/csv": { label: "CSV", icon: "📝", color: "#2980b9" },
};

const ACCEPT_STRING = ".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.txt,.csv";

function getFileInfo(file) {
  if (!file) return null;
  const mime = file.type;
  return ACCEPTED_TYPES[mime] || { label: file.name.split(".").pop().toUpperCase(), icon: "📁", color: "#7f8c8d" };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Upload() {
  const nav = useNavigate();
  const name = localStorage.getItem("doctor_name") || "Doctor";
  const [files, setFiles] = useState([]);
  const [patientName, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("doctor_name");
    nav("/");
  };

  const handleFiles = (newFiles) => {
    const allowed = ["pdf", "jpg", "jpeg", "png", "xlsx", "xls", "txt", "csv"];
    const valid = [];
    let errorMsg = "";

    Array.from(newFiles).forEach(f => {
      const ext = f.name.split(".").pop().toLowerCase();
      if (allowed.includes(ext)) {
        valid.push(f);
      } else {
        errorMsg = `❌ Unsupported file type ".${ext}" ignored.`;
      }
    });

    if (errorMsg) setErr(errorMsg);
    else setErr("");

    setFiles(prev => [...prev, ...valid]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const upload = async () => {
    if (files.length === 0 || !patientName || !age || !gender) {
      setErr("Please fill all fields and select at least one file");
      return;
    }
    setMsg("");
    setErr("");
    setLoading(true);
    try {
      const form = new FormData();
      form.append("patient_name", patientName);
      form.append("age", age);
      form.append("gender", gender);
      files.forEach(f => {
        form.append("files", f);
      });

      const res = await API.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const d = res.data;

      const successCount = d.results.filter(r => r.status === "success").length;
      setMsg(
        `✅ ${d.message} — Patient ID: ${d.patient_id} · ` +
        `${successCount} files indexed · ${d.total_chunks} chunks created`
      );
      setName("");
      setAge("");
      setGender("");
      setFiles([]);
    } catch (e) {
      setErr(e.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-root">
      <div className="page-wrapper">

        {/* Navbar */}
        <nav className="navbar">
          <div className="logo">LLM Chatbot</div>
          <div className="nav-links">
            <a onClick={() => nav('/dashboard')} className="nav-item" style={{ cursor: 'pointer' }}>Home</a>
            <a onClick={() => nav('/upload')} className="nav-item" style={{ cursor: 'pointer' }}>Upload Reports</a>
            <a onClick={() => nav('/library')} className="nav-item" style={{ cursor: 'pointer' }}>Library</a>
          </div>
          <button className="login-btn-nav" onClick={logout}>
            <img src={logoutIcon} alt="Logout" style={{ width: '16px', height: '16px', marginRight: '6px' }} />
            Logout
          </button>
        </nav>

        {/* Hero Container */}
        <div className="hero-container" style={{ marginBottom: '40px' }}>
          <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto' }}>
            <h1 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
              lineHeight: 1.1,
              color: '#000',
              marginBottom: '12px',
              fontWeight: 900,
              textAlign: 'center'
            }}>
              Upload Patient <em>Records</em>
            </h1>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '1rem',
              lineHeight: 1.6,
              color: '#333',
              marginBottom: '32px',
              textAlign: 'center'
            }}>
              Upload multiple reports for a patient (PDF, Images, Excel, Text)
            </p>

            {/* Patient fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px', gap: '12px', marginBottom: '16px' }}>
              <input
                placeholder="Patient Name"
                value={patientName}
                onChange={e => setName(e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: '1.5px solid #e0e0d8',
                  borderRadius: '12px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  color: '#1a1a1a',
                  background: '#fff',
                  outline: 'none'
                }}
              />
              <input
                placeholder="Age"
                type="number"
                min="0"
                max="150"
                value={age}
                onChange={e => setAge(e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: '1.5px solid #e0e0d8',
                  borderRadius: '12px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  color: '#1a1a1a',
                  background: '#fff',
                  outline: 'none'
                }}
              />
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: '1.5px solid #e0e0d8',
                  borderRadius: '12px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  color: '#1a1a1a',
                  background: '#fff',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Drag-and-drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? '#000' : '#ccc'}`,
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'rgba(0,0,0,0.05)' : '#fff',
                transition: 'all 0.25s ease',
                userSelect: 'none',
                marginBottom: '20px'
              }}
            >
              {/* Upload folder icon */}
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#b8a820"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ margin: '0 auto 16px' }}
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <path d="M12 11v6" />
                <path d="m9 14 3-3 3 3" />
              </svg>
              <div style={{ fontWeight: 600, fontSize: '16px', color: '#000', marginBottom: '6px' }}>
                Drag & drop or <span style={{ textDecoration: 'underline' }}>browse</span>
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                Select multiple PDF, Images, Excel, or Text files
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_STRING}
              style={{ display: 'none' }}
              onChange={e => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {/* Selected files list */}
            {files.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#666', fontWeight: 600 }}>
                  Selected Files ({files.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {files.map((f, i) => {
                    const info = getFileInfo(f);
                    return (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        background: '#fff',
                        borderRadius: '10px',
                        border: '1px solid #e0e0d8'
                      }}>
                        <span style={{ fontSize: '22px' }}>{info.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#1a1a1a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {f.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#888' }}>
                            {info.label} · {formatBytes(f.size)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            padding: '4px',
                            fontSize: '20px',
                            cursor: 'pointer'
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={upload}
              disabled={loading || files.length === 0}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '15px',
                fontWeight: 600,
                cursor: (loading || files.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (loading || files.length === 0) ? 0.5 : 1,
                transition: 'opacity 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                "⏳ Uploading & Indexing..."
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload {files.length} Report{files.length !== 1 ? 's' : ''}
                </>
              )}
            </button>

            {msg && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: '#f0fdf4',
                borderRadius: '10px',
                border: '1px solid #16a34a',
                color: '#16a34a',
                fontSize: '13px'
              }}>
                {msg}
              </div>
            )}
            {err && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: '#fef2f2',
                borderRadius: '10px',
                border: '1px solid #dc2626',
                color: '#dc2626',
                fontSize: '13px'
              }}>
                {err}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
