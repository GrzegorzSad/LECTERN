import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/Home";
import { LoginPage } from "../pages/auth/login";
import { RegisterPage } from "../pages/auth/register";
import { Layout } from "../components/layout";
import { LogoutPage } from "../pages/auth/logout";
import { GroupPage } from "../pages/groups/group";
import { UserPage } from "../pages/user/user";
import { LinkedAccountsPage } from "../pages/linked-accounts/linkedAccounts";
import { OneDriveListPage } from "../pages/onedrive/onedrive-list";

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
      <Layout showGroup={false}>
        <LoginPage />
      </Layout>
    ),
  },
  {
    path: "/register",
    element: (
      <Layout showGroup={false}>
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
        <GroupPage />
      </Layout>
    ),
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
      <Layout showGroup={false}>
        <UserPage />
      </Layout>
    ),
  },
  {
    path: "/linked-accounts",
    element: (
      <Layout showGroup={false}>
        <LinkedAccountsPage />
      </Layout>
    ),
  },
]);
