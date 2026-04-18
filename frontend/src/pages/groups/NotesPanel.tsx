import { useState, useEffect, useRef, useCallback } from "react";
import { X, FileText, Upload, CheckCircle2, Bold, Italic, Heading1, Heading2, List, Code } from "lucide-react";
import { cn } from "../../lib/utils";
import { BASE_URL } from "../../api/client";

import { Plate, usePlateEditor, PlateContent, type PlateEditor } from "platejs/react";
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
import { BulletedListPlugin, NumberedListPlugin, ListItemPlugin } from "@platejs/list-classic/react";
import { toggleList } from "@platejs/list-classic";
import { MarkdownPlugin } from "@platejs/markdown";

interface NotesPanelProps {
  open: boolean;
  onClose: () => void;
  groupId: number;
}

type UploadState = "idle" | "uploading" | "done" | "error";

const NOTE_CACHE_KEY = "notes-panel-cache";


function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // prevent editor losing focus
        onClick();
      }}
      className={cn(
        "rounded p-1 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function NotesPanel({ open, onClose, groupId }: NotesPanelProps) {
  const [title, setTitle] = useState(() => {
    return localStorage.getItem(`${NOTE_CACHE_KEY}-title-${groupId}`) || "";
  });
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // We need a ref to the editor to serialize on upload
  const editorRef = useRef<ReturnType<typeof usePlateEditor> | null>(null);

  const plugins = [
    BoldPlugin,
    ItalicPlugin,
    UnderlinePlugin,
    StrikethroughPlugin,
    CodePlugin,
    H1Plugin,
    H2Plugin,
    H3Plugin,
    BlockquotePlugin,
    BulletedListPlugin,
    NumberedListPlugin,
    ListItemPlugin,
    MarkdownPlugin,
  ];

  const editor = usePlateEditor({
    plugins,
    // Initial value is loaded after mount via useEffect (needs editor.api.markdown)
  });

  // Store editor in ref for access inside callbacks
  editorRef.current = editor;

  // Load cached markdown value after mount
  useEffect(() => {
    const cached = localStorage.getItem(`${NOTE_CACHE_KEY}-content-${groupId}`);
    if (cached && editorRef.current) {
      try {
        const value = editorRef.current.api.markdown.deserialize(cached);
        editorRef.current.tf.setValue(value);
      } catch {
        // ignore parse errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Persist title
  useEffect(() => {
    localStorage.setItem(`${NOTE_CACHE_KEY}-title-${groupId}`, title);
  }, [title, groupId]);

  const handleChange = useCallback(
    ({ value }: { editor: PlateEditor; value: Value }) => {
      // Check emptiness: all top-level nodes are empty paragraphs
      const hasContent = value.some((node: any) => {
        const text = node.children?.map((c: any) => c.text ?? "").join("") ?? "";
        return text.trim().length > 0;
      });
      setIsEmpty(!hasContent);

      // Serialize to markdown and cache
      if (editorRef.current) {
        try {
          const md = editorRef.current.api.markdown.serialize();
          localStorage.setItem(`${NOTE_CACHE_KEY}-content-${groupId}`, md);
        } catch {
          // ignore
        }
      }
    },
    [groupId],
  );

  const handleAddAsSource = async () => {
    if (isEmpty || !editorRef.current) return;

    setUploadState("uploading");
    setErrorMsg(null);

    let markdownContent = "";
    try {
      markdownContent = editorRef.current.api.markdown.serialize();
    } catch {
      markdownContent = "";
    }

    const filename = `${title.trim() || "note"}.md`;

    try {
      const blob = new Blob([markdownContent], { type: "text/markdown" });
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
          if (data?.message) msg = data.message;
        } catch {}
        setErrorMsg(msg);
        throw new Error(msg);
      }

      setUploadState("done");
      setTimeout(() => {
        setTitle("");
        editorRef.current?.tf.setValue([{ type: "p", children: [{ text: "" }] }]);
        localStorage.removeItem(`${NOTE_CACHE_KEY}-title-${groupId}`);
        localStorage.removeItem(`${NOTE_CACHE_KEY}-content-${groupId}`);
        setUploadState("idle");
        setErrorMsg(null);
        setIsEmpty(true);
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

      {/* Title input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="px-4 pt-5 pb-1 text-base font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/30 shrink-0"
      />

      {/* Formatting toolbar */}
      <div className="flex items-center gap-0.5 px-3 pb-1 shrink-0 border-b">
        <ToolbarButton
          title="Bold (⌘B)"
          onClick={() => editor.tf.bold?.toggle()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic (⌘I)"
          onClick={() => editor.tf.italic?.toggle()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 1"
          onClick={() => editor.tf.h1?.toggle()}
        >
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          onClick={() => editor.tf.h2?.toggle()}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          onClick={() => toggleList(editor, { type: BulletedListPlugin.key })}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Inline code"
          onClick={() => editor.tf.code?.toggle()}
        >
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Plate editor */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        <Plate editor={editor} onChange={handleChange as any}>
          <PlateContent
            className={cn(
              "flex-1 px-4 py-3 text-sm bg-transparent border-none outline-none resize-none leading-relaxed min-h-full",
              // Basic prose styles for headings, bold, etc.
              "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-1",
              "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-1",
              "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-0.5",
              "[&_strong]:font-semibold",
              "[&_em]:italic",
              "[&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
              "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:text-xs [&_code]:font-mono",
              "[&_ul]:list-disc [&_ul]:pl-5",
              "[&_ol]:list-decimal [&_ol]:pl-5",
            )}
            placeholder="Start writing your note..."
            spellCheck
          />
        </Plate>
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
                  : "Saves as a Markdown (.md) file"}
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