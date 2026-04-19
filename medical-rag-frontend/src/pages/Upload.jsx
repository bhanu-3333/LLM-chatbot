import { useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [patient_name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");

  const upload = async () => {
    const form = new FormData();
    form.append("patient_name", patient_name);
    form.append("age", age);
    form.append("gender", gender);
    form.append("file", file);

    const res = await API.post("/upload", form);
    alert(res.data.message);
  };

  return (
    <div>
      <Navbar />
      <h1>Upload</h1>
      <input placeholder="Name" onChange={e => setName(e.target.value)} />
      <input placeholder="Age" onChange={e => setAge(e.target.value)} />
      <input placeholder="Gender" onChange={e => setGender(e.target.value)} />
      <input type="file" onChange={e => setFile(e.target.files[0])} />
      <button onClick={upload}>Upload</button>
    </div>
  );
}