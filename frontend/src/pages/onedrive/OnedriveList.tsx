import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { oneDriveApi, documentsApi } from "../../api/client";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

interface OneDriveItem {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  folder?: { childCount: number };
  file?: { mimeType: string };
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

export function OneDriveListPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const [items, setItems] = useState<OneDriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    oneDriveApi
      .listFiles()
      .then(setItems as any)
      .catch((err) => setError(err.message))
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

  if (loading) return <div>Loading OneDrive files...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="">
      <div>
        <h1 className="text-xl font-bold">OneDrive</h1>
        <p className="text-sm text-muted-foreground">{items.length} items</p>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No files found in your OneDrive.
        </Card>
      ) : (
        <Card className="divide-y">
          {items.map((item) => {
            const isAdded = addedIds.has(item.id);
            const isProcessing = processingId === item.id;
            const isFolder = !!item.folder;

            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{mimeIcon(item)}</span>
                <div className="flex-1 min-w-0">
                  <a
                    href={item.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline truncate block"
                  >
                    {item.name}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {isFolder
                      ? `${item.folder!.childCount} items`
                      : item.file?.mimeType}{" "}
                    {!isFolder && `· ${formatSize(item.size)}`}
                  </p>
                </div>
                {!isFolder && (
                  <Button
                    size="sm"
                    variant={isAdded ? "outline" : "default"}
                    disabled={isAdded || isProcessing}
                    onClick={() => addToGroup(item)}
                  >
                    {isProcessing ? "Adding..." : isAdded ? "Added ✓" : "Add"}
                  </Button>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}