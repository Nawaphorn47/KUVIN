import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AppProvider } from "./context/AppContext.jsx";
import { DriverPresenceProvider } from "./context/DriverPresenceContext.jsx";
import { AreaProvider } from "./context/AreaContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <AreaProvider>
          <DriverPresenceProvider>
            <App />
          </DriverPresenceProvider>
        </AreaProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
