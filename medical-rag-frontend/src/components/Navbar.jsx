import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const nav = useNavigate();

  return (
    <div>
      <button onClick={() => nav("/dashboard")}>Dashboard</button>
      <button onClick={() => nav("/upload")}>Upload</button>
      <button onClick={() => nav("/library")}>Library</button>
      <button onClick={() => {
        localStorage.removeItem("token");
        nav("/");
      }}>Logout</button>
    </div>
  );
}