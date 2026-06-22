import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import App from "./App";
import { ThemeProvider } from "./lib/theme";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ClerkProvider afterSignOutUrl="/">
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </ClerkProvider>,
);
