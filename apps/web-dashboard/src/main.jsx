import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AdminSessionProvider } from "./lib/adminSession";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminSessionProvider>
        <App />
      </AdminSessionProvider>
    </BrowserRouter>
  </React.StrictMode>
);
