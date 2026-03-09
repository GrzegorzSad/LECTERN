import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { oneDriveApi, documentsApi, linkedAccountsApi } from "../../api/client";
import { Card } from "../../components/card";
import { Button } from "../../components/button";
import { SearchFilter } from "../../components/search-filter";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface OneDriveItem {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  folder?: { childCount: number };
  file?: { mimeType: string };
  children?: OneDriveItem[];
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const mimeIcon = (item: OneDriveItem) => {
  if (item.folder) return "📁";
  const mime = item.file?.mimeType ?? "";
  if (mime.includes("pdf")) return "📄";
  if (mime.includes("image")) return "🖼️";
  if (mime.includes("text")) return "📝";
  if (mime.includes("word") || mime.includes("document")) return "📃";
  if (mime.includes("sheet") || mime.includes("excel")) return "📊";
  return "📎";
};

const itemMatches = (item: OneDriveItem, q: string): boolean => {
  if (item.name.toLowerCase().includes(q)) return true;
  if (item.children) return item.children.some((c) => itemMatches(c, q));
  return false;
};

function FileRow({
  item,
  processingId,
  addedIds,
  onAdd,
}: {
  item: OneDriveItem;
  processingId: string | null;
  addedIds: Set<string>;
  onAdd: (item: OneDriveItem) => void;
}) {
  const isAdded = addedIds.has(item.id);
  const isProcessing = processingId === item.id;

  return (
    <div className="flex items-center gap-2 px-4 py-2 hover:bg-muted/40 transition-colors">
      <span className="text-sm shrink-0">{mimeIcon(item)}</span>
      <a
        href={item.webUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0"
      >
        <p className="text-sm truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          {item.file?.mimeType} · {formatSize(item.size)}
        </p>
      </a>
      <Button
        size="sm"
        variant={isAdded ? "outline" : "default"}
        disabled={isAdded || isProcessing}
        onClick={() => onAdd(item)}
        className="shrink-0"
      >
        {isProcessing ? "Adding..." : isAdded ? "Added ✓" : "Add"}
      </Button>
    </div>
  );
}

function FolderCard({
  item,
  processingId,
  addedIds,
  onAdd,
  search,
  onChildrenFetched,
}: {
  item: OneDriveItem;
  processingId: string | null;
  addedIds: Set<string>;
  onAdd: (item: OneDriveItem) => void;
  search: string;
  onChildrenFetched: (folderId: string, children: OneDriveItem[]) => void;
}) {
  const q = search.toLowerCase();
  const hasSearch = q.length > 0;
  const matchesSearch = hasSearch && itemMatches(item, q);

  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open =
    manualOpen !== null ? manualOpen : hasSearch ? matchesSearch : false;
  const [loadingChildren, setLoadingChildren] = useState(false);

  const toggle = async () => {
    const next = !open;
    setManualOpen(next);
    if (next && !item.children) {
      setLoadingChildren(true);
      try {
        const data = (await oneDriveApi.listFiles(item.id)) as OneDriveItem[];
        onChildrenFetched(item.id, data);
      } finally {
        setLoadingChildren(false);
      }
    }
  };

  useEffect(() => {
    if (hasSearch && matchesSearch && !item.children && !loadingChildren) {
      setLoadingChildren(true);
      oneDriveApi
        .listFiles(item.id)
        .then((data) => {
          onChildrenFetched(item.id, data as OneDriveItem[]);
        })
        .finally(() => setLoadingChildren(false));
    }
  }, [hasSearch, matchesSearch]);

  const visibleChildren =
    hasSearch && item.children
      ? item.children.filter((c) => itemMatches(c, q))
      : item.children;

  if (hasSearch && !matchesSearch) return null;

  return (
    <div>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/30 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm shrink-0">📁</span>
        <span className="text-sm font-medium flex-1 text-left truncate">
          {item.name}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {loadingChildren ? "Loading..." : `${item.folder!.childCount} items`}
        </span>
      </button>

      {open && visibleChildren !== undefined && (
        <div className="ml-4 border-l">
          {visibleChildren.length === 0 ? (
            <p className="px-4 py-2 text-xs text-muted-foreground">
              {hasSearch ? "No matches in this folder" : "Empty folder"}
            </p>
          ) : (
            visibleChildren.map((child) =>
              child.folder ? (
                <FolderCard
                  key={child.id}
                  item={child}
                  processingId={processingId}
                  addedIds={addedIds}
                  onAdd={onAdd}
                  search={search}
                  onChildrenFetched={onChildrenFetched}
                />
              ) : (
                <FileRow
                  key={child.id}
                  item={child}
                  processingId={processingId}
                  addedIds={addedIds}
                  onAdd={onAdd}
                />
              ),
            )
          )}
        </div>
      )}
    </div>
  );
}

export function OneDriveListPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const [items, setItems] = useState<OneDriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [hasOneDrive, setHasOneDrive] = useState<boolean | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    linkedAccountsApi
      .list()
      .then((res) => {
        const accounts = res as any[];
        const linked = accounts.some((a) => a.provider === "microsoft");
        setHasOneDrive(linked);
        if (linked) {
          return oneDriveApi
            .listFiles()
            .then((data) => setItems(data as OneDriveItem[]))
            .catch((err) => setError(err.message));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const addToGroup = async (item: OneDriveItem) => {
    if (!groupId || item.folder) return;
    setProcessingId(item.id);
    try {
      await documentsApi.link({ groupId: Number(groupId), link: item.id });
      setAddedIds((prev) => new Set(prev).add(item.id));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleChildrenFetched = (
    folderId: string,
    children: OneDriveItem[],
  ) => {
    setItems((prev) => updateChildren(prev, folderId, children));
  };

  const updateChildren = (
    list: OneDriveItem[],
    folderId: string,
    children: OneDriveItem[],
  ): OneDriveItem[] => {
    return list.map((item) => {
      if (item.id === folderId) return { ...item, children };
      if (item.children)
        return {
          ...item,
          children: updateChildren(item.children, folderId, children),
        };
      return item;
    });
  };

  if (loading) return <div>Loading...</div>;

  if (!hasOneDrive) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4">
        <Card className="p-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-medium">No OneDrive account linked</p>
          <p className="text-xs text-muted-foreground">
            Connect your Microsoft account to browse and add files from
            OneDrive.
          </p>
          <Button>
            <Link to={`/user/${user?.id}`}>Link OneDrive</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (error) return <div>Error: {error}</div>;

  const q = search.toLowerCase();
  const filtered = q ? items.filter((item) => itemMatches(item, q)) : items;

  const folders = filtered.filter((i) => i.folder);
  const files = filtered.filter((i) => !i.folder);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
      <SearchFilter
        value={search}
        onChange={setSearch}
        placeholder="Search files..."
      />

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {search
            ? `No items match "${search}"`
            : "No files found in your OneDrive."}
        </Card>
      ) : (
        <Card className="overflow-hidden divide-y">
          {folders.map((item) => (
            <FolderCard
              key={item.id}
              item={item}
              processingId={processingId}
              addedIds={addedIds}
              onAdd={addToGroup}
              search={search}
              onChildrenFetched={handleChildrenFetched}
            />
          ))}
          {files.map((item) => (
            <FileRow
              key={item.id}
              item={item}
              processingId={processingId}
              addedIds={addedIds}
              onAdd={addToGroup}
            />
          ))}
        </Card>
      )}
    </div>
  );
}
