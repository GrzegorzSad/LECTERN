import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router/router";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { GroupsProvider } from "./context/GroupsContext";
import { useDarkMode } from "./hooks/useDarkMode";

function AppProviders() {
  const { isDark } = useDarkMode();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);
  return <RouterProvider router={router} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <GroupsProvider>
        <AppProviders />
      </GroupsProvider>
    </AuthProvider>
  </StrictMode>,
);
