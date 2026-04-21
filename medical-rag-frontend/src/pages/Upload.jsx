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
  const [files, setFiles]         = useState([]);
  const [patientName, setName]    = useState("");
  const [age, setAge]             = useState("");
  const [gender, setGender]       = useState("");
  const [msg, setMsg]             = useState("");
  const [err, setErr]             = useState("");
  const [loading, setLoading]     = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const fileInputRef              = useRef(null);

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
    setMsg(""); setErr(""); setLoading(true);
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
      setName(""); setAge(""); setGender(""); setFiles([]);
    } catch (e) {
      setErr(e.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="page" style={{ maxWidth: 600 }}>
        <h1 style={{ marginBottom: 4 }}>Upload Patient Records</h1>
        <p style={{ color: "var(--text-secondary, #888)", marginBottom: 24, fontSize: 14 }}>
          Upload multiple reports for a patient (PDF, Images, Excel, Text)
        </p>

        {/* Patient fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px", gap: 12, marginBottom: 12 }}>
          <input
            placeholder="Patient Name"
            value={patientName}
            onChange={e => setName(e.target.value)}
            style={{ marginBottom: 0 }}
          />
          <input
            placeholder="Age"
            type="number"
            min="0"
            max="150"
            value={age}
            onChange={e => setAge(e.target.value)}
            style={{ marginBottom: 0 }}
          />
          <select value={gender} onChange={e => setGender(e.target.value)} style={{ marginBottom: 0 }}>
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
            border: `2px dashed ${dragOver ? "#6c63ff" : "#444"}`,
            borderRadius: 12,
            padding: "32px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? "rgba(108,99,255,0.08)" : "rgba(255,255,255,0.03)",
            transition: "all 0.25s ease",
            userSelect: "none",
          }}
        >
          <div>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              Drag & drop or <span style={{ color: "#6c63ff" }}>browse</span>
            </div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
              Select multiple PDF, Images, Excel, or Text files
            </div>
          </div>
        </div>

        {/* Hidden native input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_STRING}
          style={{ display: "none" }}
          onChange={e => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Selected files list */}
        {files.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, marginBottom: 10, color: "#94a3b8" }}>Selected Files ({files.length})</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {files.map((f, i) => {
                const info = getFileInfo(f);
                return (
                  <div key={i} style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 12, 
                    padding: "8px 12px", 
                    background: "#1a1d27", 
                    borderRadius: 8,
                    border: "1px solid #2d3148"
                  }}>
                    <span style={{ fontSize: 20 }}>{info.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{info.label} · {formatBytes(f.size)}</div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      style={{ background: "none", color: "#ef4444", padding: 4, fontSize: 18 }}
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
          className="btn-primary"
          style={{ width: "100%", marginTop: 24, padding: 14 }}
          onClick={upload}
          disabled={loading || files.length === 0}
        >
          {loading ? "⏳ Uploading & Indexing..." : `⬆️ Upload ${files.length} Reports`}
        </button>

        {msg && (
          <div className="msg-success" style={{ marginTop: 16, padding: 12, background: "#065f4622", borderRadius: 8, border: "1px solid #065f46" }}>
            {msg}
          </div>
        )}
        {err && (
          <div className="msg-error" style={{ marginTop: 16, padding: 12, background: "#991b1b22", borderRadius: 8, border: "1px solid #991b1b" }}>
            {err}
          </div>
        )}
      </div>
    </div>
  );
}
