import { useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/global.css";

export default function Upload() {
  const [file, setFile]         = useState(null);
  const [patientName, setName]  = useState("");
  const [age, setAge]           = useState("");
  const [gender, setGender]     = useState("");
  const [msg, setMsg]           = useState("");
  const [err, setErr]           = useState("");
  const [loading, setLoading]   = useState(false);

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
      setMsg(`✅ ${res.data.message} — Patient ID: ${res.data.patient_id} (${res.data.pages_indexed} pages indexed)`);
      setName(""); setAge(""); setGender(""); setFile(null);
    } catch (e) {
      setErr(e.response?.data?.detail || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="page" style={{ maxWidth: 520 }}>
        <h1>Upload Patient Record</h1>
        <input placeholder="Patient Name" value={patientName} onChange={e => setName(e.target.value)} />
        <input placeholder="Age"          value={age}         onChange={e => setAge(e.target.value)} />
        <select value={gender} onChange={e => setGender(e.target.value)}>
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])}
          style={{ padding: "8px 0", border: "none", background: "transparent" }} />
        <button className="btn-primary" style={{ width: "100%" }} onClick={upload} disabled={loading}>
          {loading ? "Uploading & Indexing..." : "Upload"}
        </button>
        {msg && <p className="msg-success">{msg}</p>}
        {err && <p className="msg-error">{err}</p>}
      </div>
    </div>
  );
}
