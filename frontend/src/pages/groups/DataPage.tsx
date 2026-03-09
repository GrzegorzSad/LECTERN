import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { documentsApi, membersApi } from "../../api/client";
import type { Document, Member } from "../../types/types";
import { Card } from "../../components/card";
import { Button } from "../../components/button";
import { SearchFilter } from "../../components/search-filter";
import { useGroup } from "./GroupLayout";
import { ChevronDown, ChevronRight, Cloud, HardDriveUpload, X } from "lucide-react";

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

interface DataSource {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: (groupId: number) => string;
  available: boolean;
}

const DATA_SOURCES: DataSource[] = [
  {
    id: "onedrive",
    label: "OneDrive",
    description: "Import files from your Microsoft OneDrive",
    icon: <Cloud className="h-6 w-6" />,
    href: (groupId) => `/group/${groupId}/onedrive`,
    available: true,
  },
  {
    id: "upload",
    label: "Upload",
    description: "Upload files directly from your device",
    icon: <HardDriveUpload className="h-6 w-6" />,
    href: (groupId) => `/group/${groupId}/upload`,
    available: true,
  },
];

function AddDataDialog({ groupId, onClose }: { groupId: number; onClose: () => void }) {
  const navigate = useNavigate();

  const handleSelect = (source: DataSource) => {
    if (!source.available) return;
    onClose();
    navigate(source.href(groupId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <Card className="w-96 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Add Data</h2>
            <p className="text-xs text-muted-foreground">Choose a source to import files from</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {DATA_SOURCES.map((source) => (
            <button
              key={source.id}
              onClick={() => handleSelect(source)}
              disabled={!source.available}
              className={`
                relative flex flex-col items-center gap-3 p-4 rounded-lg border text-center transition-all
                ${source.available
                  ? "hover:border-primary hover:bg-primary/5 cursor-pointer"
                  : "opacity-40 cursor-not-allowed"
                }
              `}
            >
              <div className="text-muted-foreground">{source.icon}</div>
              <div>
                <p className="text-sm font-medium">{source.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{source.description}</p>
              </div>
              {!source.available && (
                <span className="absolute top-2 right-2 text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

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
        <div className="overflow-y-auto" style={{ maxHeight: "50vh" }}>
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
  const [addDialogOpen, setAddDialogOpen] = useState(false);
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
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchFilter value={search} onChange={setSearch} placeholder="Search users..." />
        </div>
        <Button size="lg" onClick={() => setAddDialogOpen(true)}>+ Add Data</Button>
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

      {addDialogOpen && (
        <AddDataDialog groupId={group.id} onClose={() => setAddDialogOpen(false)} />
      )}
    </div>
  );
}