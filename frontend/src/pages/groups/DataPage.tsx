import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { documentsApi, membersApi } from "../../api/client";
import type { Document, Member } from "../../types/types";
import { Card } from "../../components/card";
import { Button } from "../../components/button";
import { SearchFilter } from "../../components/search-filter";
import { useGroup } from "./GroupLayout";
import { ChevronDown, ChevronRight } from "lucide-react";

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const mimeIcon = (mime: string) => {
  if (mime.includes("pdf")) return "📄";
  if (mime.includes("image")) return "🖼️";
  if (mime.includes("text")) return "📝";
  if (mime.includes("word") || mime.includes("document")) return "📃";
  if (mime.includes("sheet") || mime.includes("excel")) return "📊";
  return "📎";
};

function UserCard({ name, files, deletingId, confirmId, onConfirm, onCancelConfirm, onDelete }: {
  name: string;
  files: Document[];
  deletingId: number | null;
  confirmId: number | null;
  onConfirm: (id: number) => void;
  onCancelConfirm: () => void;
  onDelete: (file: Document) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 hover:bg-muted/20 transition-colors"
      >
        {open
          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{files.length} file{files.length !== 1 ? "s" : ""}</p>
        </div>
      </button>

      {open && (
        <div className="border-t overflow-y-auto" style={{ maxHeight: "50vh" }}>
          {files.map(file => (
            <div key={file.id} className="flex items-center gap-2 px-4 py-2 hover:bg-muted/40 transition-colors group">
              <span className="text-sm shrink-0">{mimeIcon(file.mimeType)}</span>
              <a href={file.path} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                <p className="text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)} · {formatDate(file.createdAt)}</p>
              </a>
              {confirmId === file.id ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-muted-foreground">Delete?</span>
                  <Button size="sm" variant="destructive" disabled={deletingId === file.id} onClick={() => onDelete(file)}>
                    {deletingId === file.id ? "..." : "Yes"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={onCancelConfirm}>No</Button>
                </div>
              ) : (
                <button
                  onClick={() => onConfirm(file.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function DataPage() {
  const { id } = useParams();
  const { group, loading, error } = useGroup();
  const [files, setFiles] = useState<Document[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      documentsApi.get(Number(id)),
      membersApi.list(Number(id)),
    ]).then(([docs, members]) => {
      setFiles(docs as Document[]);
      const nameMap: Record<number, string> = {};
      for (const m of members as Member[]) {
        if (m.user) nameMap[m.userId] = m.user.name;
      }
      setUserNames(nameMap);
    }).finally(() => setFilesLoading(false));
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

  const byUser: Record<string, Document[]> = {};
  for (const file of files) {
    const name = userNames[file.userId] ?? `User #${file.userId}`;
    if (!byUser[name]) byUser[name] = [];
    byUser[name].push(file);
  }

  const filtered = Object.entries(byUser).filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
      {/* Header with search and add button */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search users..."
          />
        </div>
        <Link to={`/group/${group.id}/onedrive`}>
          <Button size="lg">+ Add Data</Button>
        </Link>
      </div>

      {files.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No files yet — add files to get started.
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No users match "{search}"</p>
      ) : (
        filtered.map(([name, userFiles]) => (
          <UserCard
            key={name}
            name={name}
            files={userFiles}
            deletingId={deletingId}
            confirmId={confirmId}
            onConfirm={setConfirmId}
            onCancelConfirm={() => setConfirmId(null)}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  );
}