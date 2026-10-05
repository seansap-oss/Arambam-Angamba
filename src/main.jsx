import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {import.meta.env.DEV && location.pathname === '/__preview/mobile' ? <iframe title="Mobile website preview" src="/" style={{width:390,height:844,border:0,display:'block',margin:'0 auto'}}/> : <App />}
  </React.StrictMode>,
);
