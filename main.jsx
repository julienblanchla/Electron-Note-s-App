// src/index.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppProvider } from "./AppContext";
// Ceci est correct
import "./index.css";  // Importer Tailwind d'abord
import "./App.css";    // Puis vos styles personnalisés

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
);
