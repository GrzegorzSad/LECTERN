import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export function LogoutPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const logout = async () => {
      try {
        await authApi.logout();
      } catch {
      } finally {
        setUser(null);
        navigate("/", { replace: true });
      }
    };
    logout();
  }, [navigate, setUser]);

  return (
    <div className="flex items-center justify-center h-full">
      Logging out...
    </div>
  );
}
