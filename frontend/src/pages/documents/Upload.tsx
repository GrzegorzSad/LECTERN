import { useParams } from "react-router-dom";
import { useCallback, useState } from "react";
import { documentsApi } from "../../api/client";
import { Card } from "../../components/card";
import { Button } from "../../components/button";
import { UploadCloud, X, CheckCircle, AlertCircle, File } from "lucide-react";

interface UploadFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcon = (mime: string) => {
  if (mime.includes("pdf")) return "📄";
  if (mime.includes("image")) return "🖼️";
  if (mime.includes("text")) return "📝";
  if (mime.includes("word") || mime.includes("document")) return "📃";
  if (mime.includes("sheet") || mime.includes("excel")) return "📊";
  return "📎";
};

export function UploadPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming: FileList | File[]) => {
    const newEntries: UploadFile[] = Array.from(incoming).map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...newEntries]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadFile = async (entry: UploadFile) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === entry.id ? { ...f, status: "uploading" } : f)),
    );
    try {
      const formData = new FormData();
      formData.append("file", entry.file);
      if (groupId) formData.append("groupId", groupId);
      await documentsApi.upload(formData);
      setFiles((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, status: "done" } : f)),
      );
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === entry.id ? { ...f, status: "error", error: err.message } : f,
        ),
      );
    }
  };

  const uploadAll = () => {
    files.filter((f) => f.status === "pending").forEach(uploadFile);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center gap-3 transition-colors cursor-pointer
          ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"}`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <UploadCloud
          className={`h-8 w-8 ${dragging ? "text-primary" : "text-muted-foreground"}`}
        />
        <div className="text-center">
          <p className="text-sm font-medium">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Any file type supported
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            document.getElementById("file-input")?.click();
          }}
        >
          Choose files
        </Button>
        <input
          id="file-input"
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <>
          <Card className="overflow-hidden divide-y">
            {files.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 px-4 py-2 hover:bg-muted/40 transition-colors"
              >
                <span className="text-sm shrink-0">
                  {fileIcon(entry.file.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{entry.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.file.type || "unknown"} ·{" "}
                    {formatSize(entry.file.size)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.status === "error" && (
                    <span title={entry.error}>
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant={entry.status === "done" ? "outline" : "default"}
                    disabled={
                      entry.status === "done" || entry.status === "uploading"
                    }
                    onClick={() => uploadFile(entry)}
                  >
                    {entry.status === "uploading"
                      ? "Uploading..."
                      : entry.status === "done"
                        ? "Uploaded ✓"
                        : "Upload"}
                  </Button>
                  {(entry.status === "pending" || entry.status === "error") && (
                    <button
                      onClick={() => removeFile(entry.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </Card>

          {pendingCount > 1 && (
            <div className="flex justify-end">
              <Button onClick={uploadAll}>Upload all ({pendingCount})</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
