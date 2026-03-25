import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./state/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);
