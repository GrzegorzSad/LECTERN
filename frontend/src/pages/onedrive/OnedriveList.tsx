import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { oneDriveApi, documentsApi, linkedAccountsApi } from "../../api/client";
import { Button } from "../../components/button";
import { Loading } from "../../components/loading";
import { SearchFilter } from "../../components/search-filter";
import { ChevronDown, ChevronRight } from "lucide-react";

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

// ---------------------------------------------------------------------------
// File row
// ---------------------------------------------------------------------------

function FileRow({
  item,
  processingId,
  addedIds,
  onAdd,
  isLast,
}: {
  item: OneDriveItem;
  processingId: string | null;
  addedIds: Set<string>;
  onAdd: (item: OneDriveItem) => void;
  isLast?: boolean;
}) {
  const isAdded = addedIds.has(item.id);
  const isProcessing = processingId === item.id;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 hover:bg-muted/20 transition-colors ${
        !isLast ? "border-b" : ""
      }`}
    >
      <span className="text-sm shrink-0">{mimeIcon(item)}</span>
      <a
        href={item.webUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 group/link"
      >
        <p className="text-sm font-medium truncate group-hover/link:underline">
          {item.name}
        </p>
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

// ---------------------------------------------------------------------------
// Folder (recursive, sits inside the same bg-background container)
// ---------------------------------------------------------------------------

function FolderRow({
  item,
  processingId,
  addedIds,
  onAdd,
  search,
  onChildrenFetched,
  depth,
}: {
  item: OneDriveItem;
  processingId: string | null;
  addedIds: Set<string>;
  onAdd: (item: OneDriveItem) => void;
  search: string;
  onChildrenFetched: (folderId: string, children: OneDriveItem[]) => void;
  depth?: number;
}) {
  const q = search.toLowerCase();
  const hasSearch = q.length > 0;
  const matchesSearch = hasSearch && itemMatches(item, q);

  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open =
    manualOpen !== null ? manualOpen : hasSearch ? matchesSearch : false;
  const [loadingChildren, setLoadingChildren] = useState(false);

  const indent = depth ?? 0;

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
        .then((data) => onChildrenFetched(item.id, data as OneDriveItem[]))
        .finally(() => setLoadingChildren(false));
    }
  }, [hasSearch, matchesSearch]);

  const visibleChildren =
    hasSearch && item.children
      ? item.children.filter((c) => itemMatches(c, q))
      : item.children;

  if (hasSearch && !matchesSearch) return null;

  return (
    <>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/20 transition-colors border-b"
        style={{ paddingLeft: `${16 + indent * 16}px` }}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
        <>
          {visibleChildren.length === 0 ? (
            <div
              className="px-4 py-2 text-xs text-muted-foreground border-b"
              style={{ paddingLeft: `${32 + indent * 16}px` }}
            >
              {hasSearch ? "No matches in this folder" : "Empty folder"}
            </div>
          ) : (
            visibleChildren.map((child, i) =>
              child.folder ? (
                <FolderRow
                  key={child.id}
                  item={child}
                  processingId={processingId}
                  addedIds={addedIds}
                  onAdd={onAdd}
                  search={search}
                  onChildrenFetched={onChildrenFetched}
                  depth={indent + 1}
                />
              ) : (
                <div
                  key={child.id}
                  style={{ paddingLeft: `${indent * 16}px` }}
                >
                  <FileRow
                    item={child}
                    processingId={processingId}
                    addedIds={addedIds}
                    onAdd={onAdd}
                    isLast={i === visibleChildren.length - 1 && !visibleChildren.some((c) => c.folder)}
                  />
                </div>
              ),
            )
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function OneDriveListPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const [items, setItems] = useState<OneDriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [hasOneDrive, setHasOneDrive] = useState<boolean | null>(null);

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

  const handleChildrenFetched = (folderId: string, children: OneDriveItem[]) => {
    setItems((prev) => updateChildren(prev, folderId, children));
  };

  const updateChildren = (
    list: OneDriveItem[],
    folderId: string,
    children: OneDriveItem[],
  ): OneDriveItem[] =>
    list.map((item) => {
      if (item.id === folderId) return { ...item, children };
      if (item.children)
        return { ...item, children: updateChildren(item.children, folderId, children) };
      return item;
    });

  if (loading) return <Loading />;

  if (!hasOneDrive) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="overflow-hidden rounded-md border bg-background">
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-medium">No OneDrive account linked</p>
            <p className="text-xs text-muted-foreground">
              Connect your Microsoft account to browse and add files from OneDrive.
            </p>
            <Button>
              <Link to="/user">Link OneDrive</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) return <div>Error: {error}</div>;

  const q = search.toLowerCase();
  const filtered = q ? items.filter((item) => itemMatches(item, q)) : items;
  const folders = filtered.filter((i) => i.folder);
  const files = filtered.filter((i) => !i.folder);
  const allItems = [...folders, ...files];

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 bg-sidebar rounded-lg">
      <SearchFilter
        value={search}
        onChange={setSearch}
        placeholder="Search files..."
      />

      <div className="overflow-hidden rounded-md border bg-background">
        {allItems.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {search ? `No items match "${search}"` : "No files found in your OneDrive."}
          </p>
        ) : (
          <>
            {folders.map((item) => (
              <FolderRow
                key={item.id}
                item={item}
                processingId={processingId}
                addedIds={addedIds}
                onAdd={addToGroup}
                search={search}
                onChildrenFetched={handleChildrenFetched}
                depth={0}
              />
            ))}
            {files.map((item, i) => (
              <FileRow
                key={item.id}
                item={item}
                processingId={processingId}
                addedIds={addedIds}
                onAdd={addToGroup}
                isLast={i === files.length - 1}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}