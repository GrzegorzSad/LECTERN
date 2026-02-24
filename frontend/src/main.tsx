import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router/router";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { GroupsProvider } from "./context/GroupsContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <GroupsProvider>
        <RouterProvider router={router} />
      </GroupsProvider>
    </AuthProvider>
  </StrictMode>,
);
