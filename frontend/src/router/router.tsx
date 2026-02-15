import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/Home";
import { LoginPage } from "../pages/auth/login";
import { RegisterPage } from "../pages/auth/register";
import { Layout } from "../components/layout";

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
      <Layout group={false}>
        <LoginPage />
      </Layout>
    ),
  },
]);
