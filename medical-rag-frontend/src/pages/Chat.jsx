import { useParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/global.css";

export default function Chat() {
  const { patient_id }          = useParams();
  const [patient, setPatient]   = useState(null);
  const [files, setFiles]       = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [query, setQuery]       = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef(null);

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
    return `http://127.0.0.1:8080/patients/${patient_id}/files/${filename}?token=${token}`;
  };

  const send = async () => {
    if (!query.trim()) return;
    const q = query.trim();
    setQuery("");
    setLoading(true);

    // Add user message to state
    setMessages(prev => [...prev, { role: "user", text: q }]);
    // Add empty assistant message to state (for streaming)
    setMessages(prev => [...prev, { role: "assistant", text: "", citations: [] }]);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://127.0.0.1:8080/chat/stream?patient_id=${patient_id}&query=${encodeURIComponent(q)}`,
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
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      
      <div className="page" style={{ flex: 1, maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        <h1 style={{ marginBottom: 20 }}>
          {patient ? `${patient.name} (${patient.patient_id})` : `Patient ${patient_id}`}
        </h1>

        <div className="split-layout">
          {/* Left Side: Reports Panel */}
          <div className="left-panel">
            <h2 style={{ fontSize: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, color: "#a78bfa" }}>
              📂 Patient Reports
            </h2>
            <div className="file-list">
              {files.length === 0 && <p style={{ fontSize: 13, color: "#64748b" }}>No reports uploaded yet.</p>}
              {files.map(f => (
                <div key={f} className="file-item" onClick={() => setSelectedFile(f)} title={f}>
                  {f.toLowerCase().match(/\.(jpg|jpeg|png)$/) ? "🖼️" : "📄"} {f}
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Chat Interface */}
          <div className="right-panel">
            <div className="chat-window" style={{ flex: 1, maxHeight: "none" }}>
              {messages.length === 0 && (
                <div style={{ color: "#64748b", textAlign: "center", marginTop: 120 }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
                  <p>Ask a question about this patient's medical history or uploaded reports.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "chat-bubble-q" : "chat-bubble-a"}>
                  <span>
                    {(m.text === "" && loading && i === messages.length - 1) ? "..." : (m.text || "...")}
                  </span>
                  {m.citations?.length > 0 && (
                    <div className="chat-citations">
                      {m.citations.map((c, idx) => (
                        <span 
                          key={idx} 
                          onClick={() => setSelectedFile(c)} 
                          style={{ cursor: "pointer", color: "#a78bfa", textDecoration: "underline", marginRight: 10 }}
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

            <div className="chat-input-row">
              <button 
                className={`btn-voice ${isListening ? "active" : ""}`} 
                onClick={toggleListening}
                title="Use Voice Assistant"
              >
                {isListening ? "🛑" : "🎤"}
              </button>
              <input
                value={query}
                placeholder={isListening ? "Listening..." : "Ask about this patient..."}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !loading && send()}
              />
              <button className="btn-primary" onClick={send} disabled={loading}>
                {loading ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* File Viewer Modal */}
      {selectedFile && (
        <div className="modal-overlay" onClick={() => setSelectedFile(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontWeight: 600 }}>{selectedFile}</span>
              <div style={{ display: "flex", gap: 12 }}>
                <a 
                  href={getFileUrl(selectedFile)} 
                  download 
                  style={{ color: "#a78bfa", fontSize: 14, textDecoration: "none" }}
                >
                  📥 Download
                </a>
                <button className="modal-close" onClick={() => setSelectedFile(null)}>&times;</button>
              </div>
            </div>
            
            <div style={{ flex: 1, display: "flex", justifyContent: "center", background: "#f8fafc", overflow: "auto" }}>
              {selectedFile.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? (
                <img 
                  src={getFileUrl(selectedFile)} 
                  alt="Report Preview" 
                  style={{ maxWidth: "100%", height: "auto", objectFit: "contain" }} 
                />
              ) : selectedFile.toLowerCase().endsWith(".pdf") || selectedFile.toLowerCase().endsWith(".txt") ? (
                <iframe 
                  src={getFileUrl(selectedFile)} 
                  className="viewer-iframe"
                  title="File Viewer"
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              ) : (
                <div style={{ padding: 40, textAlign: "center", color: "#1e293b" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                  <h3>Excel / Data File</h3>
                  <p>This file type cannot be previewed directly in the browser.</p>
                  <a 
                    href={getFileUrl(selectedFile)} 
                    download 
                    className="btn-primary" 
                    style={{ display: "inline-block", marginTop: 12, textDecoration: "none" }}
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
