import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, linkedAccountsApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/card";
import { Button } from "../../components/button";
import { LogOut, Link2, Unlink } from "lucide-react";

interface LinkedAccount {
  id: number;
  provider: string;
  email?: string;
  expiresAt?: string;
}

const ALL_PROVIDERS = [
  {
    id: "microsoft",
    label: "Microsoft / OneDrive",
    icon: "🪟",
    onConnect: () => linkedAccountsApi.redirectToMicrosoft(),
  },
];

export function UserPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<number | null>(null);

  const loadAccounts = async () => {
    try {
      const data = await linkedAccountsApi.list();
      setAccounts(data as LinkedAccount[]);
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleUnlink = async (id: number) => {
    setUnlinkingId(id);
    try {
      await linkedAccountsApi.unlink(id);
      await loadAccounts();
    } finally {
      setUnlinkingId(null);
      setConfirmUnlinkId(null);
    }
  };

  const handleLogout = async () => {
    await authApi.logout();
    setUser(null);
    navigate("/login", { replace: true });
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">

      {/* Profile card */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4">
          <div>
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Log out
          </Button>
        </div>
      </Card>

      {/* Linked accounts */}
      <Card className="overflow-hidden">
        <div className="px-4">
          <p className="text-sm font-semibold">Linked Accounts</p>
        </div>

        {accountsLoading ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="divide-y">
            {ALL_PROVIDERS.map((provider) => {
              const linked = accounts.find(a => a.provider === provider.id);
              return (
                <div key={provider.id} className="flex items-center gap-3 px-4 hover:bg-muted/20 transition-colors">
                  <span className="text-lg shrink-0">{provider.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{provider.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {linked ? (linked.email ?? "Connected") : "Not connected"}
                    </p>
                  </div>
                  {linked ? (
                    confirmUnlinkId === linked.id ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground">Unlink?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={unlinkingId === linked.id}
                          onClick={() => handleUnlink(linked.id)}
                        >
                          {unlinkingId === linked.id ? "..." : "Yes"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirmUnlinkId(null)}>No</Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmUnlinkId(linked.id)}
                      >
                        <Unlink className="h-3.5 w-3.5 mr-1.5" />
                        Unlink
                      </Button>
                    )
                  ) : (
                    <Button size="sm" onClick={provider.onConnect} className="shrink-0">
                      <Link2 className="h-3.5 w-3.5 mr-1.5" />
                      Link
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}