// Root component – now fetches the API health endpoint to verify connectivity.
import { useEffect, useState } from "react";
import api from "./services/api";

const App: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<string>("checking...");

  useEffect(() => {
    api
      .get("/health")
      .then((res) => setApiStatus(res.data.status))
      .catch(() => setApiStatus("offline"));
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🚚 InvoiceGuard-ai</h1>
      <p>Multi‑modal invoice auditor is running.</p>
      <p>
        Backend API status: <strong>{apiStatus}</strong>
      </p>
    </div>
  );
};

export default App;
