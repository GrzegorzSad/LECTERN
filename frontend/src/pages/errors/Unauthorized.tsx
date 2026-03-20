import { Button } from "../../components/button";
import { Link } from "react-router-dom";

export function UnauthorizedPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3">
      <p className="text-lg font-semibold">Access Denied</p>
      <p className="text-sm text-muted-foreground">You don't have permission to view this page.</p>
      <Link to="/"><Button variant="outline" size="sm">Go home</Button></Link>
    </div>
  );
}