import React from "react";
import ReactDOM from "react-dom/client";
import { AppProviders } from "@/providers/AppProviders";
import "@/locales/i18n";
import "@/styles.css";
import { useAuthStore } from "@/store/auth";
import { initTheme } from "@/store/ui";

useAuthStore.getState().hydrate();
initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders />
  </React.StrictMode>,
);
