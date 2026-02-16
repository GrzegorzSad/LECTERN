import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { groupsApi } from "../../api/client";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import type { Group } from "../../types/types";

export function CreateGroupPage() {
  const [name, setName] = useState("");
  const [img, setImg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name) return setError("Group name is required");
    setLoading(true);
    setError(null);
    try {
      const newGroup = await groupsApi.create({ name, img }) as Group;
      navigate(`/group/${newGroup.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <Card className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Create New Group</h1>
        {error && <p className="text-red-500">{error}</p>}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Group Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter group name"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Image URL (optional)</label>
          <Input
            value={img}
            onChange={(e) => setImg(e.target.value)}
            placeholder="Enter image URL"
          />
        </div>
        <Button onClick={handleCreate} disabled={loading}>
          {loading ? "Creating..." : "Create Group"}
        </Button>
      </Card>
    </div>
  );
}