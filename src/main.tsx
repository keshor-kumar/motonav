import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./styles/components.css";
import "./styles/navigation.css";
import "./styles/app.css";
import "./styles/landing.css";
import "./styles/comms.css";
import "./styles/pages.css";
import "./styles/community.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
