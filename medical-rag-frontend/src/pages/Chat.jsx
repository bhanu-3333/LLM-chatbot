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

    setMessages(prev => [...prev, { q, a: null, citations: [] }]);

    try {
      const res = await API.post(`/chat?patient_id=${patient_id}&query=${encodeURIComponent(q)}`);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { q, a: res.data.answer, citations: res.data.citations || [] };
        return updated;
      });
    } catch (e) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { q, a: "Error: " + (e.response?.data?.detail || "Request failed"), citations: [] };
        return updated;
      });
    } finally {
      setLoading(false);
    }
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
                <span>{m.a === null ? "..." : m.a}</span>
              </div>
              {m.citations?.length > 0 && (
                <div className="chat-citations">{m.citations.join("  ·  ")}</div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-row">
          <input
            value={query}
            placeholder="Ask about this patient..."
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
