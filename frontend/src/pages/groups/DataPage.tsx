import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { documentsApi, membersApi, BASE_URL } from "../../api/client";
import type { Document, Member } from "../../types/types";
import { Card } from "../../components/card";
import { Button } from "../../components/button";
import { Loading } from "../../components/loading";
import { SearchFilter } from "../../components/search-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from "../../components/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/table";
import { useGroup } from "./GroupLayout";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Cloud,
  HardDriveUpload,
  MoreHorizontal,
  Trash2,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const mimeIcon = (mime: string) => {
  if (mime.includes("pdf")) return "📄";
  if (mime.includes("image")) return "🖼️";
  if (mime.includes("text")) return "📝";
  if (mime.includes("word") || mime.includes("document")) return "📃";
  if (mime.includes("sheet") || mime.includes("excel")) return "📊";
  return "📎";
};

// Augmented row type that carries the resolved uploader name
type FileRow = Document & { uploaderName: string };

// ---------------------------------------------------------------------------
// Sortable column header
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  column,
}: {
  label: string;
  column: {
    getIsSorted: () => false | "asc" | "desc";
    toggleSorting: (asc: boolean) => void;
  };
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      className="flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="h-3 w-3" />
      ) : sorted === "desc" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Add Data dialog
// ---------------------------------------------------------------------------

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

function AddDataDialog({
  groupId,
  onClose,
}: {
  groupId: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  const handleSelect = (source: DataSource) => {
    if (!source.available) return;
    onClose();
    navigate(source.href(groupId));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <Card className="w-96 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Add Data</h2>
            <p className="text-xs text-muted-foreground">
              Choose a source to import files from
            </p>
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
                ${
                  source.available
                    ? "hover:border-primary hover:bg-primary/5 cursor-pointer"
                    : "opacity-40 cursor-not-allowed"
                }
              `}
            >
              <div className="text-muted-foreground">{source.icon}</div>
              <div>
                <p className="text-sm font-medium">{source.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {source.description}
                </p>
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DataPage() {
  const { id } = useParams();
  const { group, loading, error } = useGroup();

  const [files, setFiles] = useState<Document[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([documentsApi.get(Number(id)), membersApi.list(Number(id))])
      .then(([docs, members]) => {
        setFiles(docs as Document[]);
        const nameMap: Record<number, string> = {};
        for (const m of members as Member[]) {
          if (m.user) nameMap[m.userId] = m.user.name;
        }
        setUserNames(nameMap);
      })
      .finally(() => setFilesLoading(false));
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

  // Augment rows with resolved uploader name
  const rows = useMemo<FileRow[]>(
    () =>
      files.map((f) => ({
        ...f,
        uploaderName: userNames[f.userId] ?? `User #${f.userId}`,
      })),
    [files, userNames],
  );

  const columns = useMemo<ColumnDef<FileRow>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => <SortHeader label="Name" column={column} />,
        cell: ({ row }) => (
          <a
            href={`${BASE_URL}/documents/preview/${row.original.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 min-w-0 group/link"
          >
            <span className="text-sm shrink-0">
              {mimeIcon(row.original.mimeType)}
            </span>
            <span className="text-sm font-medium truncate group-hover/link:underline">
              {row.original.name}
            </span>
          </a>
        ),
      },
      {
        id: "uploaderName",
        accessorKey: "uploaderName",
        header: ({ column }) => (
          <SortHeader label="Added by" column={column} />
        ),
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">
            {getValue() as string}
          </span>
        ),
      },
      {
        id: "size",
        accessorKey: "size",
        header: ({ column }) => <SortHeader label="Size" column={column} />,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">
            {formatSize(getValue() as number)}
          </span>
        ),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => <SortHeader label="Date" column={column} />,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(getValue() as string)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const file = row.original;

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-all p-1 rounded">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="left" align="end" className="w-32">
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setConfirmId(file.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [confirmId, deletingId],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      return (
        row.original.name.toLowerCase().includes(search) ||
        row.original.uploaderName.toLowerCase().includes(search)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading || filesLoading) return <Loading />;
  if (error || !group) return <div>Group not found</div>;

  const confirmFile = confirmId ? files.find(f => f.id === confirmId) : null;

  return (
    <>
      <div className="max-w-2xl mx-auto pt-2 space-y-3">
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchFilter
              value={globalFilter}
              onChange={setGlobalFilter}
              placeholder="Search files or users..."
            />
          </div>
          <Button size="lg" onClick={() => setAddDialogOpen(true)}>
            + Add Data
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-md border bg-popover shadow-sm">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="group">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-20 text-center text-sm text-muted-foreground"
                  >
                    {files.length === 0
                      ? "No files yet — add files to get started."
                      : `No files match "${globalFilter}"`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {addDialogOpen && (
          <AddDataDialog
            groupId={group.id}
            onClose={() => setAddDialogOpen(false)}
          />
        )}
      </div>

      <AlertDialog open={!!confirmId} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete file?</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmFile ? `Delete "${confirmFile.name}"?` : "Delete this file?"}
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end pt-4">
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                disabled={deletingId !== null}
                onClick={() => confirmFile && handleDelete(confirmFile)}
              >
                {deletingId !== null ? "..." : "Delete"}
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}