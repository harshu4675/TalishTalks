/**
 * Application entry point.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app/App.jsx";
import "./styles/index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error('Talish Talks could not start: no element with id "root" was found.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
