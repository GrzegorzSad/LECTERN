import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { groupsApi } from "../../api/client";
import type { Group } from "../../types/types";
import { Card } from "../../components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";

export function GroupPage() {
  const { id } = useParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchGroup = async () => {
      try {
        const data = await groupsApi.get(Number(id));
        setGroup(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error || !group) return <div>Group not found</div>;

  return (
    <div className="max-w-2xl">
      <Card className="p-6 space-y-4">
        {group.img && (
          <img
            src={group.img}
            alt={group.name}
            className="w-full h-64 object-cover rounded-md"
          />
        )}

        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-muted-foreground">ID: {group.id}</p>
        </div>
      </Card>
      <Link to={`/group/${group.id}/onedrive`}>
        <Button>Add file from onedrive</Button>
      </Link>
    </div>
  );
}
