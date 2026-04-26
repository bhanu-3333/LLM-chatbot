import { useParams, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import API from "../api/api";
import "../styles/Home.css";
import logoutIcon from "../assets/logout.png";
import mikeIcon from "../assets/mike.png";
import uploadIcon from "../assets/upload.png";
import chatIcon from "../assets/chat.png";
import imageIcon from "../assets/image.png";
import fileIcon from "../assets/open-folder.png";
import docIcon from "../assets/file.png";
import sendIcon from "../assets/send.png";

export default function Chat() {
  const { patient_id } = useParams();
  const nav = useNavigate();
  const name = localStorage.getItem("doctor_name") || "Doctor";
  const [patient, setPatient] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("doctor_name");
    nav("/");
  };

  useEffect(() => {
    fetchPatientData();
    fetchFiles();
    fetchHistory();
  }, [patient_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchPatientData = async () => {
    try {
      const res = await API.get(`/patients/${patient_id}`);
      setPatient(res.data);
    } catch (e) {
      console.error("Failed to fetch patient", e);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await API.get(`/patients/${patient_id}/files`);
      setFiles(res.data.files);
    } catch (e) {
      console.error("Failed to fetch files", e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await API.get(`/chat/history/${patient_id}`);
      if (res.data.status === "success") {
        setMessages(res.data.messages);
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  const getFileUrl = (filename) => {
    const token = localStorage.getItem("token");
    return `http://127.0.0.1:8000/patients/${patient_id}/files/${filename}?token=${token}`;
  };

  const handleFileUpload = async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("files", selectedFiles[i]);
    }

    try {
      await API.post(`/patients/${patient_id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      await fetchFiles();
    } catch (e) {
      console.error("Upload failed", e);
      alert("Failed to upload reports. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e) => {
    handleFileUpload(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const send = async () => {
    if (!query.trim()) return;
    const q = query.trim();
    setQuery("");
    setLoading(true);

    setMessages(prev => [...prev, { role: "user", text: q }]);
    setMessages(prev => [...prev, { role: "assistant", text: "", citations: [] }]);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://127.0.0.1:8000/chat/stream?patient_id=${patient_id}&query=${encodeURIComponent(q)}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error("Failed to connect to server");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.citations) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, citations: data.citations };
                }
                return updated;
              });
            }
            if (data.chunk) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, text: (last.text || "") + data.chunk };
                }
                return updated;
              });
            }
            if (data.answer) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, text: data.answer };
                }
                return updated;
              });
            }
          } catch (err) {
            console.warn("Stream parse error:", err);
          }
        }
      }
    } catch (e) {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          updated[updated.length - 1] = { ...last, text: "Error: " + (e.message || "Request failed") };
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const toggleListening = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          setQuery(event.results[i][0].transcript);
        }
      }
      if (finalTranscript) setQuery(finalTranscript);
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        console.error("Speech recognition error:", event.error);
      }
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

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

        {/* Hero Container - Single screen with scroll */}
        <div className="hero-container" style={{ padding: '40px', overflow: 'hidden', display: 'flex', flexDirection: 'column', marginBottom: '40px' }}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h1 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 'clamp(2rem, 3.5vw, 2.5rem)',
              lineHeight: 1.1,
              color: '#000',
              marginBottom: '24px',
              fontWeight: 900
            }}>
              {patient ? patient.name : `Patient ${patient_id}`}
            </h1>

            {/* Split layout with scroll */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', flex: 1, minHeight: 0 }}>

              {/* Left: Chat - scrollable */}
              <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '20px', padding: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', minHeight: 0 }}>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', paddingRight: '8px' }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: '100px', color: '#888' }}>
                      <img 
                        src={chatIcon} 
                        alt="Chat" 
                        style={{ 
                          width: '48px', 
                          height: '48px', 
                          marginBottom: '12px',
                          opacity: 0.5
                        }} 
                      />
                      <p>Ask a question about this patient's medical history.</p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} style={{
                      marginBottom: '12px',
                      textAlign: m.role === "user" ? 'right' : 'left'
                    }}>
                      <span style={{
                        display: 'inline-block',
                        maxWidth: '75%',
                        padding: '10px 14px',
                        borderRadius: m.role === "user" ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: m.role === "user" ? '#000' : '#f4f4f0',
                        color: m.role === "user" ? '#fff' : '#1a1a1a',
                        fontSize: '14px',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {(m.text === "" && loading && i === messages.length - 1) ? "..." : (m.text || "...")}
                      </span>
                      {m.citations?.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', paddingLeft: '4px' }}>
                          {m.citations.map((c, idx) => (
                            <span
                              key={idx}
                              onClick={() => setSelectedFile(c)}
                              style={{
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                marginRight: '10px'
                              }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Input row */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={toggleListening}
                    style={{
                      background: isListening ? '#dc2626' : '#f4f4f0',
                      color: isListening ? '#fff' : '#000',
                      border: 'none',
                      padding: '0 16px',
                      borderRadius: '50px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Voice Assistant"
                  >
                    <img 
                      src={mikeIcon} 
                      alt="Voice" 
                      style={{ 
                        width: '20px', 
                        height: '20px',
                        filter: isListening ? 'brightness(0) invert(1)' : 'none'
                      }} 
                    />
                  </button>
                  <input
                    value={query}
                    placeholder={isListening ? "Listening..." : "Ask about this patient..."}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !loading && send()}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: '1.5px solid #e0e0d8',
                      borderRadius: '50px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '14px',
                      color: '#1a1a1a',
                      background: '#fafaf8',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={send}
                    disabled={loading}
                    style={{
                      background: '#000',
                      color: '#fff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '50px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {loading ? "..." : (
                      <>
                        <img src={sendIcon} alt="Send" style={{ width: '18px', height: '18px', filter: 'brightness(0) invert(1)' }} />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right: Files - scrollable */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                style={{
                  background: '#fff',
                  borderRadius: '20px',
                  padding: '20px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  border: dragOver ? '2px dashed #000' : '2px dashed transparent',
                  minHeight: 0
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={fileIcon} alt="Folder" style={{ width: '20px', height: '20px' }} />
                    Patient Records
                  </h3>
                  <button
                    onClick={() => fileInputRef.current.click()}
                    disabled={uploading}
                    style={{
                      background: '#000',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '50px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      opacity: uploading ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <img 
                      src={uploadIcon} 
                      alt="Upload" 
                      style={{ 
                        width: '12px', 
                        height: '12px',
                        filter: 'brightness(0) invert(1)'
                      }} 
                    />
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    multiple
                    accept=".pdf"
                    onChange={onFileChange}
                  />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                  {files.length === 0 && !uploading && (
                    <div style={{ textAlign: 'center', marginTop: '60px', color: '#888' }}>
                      <img src={fileIcon} alt="No files" style={{ width: '48px', height: '48px', marginBottom: '8px', opacity: 0.4 }} />
                      <p style={{ fontSize: '12px' }}>No reports yet.</p>
                      <p style={{ fontSize: '11px', marginTop: '4px' }}>Drag & drop files here</p>
                    </div>
                  )}
                  {files.map(f => (
                    <div
                      key={f}
                      onClick={() => setSelectedFile(f)}
                      style={{
                        padding: '10px 12px',
                        background: '#f4f4f0',
                        border: '1px solid #e0e0d8',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: '#1a1a1a',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#000';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#f4f4f0';
                        e.currentTarget.style.color = '#1a1a1a';
                      }}
                      title={f}
                    >
                      <img
                        src={f.toLowerCase().match(/\.(jpg|jpeg|png)$/) ? imageIcon : docIcon}
                        alt="file"
                        style={{ width: '14px', height: '14px', marginRight: '6px', verticalAlign: 'middle', flexShrink: 0 }}
                      />{f}
                    </div>
                  ))}
                  {uploading && (
                    <div style={{ padding: '10px 12px', opacity: 0.6, fontStyle: 'italic', fontSize: '12px' }}>
                      Uploading...
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* File Viewer Modal */}
      {selectedFile && (
        <div
          onClick={() => setSelectedFile(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '40px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              width: '100%',
              height: '100%',
              maxWidth: '1100px',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              padding: '12px 20px',
              background: '#f4f4f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontWeight: 600 }}>{selectedFile}</span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <a
                  href={getFileUrl(selectedFile)}
                  download
                  style={{ color: '#000', fontSize: '14px', textDecoration: 'none' }}
                >
                  📥 Download
                </a>
                <button
                  onClick={() => setSelectedFile(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#000',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  &times;
                </button>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', background: '#f8fafc', overflow: 'auto' }}>
              {selectedFile.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? (
                <img
                  src={getFileUrl(selectedFile)}
                  alt="Report Preview"
                  style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                />
              ) : selectedFile.toLowerCase().endsWith(".pdf") || selectedFile.toLowerCase().endsWith(".txt") ? (
                <iframe
                  src={getFileUrl(selectedFile)}
                  title="File Viewer"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#1e293b' }}>
                  <h3>Excel / Data File</h3>
                  <p>This file type cannot be previewed directly in the browser.</p>
                  <a
                    href={getFileUrl(selectedFile)}
                    download
                    style={{
                      display: 'inline-block',
                      marginTop: '12px',
                      padding: '12px 24px',
                      background: '#000',
                      color: '#fff',
                      borderRadius: '50px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    Download to View
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
