import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AdminSessionProvider } from "./lib/adminSession";
import "@fontsource/anuphan/thai-400.css";
import "@fontsource/anuphan/thai-500.css";
import "@fontsource/anuphan/thai-600.css";
import "@fontsource/anuphan/thai-700.css";
import "@fontsource/anuphan/latin-400.css";
import "@fontsource/anuphan/latin-600.css";
import "@fontsource/anuphan/latin-700.css";
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
