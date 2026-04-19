import { useEffect, useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import PatientCard from "../components/PatientCard";
import SearchBar from "../components/SearchBar";
import "../styles/global.css";

export default function Library() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch]     = useState("");
  const [err, setErr]           = useState("");

  const load = async () => {
    setErr("");
    try {
      const res = await API.get(`/patients/?search=${search}`);
      setPatients(res.data.patients || []);
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to load patients");
    }
  };

  useEffect(() => { load(); }, [search]);

  return (
    <div>
      <Navbar />
      <div className="page">
        <h1>Patient Library</h1>
        <SearchBar value={search} setValue={setSearch} />
        {err && <p className="msg-error">{err}</p>}
        {patients.length === 0 && !err && (
          <p style={{ color: "#64748b" }}>No patients found. Upload a record to get started.</p>
        )}
        {patients.map(p => <PatientCard key={p.patient_id} patient={p} />)}
      </div>
    </div>
  );
}
