import { useState } from "react";
import API from "../api/api";

export default function RegisterHospital() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const register = async () => {
    await API.post("/auth/register-hospital", { name, code });
    alert("Hospital registered");
  };

  return (
    <div>
      <h1>Register Hospital</h1>
      <input placeholder="Name" onChange={e => setName(e.target.value)} />
      <input placeholder="Code" onChange={e => setCode(e.target.value)} />
      <button onClick={register}>Submit</button>
    </div>
  );
}