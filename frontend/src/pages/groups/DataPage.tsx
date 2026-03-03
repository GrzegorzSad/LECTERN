import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { documentsApi, membersApi } from "../../api/client";
import type { Document, Member } from "../../types/types";
import { Card } from "../../components/card";
import { Button } from "../../components/button";
import { useGroup } from "./GroupLayout";
import { cn } from "../../lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

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

function FileRow({ file, deletingId, confirmId, onConfirm, onCancelConfirm, onDelete }: {
  file: Document;
  deletingId: number | null;
  confirmId: number | null;
  onConfirm: (id: number) => void;
  onCancelConfirm: () => void;
  onDelete: (file: Document) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors group">
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
  );
}

function InnerGroup({ label, files, deletingId, confirmId, onConfirm, onCancelConfirm, onDelete }: {
  label: string;
  files: Document[];
  deletingId: number | null;
  confirmId: number | null;
  onConfirm: (id: number) => void;
  onCancelConfirm: () => void;
  onDelete: (file: Document) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t first:border-t-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-muted/30 transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="ml-auto text-xs text-muted-foreground/60 normal-case font-normal">{files.length}</span>
      </button>
      {open && files.map(file => (
        <FileRow
          key={file.id}
          file={file}
          deletingId={deletingId}
          confirmId={confirmId}
          onConfirm={onConfirm}
          onCancelConfirm={onCancelConfirm}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function OuterCard({ outerKey, files, innerKey, userNames, deletingId, confirmId, onConfirm, onCancelConfirm, onDelete }: {
  outerKey: string;
  files: Document[];
  innerKey: "source" | "user";
  userNames: Record<number, string>;
  deletingId: number | null;
  confirmId: number | null;
  onConfirm: (id: number) => void;
  onCancelConfirm: () => void;
  onDelete: (file: Document) => void;
}) {
  const [open, setOpen] = useState(true);

  const userName = (userId: number) => userNames[userId] ?? `User #${userId}`;

  const innerGroups: Record<string, Document[]> = {};
  for (const file of files) {
    const k = innerKey === "source" ? sourceLabel(file) : userName(file.userId);
    if (!innerGroups[k]) innerGroups[k] = [];
    innerGroups[k].push(file);
  }

  const innerCount = Object.keys(innerGroups).length;
  const subtitle = innerKey === "source"
    ? `${innerCount} source${innerCount !== 1 ? "s" : ""} · ${files.length} file${files.length !== 1 ? "s" : ""}`
    : `${innerCount} user${innerCount !== 1 ? "s" : ""} · ${files.length} file${files.length !== 1 ? "s" : ""}`;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 hover:bg-muted/20 transition-colors"
      >
        {open
          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold">{outerKey}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </button>
      {open && (
        <div className="overflow-y-auto " style={{ maxHeight: "50vh" }}>
          {Object.entries(innerGroups).map(([k, groupFiles]) => (
            <InnerGroup
              key={k}
              label={k}
              files={groupFiles}
              deletingId={deletingId}
              confirmId={confirmId}
              onConfirm={onConfirm}
              onCancelConfirm={onCancelConfirm}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

type GroupBy = "user" | "source";

export function DataPage() {
  const { id } = useParams();
  const { group, loading, error } = useGroup();
  const [files, setFiles] = useState<Document[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [outerGroupBy, setOuterGroupBy] = useState<GroupBy>("user");
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

  const userName = (userId: number) => userNames[userId] ?? `User #${userId}`;

  const outerGroups: Record<string, Document[]> = {};
  for (const file of files) {
    const k = outerGroupBy === "user" ? userName(file.userId) : sourceLabel(file);
    if (!outerGroups[k]) outerGroups[k] = [];
    outerGroups[k].push(file);
  }

  const innerGroupBy: GroupBy = outerGroupBy === "user" ? "source" : "user";

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filter sidebar */}
      <div className="w-44 shrink-0 flex flex-col px-2 pb-2 gap-1">
        <p className="text-xs font-semibold text-muted-foreground mb-1">Group by</p>
        {(["user", "source"] as GroupBy[]).map((opt) => (
          <button
            key={opt}
            onClick={() => setOuterGroupBy(opt)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
              outerGroupBy === opt
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {opt === "user" ? "By user" : "By source"}
          </button>
        ))}
        <div className="mt-auto pt-2">
          <Link to={`/group/${group.id}/onedrive`}>
            <Button variant="outline" size="sm" className="w-full">+ Add Data</Button>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{group.name}</h1>
              <p className="text-xs text-muted-foreground">
                {files.length} file{files.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link to={`/group/${group.id}/onedrive`}>
              <Button size="sm">+ Add Data</Button>
            </Link>
          </div>

          {files.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No files yet — add files to get started.
            </Card>
          ) : (
            Object.entries(outerGroups).map(([key, groupFiles]) => (
              <OuterCard
                key={key}
                outerKey={key}
                files={groupFiles}
                innerKey={innerGroupBy}
                userNames={userNames}
                deletingId={deletingId}
                confirmId={confirmId}
                onConfirm={setConfirmId}
                onCancelConfirm={() => setConfirmId(null)}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}