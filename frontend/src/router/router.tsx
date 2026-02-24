import { createBrowserRouter } from "react-router-dom";
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
import { Navigate } from "react-router-dom";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Layout>
        <Home />
      </Layout>
    ),
  },
  {
    path: "/login",
    element: (
      <Layout>
        <LoginPage />
      </Layout>
    ),
  },
  {
    path: "/register",
    element: (
      <Layout>
        <RegisterPage />
      </Layout>
    ),
  },
  {
    path: "/logout",
    element: <LogoutPage />,
  },
  {
    path: "/group/:id",
    element: (
      <Layout>
        <GroupLayout />
      </Layout>
    ),
    children: [
      // Redirect /group/:id → /group/:id/chat by default
      { index: true, element: <Navigate to="chat" replace /> },
      { path: "chat", element: <ChatPage /> },
      { path: "data", element: <DataPage /> },
      { path: "members", element: <MembersPage /> },
    ],
  },
  {
    path: "/group/:id/onedrive",
    element: (
      <Layout>
        <OneDriveListPage />
      </Layout>
    ),
  },
  {
    path: "/user/:id",
    element: (
      <Layout >
        <UserPage />
      </Layout>
    ),
  },
  {
    path: "/linked-accounts",
    element: (
      <Layout >
        <LinkedAccountsPage />
      </Layout>
    ),
  },
]);
