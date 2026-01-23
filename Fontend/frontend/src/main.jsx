// src/main.jsx (hoặc index.jsx)

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext"; 
// nếu file của bạn ở "../../frontend/src/contexts/AuthContext" thì sửa cho đúng:
// import { AuthProvider } from "../../frontend/src/contexts/AuthContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);