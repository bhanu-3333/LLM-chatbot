import { useParams } from "react-router-dom";
import { useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import ChatBox from "../components/ChatBox";

export default function Chat() {
  const { patient_id } = useParams();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);

  const send = async () => {
    const res = await API.post(`/chat?patient_id=${patient_id}&query=${query}`);
    
    setMessages([
      ...messages,
      {
        q: query,
        a: res.data.answer,
        citations: res.data.citations
      }
    ]);

    setQuery("");
  };

  return (
    <div>
      <Navbar />
      <h1>Chat - {patient_id}</h1>

      <ChatBox messages={messages} />

      <input value={query} onChange={e => setQuery(e.target.value)} />
      <button onClick={send}>Send</button>
    </div>
  );
}