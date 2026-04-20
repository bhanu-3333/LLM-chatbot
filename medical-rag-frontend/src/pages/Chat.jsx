import { useParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/global.css";

export default function Chat() {
  const { patient_id }          = useParams();
  const [query, setQuery]       = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!query.trim()) return;
    const q = query.trim();
    setQuery("");
    setLoading(true);

    setMessages(prev => [...prev, { q, a: "", citations: [] }]);

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
                updated[updated.length - 1] = { ...updated[updated.length - 1], citations: data.citations };
                return updated;
              });
            }
            if (data.chunk) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, a: (last.a || "") + data.chunk };
                return updated;
              });
            }
            if (data.answer) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], a: data.answer };
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
        updated[updated.length - 1] = { q, a: "Error: " + (e.message || "Request failed"), citations: [] };
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
    recognition.continuous = true; // Listen for a long time
    recognition.interimResults = true; // Show text as you speak

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          // You can handle interim results here if you want to show ghost text
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
    <div>
      <Navbar />
      <div className="page">
        <h1>Patient {patient_id}</h1>

        <div className="chat-window">
          {messages.length === 0 && (
            <p style={{ color: "#64748b", textAlign: "center", marginTop: 80 }}>
              Ask a question about this patient's records
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i}>
              <div className="chat-bubble-q"><span>{m.q}</span></div>
              <div className="chat-bubble-a">
                <span>{(m.a === "" && loading && i === messages.length - 1) ? "..." : (m.a || "...")}</span>
              </div>
              {m.citations?.length > 0 && (
                <div className="chat-citations">{m.citations.join("  ·  ")}</div>
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
  );
}
