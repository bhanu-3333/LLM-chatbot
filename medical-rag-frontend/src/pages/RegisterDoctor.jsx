import { useState } from "react";
import API from "../api/api";

export default function RegisterDoctor() {
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [hospital_code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const register = async () => {
    await API.post("/auth/register-doctor", {
      name,
      specialization,
      hospital_code,
      password
    });
    alert("Doctor registered");
  };

  return (
    <div>
      <h1>Register Doctor</h1>
      <input placeholder="Name" onChange={e => setName(e.target.value)} />
      <input placeholder="Specialization" onChange={e => setSpecialization(e.target.value)} />
      <input placeholder="Hospital Code" onChange={e => setCode(e.target.value)} />
      <input placeholder="Password" onChange={e => setPassword(e.target.value)} />
      <button onClick={register}>Submit</button>
    </div>
  );
}