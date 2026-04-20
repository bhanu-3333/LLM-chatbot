import { useState, useRef } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/global.css";

const ACCEPTED_TYPES = {
  "application/pdf":                  { label: "PDF",   icon: "📄", color: "#e74c3c" },
  "image/jpeg":                       { label: "JPEG",  icon: "🖼️", color: "#9b59b6" },
  "image/png":                        { label: "PNG",   icon: "🖼️", color: "#9b59b6" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                                      { label: "Excel", icon: "📊", color: "#27ae60" },
  "application/vnd.ms-excel":         { label: "Excel", icon: "📊", color: "#27ae60" },
  "text/plain":                       { label: "TXT",   icon: "📝", color: "#2980b9" },
  "text/csv":                         { label: "CSV",   icon: "📝", color: "#2980b9" },
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
  const [file, setFile]           = useState(null);
  const [patientName, setName]    = useState("");
  const [age, setAge]             = useState("");
  const [gender, setGender]       = useState("");
  const [msg, setMsg]             = useState("");
  const [err, setErr]             = useState("");
  const [loading, setLoading]     = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const fileInputRef              = useRef(null);

  const fileInfo = getFileInfo(file);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSet(dropped);
  };

  const validateAndSet = (f) => {
    const ext = f.name.split(".").pop().toLowerCase();
    const allowed = ["pdf", "jpg", "jpeg", "png", "xlsx", "xls", "txt", "csv"];
    if (!allowed.includes(ext)) {
      setErr(`❌ Unsupported file type ".${ext}". Allowed: ${allowed.join(", ")}`);
      return;
    }
    setErr("");
    setFile(f);
  };

  const upload = async () => {
    if (!file || !patientName || !age || !gender) {
      setErr("Please fill all fields and select a file"); return;
    }
    setMsg(""); setErr(""); setLoading(true);
    try {
      const form = new FormData();
      form.append("patient_name", patientName);
      form.append("age", age);
      form.append("gender", gender);
      form.append("file", file);

      const res = await API.post("/upload", form);
      const d = res.data;
      setMsg(
        `✅ ${d.message} — Patient ID: ${d.patient_id} · ` +
        `${d.sections_indexed} ${d.section_label} · ${d.chunks_created} chunks indexed`
      );
      setName(""); setAge(""); setGender(""); setFile(null);
    } catch (e) {
      setErr(e.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="page" style={{ maxWidth: 560 }}>
        <h1 style={{ marginBottom: 4 }}>Upload Patient Record</h1>
        <p style={{ color: "var(--text-secondary, #888)", marginBottom: 24, fontSize: 14 }}>
          Supported: PDF, JPEG, PNG, Excel (.xlsx/.xls), TXT, CSV
        </p>

        {/* Patient fields */}
        <input
          placeholder="Patient Name"
          value={patientName}
          onChange={e => setName(e.target.value)}
        />
        <input
          placeholder="Age"
          type="number"
          min="0"
          max="150"
          value={age}
          onChange={e => setAge(e.target.value)}
        />
        <select value={gender} onChange={e => setGender(e.target.value)}>
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>

        {/* Drag-and-drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            marginTop: 12,
            border: `2px dashed ${dragOver ? "#6c63ff" : file ? (fileInfo?.color || "#6c63ff") : "#444"}`,
            borderRadius: 12,
            padding: "28px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver
              ? "rgba(108,99,255,0.08)"
              : file
              ? `${fileInfo?.color}14`
              : "rgba(255,255,255,0.03)",
            transition: "all 0.25s ease",
            userSelect: "none",
          }}
        >
          {file ? (
            <div>
              <div style={{ fontSize: 40, marginBottom: 8 }}>{fileInfo?.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 15, color: fileInfo?.color }}>
                {fileInfo?.label} — {file.name}
              </div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                {formatBytes(file.size)} · Click to change file
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                Drag & drop or <span style={{ color: "#6c63ff" }}>browse</span>
              </div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
                PDF · JPEG · PNG · Excel · TXT · CSV
              </div>
            </div>
          )}
        </div>

        {/* Hidden native input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STRING}
          style={{ display: "none" }}
          onChange={e => {
            const f = e.target.files[0];
            if (f) validateAndSet(f);
            e.target.value = ""; // reset so same file can be re-selected
          }}
        />

        {/* File type chips */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {[
            { ext: "PDF",   icon: "📄", color: "#e74c3c" },
            { ext: "JPEG",  icon: "🖼️", color: "#9b59b6" },
            { ext: "PNG",   icon: "🖼️", color: "#9b59b6" },
            { ext: "Excel", icon: "📊", color: "#27ae60" },
            { ext: "TXT",   icon: "📝", color: "#2980b9" },
            { ext: "CSV",   icon: "📝", color: "#2980b9" },
          ].map(({ ext, icon, color }) => (
            <span
              key={ext}
              style={{
                background: `${color}22`,
                color,
                border: `1px solid ${color}44`,
                borderRadius: 20,
                padding: "3px 10px",
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {icon} {ext}
            </span>
          ))}
        </div>

        <button
          className="btn-primary"
          style={{ width: "100%", marginTop: 18 }}
          onClick={upload}
          disabled={loading}
        >
          {loading ? "⏳ Uploading & Indexing..." : "⬆️ Upload & Analyze"}
        </button>

        {msg && (
          <p className="msg-success" style={{ marginTop: 12 }}>{msg}</p>
        )}
        {err && (
          <p className="msg-error" style={{ marginTop: 12 }}>{err}</p>
        )}
      </div>
    </div>
  );
}
