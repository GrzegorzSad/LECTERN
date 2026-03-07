import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { membersApi, groupsApi } from "../../api/client";
import type { Member } from "../../types/types";
import { useGroup } from "./GroupLayout";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/card";
import { Button } from "../../components/button";
import { SearchFilter } from "../../components/search-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/dropdown-menu";
import { MoreHorizontal, LogOut, UserX } from "lucide-react";
import { cn } from "../../lib/utils";

const roleBadgeClass: Record<string, string> = {
  OWNER: "bg-yellow-100 text-yellow-800",
  ADMIN: "bg-blue-100 text-blue-800",
  MEMBER: "bg-muted text-muted-foreground",
};

export function MembersPage() {
  const { id } = useParams();
  const { group, loading, error } = useGroup();
  const { user: currentUser, userLoading } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ memberId: number; type: "kick" | "leave" } | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    membersApi.list(Number(id))
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
        setMembers(prev => prev.filter(m => m.id !== confirmAction.memberId));
      }
    } finally {
      setActingId(null);
      setConfirmAction(null);
    }
  };

  if (loading || membersLoading || userLoading) return <div>Loading...</div>;
  if (error || !group) return <div>Group not found</div>;

  const currentMember = members.find(m => m.userId === currentUser?.id);
  const canKick = currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";

  const filtered = members.filter(m =>
    (m.user?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (m.user?.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchFilter value={search} onChange={setSearch} placeholder="Search members..." />
        </div>
        <Button size="lg" onClick={handleGenerateInvite} disabled={generating}>
          {generating ? "Generating..." : "+ Invite"}
        </Button>
      </div>

      {inviteLink && (
        <Card className="px-4 py-3 flex items-center gap-3">
          <p className="text-sm text-muted-foreground truncate flex-1">{inviteLink}</p>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? "Copied ✓" : "Copy"}
          </Button>
        </Card>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No members match "{search}"
        </p>
      ) : (
        <Card className="overflow-hidden">
          {filtered.map((member) => {
            const isCurrentUser = member.userId === currentUser?.id;
            const isOwner = member.role === "OWNER";
            const showKick = canKick && !isCurrentUser && !isOwner;
            const showLeave = isCurrentUser && !isOwner;
            const showMenu = showKick || showLeave;
            const isConfirming = confirmAction?.memberId === member.id;

            return (
              <div key={member.id} className="group flex items-center gap-3 px-4 hover:bg-muted/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {member.user?.name ?? `User #${member.userId}`}
                    {isCurrentUser && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                    )}
                  </p>
                  {member.user?.email && (
                    <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                  )}
                </div>

                <span className={cn(
                  "text-xs font-semibold px-2 py-1 rounded-full shrink-0",
                  roleBadgeClass[member.role] ?? roleBadgeClass.MEMBER
                )}>
                  {member.role}
                </span>

                {showMenu && (
                  isConfirming ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {confirmAction.type === "leave" ? "Leave group?" : "Remove member?"}
                      </span>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={actingId === member.id}
                        onClick={handleConfirmedAction}
                      >
                        {actingId === member.id ? "..." : "Yes"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmAction(null)}>
                        No
                      </Button>
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="left" align="start">
                        {showLeave && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setConfirmAction({ memberId: member.id, type: "leave" })}
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Leave group
                          </DropdownMenuItem>
                        )}
                        {showKick && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setConfirmAction({ memberId: member.id, type: "kick" })}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Remove member
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}