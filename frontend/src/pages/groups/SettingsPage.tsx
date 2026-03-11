import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { groupsApi } from "../../api/client";
import { useGroup } from "./GroupLayout";
import { useGroups } from "../../context/GroupsContext";
import { Card } from "../../components/card";
import { Button } from "../../components/button";

export function SettingsPage() {
  const { id } = useParams();
  const { group, loading, error } = useGroup();
  const { removeGroup } = useGroups();
  const navigate = useNavigate();

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await groupsApi.remove(Number(id));
      removeGroup(Number(id));
      navigate("/", { replace: true });
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error || !group) return <div>Group not found</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

      <Card className="p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-destructive">Danger Zone</p>
          <p className="text-xs text-muted-foreground mt-1">
            Deleting this group is permanent and cannot be undone. All channels, messages and files will be removed.
          </p>
        </div>

        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Are you sure?</span>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Yes, delete"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            Delete Group
          </Button>
        )}
      </Card>
    </div>
  );
}