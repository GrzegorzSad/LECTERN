import { createBrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import Home from "../pages/Home";
import { LoginPage } from "../pages/auth/Login";
import { RegisterPage } from "../pages/auth/Register";
import { Layout } from "../components/layout";
import { LogoutPage } from "../pages/auth/Logout";
import { GroupLayout } from "../pages/groups/GroupLayout";
import { ChatPage } from "../pages/groups/ChatPage";
import { DataPage } from "../pages/groups/DataPage";
import { MembersPage } from "../pages/groups/MembersPage";
import { UserPage } from "../pages/user/User";
import { LinkedAccountsPage } from "../pages/linked-accounts/LinkedAccounts";
import { OneDriveListPage } from "../pages/onedrive/OnedriveList";
import { JoinPage } from "../pages/join/JoinPage";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UploadPage } from "../pages/documents/Upload";
import { UnauthorizedPage } from "../pages/errors/Unauthorized";

function RequireAuth({ children }: { children: ReactNode }) {
  const { loggedIn, userLoading } = useAuth();

  if (userLoading) return null; // or a spinner

  if (!loggedIn) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "logout", element: <LogoutPage /> },
      { path: "/unauthorized", element: <UnauthorizedPage />},
      {
        path: "group/:id",
        element: <RequireAuth><GroupLayout /></RequireAuth>,
        children: [
          { index: true, element: <Navigate to="chat" replace /> },
          { path: "chat", element: <ChatPage /> },
          { path: "data", element: <DataPage /> },
          { path: "members", element: <MembersPage /> },
          { path: "onedrive", element: <OneDriveListPage /> },
          { path: "upload", element: <UploadPage /> },
        ],
      },
      { path: "join/:token", element: <JoinPage /> },
      { path: "user/:id", element: <RequireAuth><UserPage /></RequireAuth> },
      { path: "linked-accounts", element: <RequireAuth><LinkedAccountsPage /></RequireAuth> },
    ],
  },
]);
