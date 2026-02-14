import { createBrowserRouter } from "react-router-dom";
// import Home from "../pages/Home";
// import Login from "../pages/Login";
import App from "../App";

export const router = createBrowserRouter([
  { path: "/", element: <App /> },
//   { path: "/login", element: <Login /> },
]);