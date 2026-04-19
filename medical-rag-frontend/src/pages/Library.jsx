import { useEffect, useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import PatientCard from "../components/PatientCard";
import SearchBar from "../components/SearchBar";

export default function Library() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const res = await API.get(`/patients?search=${search}`);
    setPatients(res.data.patients);
  };

  useEffect(() => {
    load();
  }, [search]);

  return (
    <div>
      <Navbar />
      <h1>Library</h1>
      <SearchBar value={search} setValue={setSearch} />
      {patients.map(p => <PatientCard key={p.patient_id} patient={p} />)}
    </div>
  );
}