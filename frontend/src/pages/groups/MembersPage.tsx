import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { membersApi, groupsApi } from "../../api/client";
import type { Member } from "../../types/types";
import { useGroup } from "./GroupLayout";
import { Card } from "../../components/card";
import { Button } from "../../components/button";
import { SearchFilter } from "../../components/search-filter";
import { cn } from "../../lib/utils";

const roleBadgeClass: Record<string, string> = {
  OWNER: "bg-yellow-100 text-yellow-800",
  ADMIN: "bg-blue-100 text-blue-800",
  MEMBER: "bg-muted text-muted-foreground",
};

export function MembersPage() {
  const { id } = useParams();
  const { group, loading, error } = useGroup();
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

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

  if (loading || membersLoading) return <div>Loading...</div>;
  if (error || !group) return <div>Group not found</div>;

  const filtered = members.filter(m =>
    (m.user?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (m.user?.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
      {/* Search + invite button */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchFilter value={search} onChange={setSearch} placeholder="Search members..." />
        </div>
        <Button size="lg" onClick={handleGenerateInvite} disabled={generating}>
          {generating ? "Generating..." : "+ Invite"}
        </Button>
      </div>

      {/* Invite link */}
      {inviteLink && (
        <Card className="px-4 py-3 flex items-center gap-3">
          <p className="text-sm text-muted-foreground truncate flex-1">{inviteLink}</p>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? "Copied ✓" : "Copy"}
          </Button>
        </Card>
      )}

      {/* Members */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No members match "{search}"
        </p>
      ) : (
        <Card className="overflow-hidden divide-y">
          {filtered.map((member) => (
            <div key={member.id} className="flex items-center gap-3 px-4 hover:bg-muted/20 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {member.user?.name ?? `User #${member.userId}`}
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
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}