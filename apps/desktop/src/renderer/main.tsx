import { createRoot } from "react-dom/client";
import { AppShell } from "./components/AppShell.js";
import "./styles.css";

const rootEl = document.getElementById("root");
if (rootEl) createRoot(rootEl).render(<AppShell />);
