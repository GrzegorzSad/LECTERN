import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/Home";
import { Layout } from "../components/layout"
// import Login from "../pages/Login";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Layout>
        <Home />
      </Layout>
    ),
  },
]);
