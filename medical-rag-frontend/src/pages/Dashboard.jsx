import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Dashboard() {
  const nav = useNavigate();

  return (
    <div>
      <Navbar />
      <h1>Dashboard</h1>
      <button onClick={() => nav("/upload")}>Upload</button>
      <button onClick={() => nav("/library")}>Library</button>
    </div>
  );
}