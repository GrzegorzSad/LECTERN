import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { documentsApi } from "../../api/client";
import type { Document } from "../../types/types";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useGroup } from "./GroupLayout";

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const sourceLabel = (file: Document) => {
  if (file.isLinked) return "OneDrive";
  if (file.sourceId) return `Source #${file.sourceId}`;
  return "Uploaded";
};

const mimeIcon = (mime: string) => {
  if (mime.includes("pdf")) return "📄";
  if (mime.includes("image")) return "🖼️";
  if (mime.includes("text")) return "📝";
  if (mime.includes("word") || mime.includes("document")) return "📃";
  if (mime.includes("sheet") || mime.includes("excel")) return "📊";
  return "📎";
};

type GroupBy = "source" | "user";

export function DataPage() {
  const { id } = useParams();
  const { group, loading, error } = useGroup();
  const [files, setFiles] = useState<Document[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>("source");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    documentsApi.get(Number(id))
      .then((data) => setFiles(data as Document[]))
      .finally(() => setFilesLoading(false));
  }, [id]);

  const handleDelete = async (file: Document) => {
    setDeletingId(file.id);
    try {
      await documentsApi.remove(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  if (loading || filesLoading) return <div>Loading...</div>;
  if (error || !group) return <div>Group not found</div>;

  const grouped: Record<string, Document[]> = {};
  for (const file of files) {
    const key = groupBy === "source" ? sourceLabel(file) : `User #${file.userId}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(file);
  }

  return (
    <div className="space-y-4">
      {/* Group header */}
      <Card className="overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <p className="text-sm text-muted-foreground">
              {files.length} file{files.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link to={`/group/${group.id}/onedrive`}>
            <Button>+ Add from OneDrive</Button>
          </Link>
        </div>
      </Card>

      {/* Files */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Files</h2>
          <div className="flex gap-1 border rounded-md p-1 text-sm">
            <button
              onClick={() => setGroupBy("source")}
              className={`px-3 py-1 rounded transition-colors ${
                groupBy === "source"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              By source
            </button>
            <button
              onClick={() => setGroupBy("user")}
              className={`px-3 py-1 rounded transition-colors ${
                groupBy === "user"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              By user
            </button>
          </div>
        </div>

        {files.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No files yet — add one from OneDrive to get started.
          </Card>
        ) : (
          Object.entries(grouped).map(([groupKey, groupFiles]) => (
            <div key={groupKey} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
                {groupKey}
              </p>
              <Card className="divide-y">
                {groupFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors">
                    <span className="text-xl">{mimeIcon(file.mimeType)}</span>
                    <a
                      href={file.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 hover:underline"
                    >
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(file.size)} · {formatDate(file.createdAt)}
                      </p>
                    </a>

                    {/* Delete / confirm */}
                    {confirmId === file.id ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">Delete?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deletingId === file.id}
                          onClick={() => handleDelete(file)}
                        >
                          {deletingId === file.id ? "Deleting..." : "Yes"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmId(null)}
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(file.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                        title="Delete file"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
}