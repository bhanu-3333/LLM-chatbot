import { useEffect } from "react";
import API from "./api/api";

function App() {
  useEffect(() => {
    API.get("/health")
      .then((res) => console.log(res.data))
      .catch((err) => console.error(err));
  }, []);

  return <h1>Medical RAG Frontend Running 🚀</h1>;
}

export default App;