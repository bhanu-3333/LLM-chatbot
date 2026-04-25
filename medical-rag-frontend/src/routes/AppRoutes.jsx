import { BrowserRouter, Routes, Route } from "react-router-dom";

import AuthPage from "../pages/AuthPage";
import Home from "../pages/Home";
import About from "../pages/About";

import Dashboard from "../pages/Dashboard";
import Upload from "../pages/Upload";
import Library from "../pages/Library";
import Chat from "../pages/Chat";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register-doctor" element={<AuthPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/library" element={<Library />} />
        <Route path="/chat/:patient_id" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  );
}