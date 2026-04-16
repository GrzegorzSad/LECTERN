import { useState, useEffect } from "react";
import { X, FileText, Upload, CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { BASE_URL } from "../../api/client";

interface NotesPanelProps {
  open: boolean;
  onClose: () => void;
  groupId: number;
}

type UploadState = "idle" | "uploading" | "done" | "error";

const NOTE_CACHE_KEY = "notes-panel-cache";

export function NotesPanel({ open, onClose, groupId }: NotesPanelProps) {
  const [title, setTitle] = useState(() => {
    const cached = localStorage.getItem(`${NOTE_CACHE_KEY}-title-${groupId}`);
    return cached || "";
  });
  const [content, setContent] = useState(() => {
    const cached = localStorage.getItem(`${NOTE_CACHE_KEY}-content-${groupId}`);
    return cached || "";
  });
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEmpty = !content.trim();

  useEffect(() => {
    localStorage.setItem(`${NOTE_CACHE_KEY}-title-${groupId}`, title);
  }, [title, groupId]);

  useEffect(() => {
    localStorage.setItem(`${NOTE_CACHE_KEY}-content-${groupId}`, content);
  }, [content, groupId]);

  const handleAddAsSource = async () => {
    if (isEmpty) return;
    setUploadState("uploading");
    setErrorMsg(null);
    try {
      const blob = new Blob([content], { type: "text/plain" });
      const filename = `${title.trim() || "note"}.txt`;
      const formData = new FormData();
      formData.append("file", blob, filename);
      formData.append("groupId", String(groupId));

      const res = await fetch(`${BASE_URL}/documents/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        let msg = "Upload failed";
        try {
          const data = await res.json();
          if (data && data.message) msg = data.message;
        } catch {}
        setErrorMsg(msg);
        throw new Error(msg);
      }

      setUploadState("done");
      setTimeout(() => {
        setTitle("");
        setContent("");
        localStorage.removeItem(`${NOTE_CACHE_KEY}-title-${groupId}`);
        localStorage.removeItem(`${NOTE_CACHE_KEY}-content-${groupId}`);
        setUploadState("idle");
        setErrorMsg(null);
      }, 2000);
    } catch (err: any) {
      setUploadState("error");
      if (!errorMsg) setErrorMsg(err?.message || "Upload failed");
      setTimeout(() => {
        setUploadState("idle");
        setErrorMsg(null);
      }, 3500);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col border-l bg-background transition-[width,transform] duration-300 ease-in-out fixed top-0 right-0 h-full z-50 md:relative md:h-auto",
        "overflow-hidden",
        open ? "w-full md:w-1/2 translate-x-0" : "w-0 md:w-0 translate-x-full",
      )}
      style={{ height: "100%" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Notes</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Editor */}
      <div className="flex flex-col flex-1 min-h-0">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="px-4 pt-5 pb-1 text-base font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/30 shrink-0"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing your note..."
          className="flex-1 px-4 py-3 text-sm bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/30 leading-relaxed"
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t shrink-0 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {errorMsg ? (
            <p className="text-xs text-destructive break-words">{errorMsg}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {uploadState === "done"
                ? "Added to group sources ✓"
                : uploadState === "error"
                ? "Upload failed — try again"
                : "Uploads the note as a searchable document"}
            </p>
          )}
        </div>
        <button
          onClick={handleAddAsSource}
          disabled={isEmpty || uploadState === "uploading" || uploadState === "done"}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors shrink-0",
            uploadState === "done"
              ? "bg-green-500/15 text-green-600"
              : isEmpty || uploadState === "uploading"
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {uploadState === "done" ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> Added
            </>
          ) : uploadState === "uploading" ? (
            <>
              <Upload className="h-3.5 w-3.5 animate-bounce" /> Uploading...
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" /> Add as source
            </>
          )}
        </button>
      </div>
    </div>
  );
}