import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { groupsApi } from "../../api/client";
import { useGroups } from "../../context/GroupsContext";
import { Card } from "../../components/card";
import { Button } from "../../components/button";

export function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { addGroup } = useGroups();
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    groupsApi.joinByToken(token)
      .then((group) => {
        addGroup(group);
        setStatus("done");
        setTimeout(() => navigate(`/group/${group.id}`), 1500);
      })
      .catch((err) => {
        setError(err.message ?? "Invalid or expired invite link.");
        setStatus("error");
      });
  }, [token]);

  return (
    <div className="flex items-center justify-center h-full">
      <Card className="p-8 max-w-sm w-full text-center space-y-4">
        {status === "loading" && (
          <>
            <p className="text-lg font-semibold">Joining group...</p>
            <p className="text-sm text-muted-foreground">Please wait.</p>
          </>
        )}
        {status === "done" && (
          <>
            <p className="text-2xl">🎉</p>
            <p className="text-lg font-semibold">You joined the group!</p>
            <p className="text-sm text-muted-foreground">Redirecting you now...</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-2xl">❌</p>
            <p className="text-lg font-semibold">Couldn't join</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Go home
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}