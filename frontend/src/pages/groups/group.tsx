import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { groupsApi, documentsApi } from "../../api/client";
import type { Group } from "../../types/types";
import type { Document } from "../../types/types"; // make sure you have a type for files
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

export function GroupPage() {
  const { id } = useParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [files, setFiles] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const groupData = await groupsApi.get(Number(id));
        setGroup(groupData);

        const filesData = await documentsApi.get(Number(id));
        setFiles(filesData as any);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error || !group) return <div>Group not found</div>;

  return (
    <div className="max-w-2xl space-y-6">
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
        <Link to={`/group/${group.id}/onedrive`}>
          <Button>Add file from OneDrive</Button>
        </Link>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-2">Files</h2>
        {files.length === 0 ? (
          <p>No files uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {files.map((file) => (
              <li key={file.id}>
                <a
                  href={file.path} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}