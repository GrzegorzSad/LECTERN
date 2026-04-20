import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  X,
  FileText,
  Upload,
  CheckCircle2,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Code,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { BASE_URL } from "../../api/client";

import {
  Plate,
  usePlateEditor,
  PlateContent,
  type PlateEditor,
} from "platejs/react";
import type { Value } from "platejs";
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  BlockquotePlugin,
} from "@platejs/basic-nodes/react";
import {
  BulletedListPlugin,
  NumberedListPlugin,
  ListItemPlugin,
} from "@platejs/list-classic/react";
import { toggleList } from "@platejs/list-classic";
import { MarkdownPlugin } from "@platejs/markdown";
import { Button } from "../../components/button";

interface NotesPanelProps {
  open: boolean;
  onClose: () => void;
  groupId: number;
  previewUrl?: string;
  fileId?: number;
  fileName?: string;
  onExitEditMode?: () => void;
}

type UploadState = "idle" | "uploading" | "done" | "error";

const NOTE_CACHE_KEY = "notes-panel-cache";
const NOTE_METADATA_KEY = "notes-panel-metadata";

const stripExtension = (name: string) => name.replace(/\.[^/.]+$/, "");

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "rounded p-1 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

export function NotesPanel({
  open,
  onClose,
  groupId,
  previewUrl,
  fileId,
  fileName,
  onExitEditMode,
}: NotesPanelProps) {
  // --- Persisted Metadata State ---
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [editingFileName, setEditingFileName] = useState<string | undefined>(undefined);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | undefined>(undefined);

  const isEditing = !!editingFileId;

  // --- UI State ---
  const [title, setTitle] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [locked, setLocked] = useState(false);

  // --- Editor Setup ---
  const plugins = useMemo(() => [
    BoldPlugin, ItalicPlugin, UnderlinePlugin, StrikethroughPlugin,
    CodePlugin, H1Plugin, H2Plugin, H3Plugin, BlockquotePlugin,
    BulletedListPlugin, NumberedListPlugin, ListItemPlugin,
    MarkdownPlugin,
  ], []);

  const editor = usePlateEditor({ 
    plugins,
    value: [{ type: "p", children: [{ text: "" }] }] 
  });

  // 1. Sync Props to State: Detects if we are switching to a DIFFERENT file
  useEffect(() => {
    const isNewFileProps = fileId !== undefined && fileId !== editingFileId;

    if (isNewFileProps) {
      // OVERWRITE cache because we have moved to a specific new file
      const meta = { fileId, fileName, previewUrl };
      localStorage.setItem(`${NOTE_METADATA_KEY}-${groupId}`, JSON.stringify(meta));
      
      // Clear specific content cache so the loader is forced to fetch the new file
      localStorage.removeItem(`${NOTE_CACHE_KEY}-content-${groupId}`);
      localStorage.removeItem(`${NOTE_CACHE_KEY}-title-${groupId}`);

      setEditingFileId(fileId!);
      setEditingFileName(fileName);
      setActivePreviewUrl(previewUrl);
    } else if (!editingFileId) {
      // Fallback: Restore session from localStorage if no props but group matches
      const cachedMeta = localStorage.getItem(`${NOTE_METADATA_KEY}-${groupId}`);
      if (cachedMeta) {
        const parsed = JSON.parse(cachedMeta);
        setEditingFileId(parsed.fileId);
        setEditingFileName(parsed.fileName);
        setActivePreviewUrl(parsed.previewUrl);
      }
    }
  }, [groupId, fileId, fileName, previewUrl, editingFileId]);

  // 2. Load Content into Editor
  useEffect(() => {
    let cancelled = false;

    const loadContent = async () => {
      if (!editor) return;

      setLoadingFile(true);
      try {
        let contentToSet = "";
        let titleToSet = "";

        const cachedContent = localStorage.getItem(`${NOTE_CACHE_KEY}-content-${groupId}`);
        const cachedTitle = localStorage.getItem(`${NOTE_CACHE_KEY}-title-${groupId}`);

        if (isEditing && activePreviewUrl) {
          if (cachedContent) {
            contentToSet = cachedContent;
            titleToSet = cachedTitle || (editingFileName ? stripExtension(editingFileName) : "");
          } else {
            const res = await fetch(activePreviewUrl);
            contentToSet = await res.text();
            titleToSet = editingFileName ? stripExtension(editingFileName) : "";
          }
        } else {
          // Normal Note Mode
          contentToSet = cachedContent || "";
          titleToSet = cachedTitle || "";
        }

        if (!cancelled) {
          setTitle(titleToSet);
          // Ensure we provide at least a space to avoid Plate empty-node issues
          const nodes = editor.api.markdown.deserialize(contentToSet || " ");
          editor.tf.setValue(nodes);
        }
      } catch (err) {
        console.error("Failed to load content", err);
      } finally {
        if (!cancelled) setLoadingFile(false);
      }
    };

    loadContent();
    return () => { cancelled = true; };
  }, [groupId, activePreviewUrl, isEditing, editor, editingFileName, editingFileId]);

  const clearPersistence = useCallback(() => {
    localStorage.removeItem(`${NOTE_METADATA_KEY}-${groupId}`);
    localStorage.removeItem(`${NOTE_CACHE_KEY}-content-${groupId}`);
    localStorage.removeItem(`${NOTE_CACHE_KEY}-title-${groupId}`);
  }, [groupId]);

  const exitEditMode = () => {
    clearPersistence();
    setEditingFileId(null);
    setEditingFileName(undefined);
    setActivePreviewUrl(undefined);
    onExitEditMode?.();
    setTitle("");
    editor.tf.setValue([{ type: "p", children: [{ text: "" }] }]);
  };

  const handleChange = useCallback(({ value }: { value: Value }) => {
    const hasContent = value.some((node: any) => 
      node.children?.some((c: any) => c.text?.trim().length > 0)
    );
    setIsEmpty(!hasContent);

    if (editor) {
      const md = editor.api.markdown.serialize();
      localStorage.setItem(`${NOTE_CACHE_KEY}-content-${groupId}`, md);
    }
  }, [groupId, editor]);

  // Keep title synced to storage
  useEffect(() => {
    localStorage.setItem(`${NOTE_CACHE_KEY}-title-${groupId}`, title);
  }, [title, groupId]);

  const handleAddAsSource = async () => {
    if (isEmpty || !editor || locked) return;

    setLocked(true);
    setUploadState("uploading");
    setErrorMsg(null);

    try {
      const markdownContent = editor.api.markdown.serialize();
      const filename = `${title.trim() || "note"}.md`;

      if (isEditing && editingFileId) {
        await fetch(`${BASE_URL}/documents/${editingFileId}`, {
          method: "DELETE",
          credentials: "include",
        });
      }

      const formData = new FormData();
      formData.append("file", new Blob([markdownContent], { type: "text/markdown" }), filename);
      formData.append("groupId", String(groupId));

      const res = await fetch(`${BASE_URL}/documents/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      setUploadState("done");

      setTimeout(() => {
        clearPersistence();
        setEditingFileId(null);
        setEditingFileName(undefined);
        setActivePreviewUrl(undefined);
        setTitle("");
        editor.tf.setValue([{ type: "p", children: [{ text: "" }] }]);
        setUploadState("idle");
        setIsEmpty(true);
        setLocked(false);
      }, 1500);
    } catch (err: any) {
      setUploadState("error");
      setErrorMsg(err.message);
      setTimeout(() => { setUploadState("idle"); setLocked(false); }, 3000);
    }
  };

  return (
    <div className={cn(
      "flex flex-col border-l bg-background transition-[width,transform] duration-300 ease-in-out fixed top-0 right-0 h-full z-50 md:relative",
      open ? "w-full md:w-1/2 translate-x-0" : "w-0 md:w-0 translate-x-full",
      "overflow-hidden"
    )}>
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">
            {isEditing ? (
              <Button variant="outline" size="sm" onClick={exitEditMode} className="h-7 gap-1">
                Exit Edit Mode <X className="h-3 w-3" />
              </Button>
            ) : "Notes"}
          </span>
        </div>
        <button onClick={onClose}><X className="h-4 w-4" /></button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="px-4 pt-5 pb-1 text-base font-semibold bg-transparent outline-none shrink-0"
      />

      <div className="flex items-center gap-1 px-3 pb-1 border-b shrink-0">
        <ToolbarButton title="Bold" onClick={() => editor.tf.bold?.toggle()}><Bold className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => editor.tf.italic?.toggle()}><Italic className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton title="H1" onClick={() => editor.tf.h1?.toggle()}><Heading1 className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton title="H2" onClick={() => editor.tf.h2?.toggle()}><Heading2 className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton title="List" onClick={() => toggleList(editor, { type: BulletedListPlugin.key })}><List className="h-3.5 w-3.5" /></ToolbarButton>
        <ToolbarButton title="Code" onClick={() => editor.tf.code?.toggle()}><Code className="h-3.5 w-3.5" /></ToolbarButton>
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        <Plate editor={editor} onChange={handleChange as any}>
          <PlateContent className="flex-1 px-4 py-3 text-sm min-h-full outline-none" />
        </Plate>
      </div>

      <div className="px-4 py-3 border-t flex justify-between items-center shrink-0">
        <div className="text-xs text-muted-foreground">
          {loadingFile ? "Loading..." : isEditing ? "Editing source" : "New note"}
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleAddAsSource}
            disabled={isEmpty || uploadState === "uploading" || uploadState === "done"}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              uploadState === "done" ? "bg-green-500/15 text-green-600" : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {uploadState === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
            {uploadState === "done" ? "Added" : uploadState === "uploading" ? "Uploading..." : isEditing ? "Update source" : "Add as source"}
          </button>
          {errorMsg && <p className="text-[10px] text-destructive">{errorMsg}</p>}
        </div>
      </div>
    </div>
  );
}