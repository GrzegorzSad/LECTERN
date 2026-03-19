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
import { membersApi, groupsApi } from "../../api/client";
import type { Member } from "../../types/types";
import { useGroup } from "./GroupLayout";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/button";
import { SearchFilter } from "../../components/search-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/table";
import { Loading } from "../../components/loading";
import { Card } from "../../components/card";
import {
  MoreHorizontal,
  LogOut,
  UserX,
  ShieldPlus,
  ShieldMinus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "../../lib/utils";

const roleBadgeClass: Record<string, string> = {
  OWNER: "bg-yellow-100 text-yellow-800",
  ADMIN: "bg-blue-100 text-blue-800",
  MEMBER: "bg-muted text-muted-foreground",
};

export function MembersPage() {
  const { id } = useParams();
  const { group, loading, error, myRole } = useGroup();
  const { user: currentUser, userLoading } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    memberId: number;
    type: "kick" | "leave";
  } | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  const isAdmin = myRole === "OWNER" || myRole === "ADMIN";

  useEffect(() => {
    if (!id) return;
    membersApi
      .list(Number(id))
      .then(setMembers)
      .finally(() => setMembersLoading(false));
  }, [id]);

  const handleGenerateInvite = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const { token } = await groupsApi.generateInvite(Number(id));
      setInviteLink(`${window.location.origin}/join/${token}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmedAction = async () => {
    if (!confirmAction) return;
    setActingId(confirmAction.memberId);
    try {
      await membersApi.remove(confirmAction.memberId);
      if (confirmAction.type === "leave") {
        navigate("/", { replace: true });
      } else {
        setMembers((prev) =>
          prev.filter((m) => m.id !== confirmAction.memberId),
        );
      }
    } finally {
      setActingId(null);
      setConfirmAction(null);
    }
  };

  const handleToggleAdmin = async (member: Member) => {
    const newRole = member.role === "ADMIN" ? "MEMBER" : "ADMIN";
    try {
      await membersApi.updateRole(member.id, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)),
      );
    } catch (err) {
      console.error("Role update failed:", err);
    }
  };

  const currentMember = members.find((m) => m.userId === currentUser?.id);
  const canKick =
    currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";

  const columns = useMemo<ColumnDef<Member>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.user?.name ?? `User #${row.userId}`,
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-40" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const member = row.original;
          const isCurrentUser = member.userId === currentUser?.id;
          return (
            <div>
              <p className="text-sm font-semibold truncate">
                {member.user?.name ?? `User #${member.userId}`}
                {isCurrentUser && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    (you)
                  </span>
                )}
              </p>
              {member.user?.email && (
                <p className="text-xs text-muted-foreground truncate">
                  {member.user.email}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "role",
        accessorKey: "role",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Role
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-40" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const role = row.original.role;
          return (
            <span
              className={cn(
                "text-xs font-semibold px-2 py-1 rounded-full",
                roleBadgeClass[role] ?? roleBadgeClass.MEMBER,
              )}
            >
              {role}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const member = row.original;
          const isCurrentUser = member.userId === currentUser?.id;
          const isOwner = member.role === "OWNER";
          const showKick = canKick && !isCurrentUser && !isOwner;
          const showLeave = isCurrentUser && !isOwner;
          const showRoleToggle = isAdmin && !isCurrentUser && !isOwner;
          const showMenu = showKick || showLeave || showRoleToggle;
          const isConfirming = confirmAction?.memberId === member.id;

          if (!showMenu) return null;

          if (isConfirming) {
            return (
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-xs text-muted-foreground">
                  {confirmAction.type === "leave"
                    ? "Leave group?"
                    : "Remove member?"}
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={actingId === member.id}
                  onClick={handleConfirmedAction}
                >
                  {actingId === member.id ? "..." : "Yes"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmAction(null)}
                >
                  No
                </Button>
              </div>
            );
          }

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="left" align="start">
                  {showRoleToggle && (
                    <DropdownMenuItem onClick={() => handleToggleAdmin(member)}>
                      {member.role === "ADMIN" ? (
                        <>
                          <ShieldMinus className="h-4 w-4 mr-2" />
                          Remove Admin
                        </>
                      ) : (
                        <>
                          <ShieldPlus className="h-4 w-4 mr-2" />
                          Make Admin
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  {showLeave && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() =>
                        setConfirmAction({ memberId: member.id, type: "leave" })
                      }
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave group
                    </DropdownMenuItem>
                  )}
                  {showKick && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() =>
                        setConfirmAction({ memberId: member.id, type: "kick" })
                      }
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Remove member
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canKick, isAdmin, confirmAction, actingId, currentUser?.id],
  );

  const table = useReactTable({
    data: members,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue) => {
      const name = (row.original.user?.name ?? "").toLowerCase();
      const email = (row.original.user?.email ?? "").toLowerCase();
      const search = filterValue.toLowerCase();
      return name.includes(search) || email.includes(search);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading || membersLoading || userLoading) return <Loading />;
  if (error || !group) return <div>Group not found</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 bg-sidebar rounded-lg">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchFilter
            value={globalFilter}
            onChange={setGlobalFilter}
            placeholder="Search members..."
          />
        </div>
        <Button size="lg" onClick={handleGenerateInvite} disabled={generating}>
          {generating ? "Generating..." : "+ Invite"}
        </Button>
      </div>

      {inviteLink && (
        <Card className="px-4 py-3 flex items-center gap-3">
          <p className="text-sm text-muted-foreground truncate flex-1">
            {inviteLink}
          </p>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? "Copied ✓" : "Copy"}
          </Button>
        </Card>
      )}

      <div className="overflow-hidden rounded-md border bg-background">
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
                <TableRow key={row.id}>
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
                  No members match &quot;{globalFilter}&quot;
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
