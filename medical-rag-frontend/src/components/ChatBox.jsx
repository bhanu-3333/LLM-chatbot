export default function ChatBox({ messages }) {
  return (
    <div>
      {messages.map((m, i) => (
        <div key={i}>
          <p><b>Q:</b> {m.q}</p>
          <p><b>A:</b> {m.a}</p>
          <p>{m.citations?.join(", ")}</p>
        </div>
      ))}
    </div>
  );
}