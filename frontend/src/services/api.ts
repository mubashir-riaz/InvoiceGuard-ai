// frontend/src/services/api.ts
// Axios instance pre-configured to call the backend API.
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

export default api;
