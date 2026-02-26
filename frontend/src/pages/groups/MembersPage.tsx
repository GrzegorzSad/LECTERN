import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { membersApi, groupsApi } from "../../api/client";
import type { Member } from "../../types/types";
import { useGroup } from "./GroupLayout";
import { Card } from "../../components/card";
import { Button } from "../../components/button";
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
      const link = `${window.location.origin}/join/${token}`;
      setInviteLink(link);
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

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Members · {members.length}</h2>
        <Button onClick={handleGenerateInvite} disabled={generating} size="sm">
          {generating ? "Generating..." : "Generate invite link"}
        </Button>
      </div>

      {/* Invite link display */}
      {inviteLink && (
        <Card className="p-4 flex items-center gap-3">
          <p className="text-sm text-muted-foreground truncate flex-1">{inviteLink}</p>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? "Copied ✓" : "Copy"}
          </Button>
        </Card>
      )}

      {/* Members list */}
      <Card className="divide-y">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between px-4 py-3">
            <div>
              {member.user ? (
                <>
                  <p className="font-medium">{member.user.name}</p>
                  <p className="text-sm text-muted-foreground">{member.user.email}</p>
                </>
              ) : (
                <p className="font-medium text-muted-foreground">User #{member.userId}</p>
              )}
            </div>
            <span
              className={cn(
                "text-xs font-semibold px-2 py-1 rounded-full",
                roleBadgeClass[member.role] ?? roleBadgeClass.MEMBER
              )}
            >
              {member.role}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}