import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/client";

export function LogoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const logout = async () => {
      try {
        await authApi.logout();
      } catch {
      } finally {
        localStorage.removeItem("loggedIn");
        navigate("/", { replace: true });
      }
    };

    logout();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-full">
      Logging out...
    </div>
  );
}