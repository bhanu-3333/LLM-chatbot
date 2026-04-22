import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";

import RegisterDoctor from "../pages/RegisterDoctor";
import Dashboard from "../pages/Dashboard";
import Upload from "../pages/Upload";
import Library from "../pages/Library";
import Chat from "../pages/Chat";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/register-doctor" element={<RegisterDoctor />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/library" element={<Library />} />
        <Route path="/chat/:patient_id" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  );
}