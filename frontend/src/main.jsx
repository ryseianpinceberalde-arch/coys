import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./state/AuthContext.jsx";
import { OrderAlertsProvider } from "./context/OrderAlertsContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <SettingsProvider>
          <OrderAlertsProvider>
            <App />
          </OrderAlertsProvider>
        </SettingsProvider>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);
