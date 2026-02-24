import { useEffect, useState } from "react";
import { Outlet, NavLink, useParams } from "react-router-dom";
import { groupsApi } from "../../api/client";
import type { Group } from "../../types/types";
import { useNavbarCenter } from "../../context/NavbarCenterContext";
import { cn } from "../../lib/utils";

// Shared group context so child pages don't need to re-fetch
import { createContext, useContext } from "react";

interface GroupContextType {
  group: Group | null;
  loading: boolean;
  error: boolean;
}

const GroupContext = createContext<GroupContextType>({
  group: null,
  loading: true,
  error: false,
});

export const useGroup = () => useContext(GroupContext);

const tabs = [
  { label: "Chat", path: "chat" },
  { label: "Data", path: "data" },
  { label: "Members", path: "members" },
];

export function GroupLayout() {
  const { id } = useParams();
  const { setCenter } = useNavbarCenter();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    groupsApi.get(Number(id)).then(setGroup).catch(() => setError(true)).finally(() => setLoading(false));
  }, [id]);

  // Inject tab buttons into the navbar center slot
  useEffect(() => {
    setCenter(
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={`/group/${id}/${tab.path}`}
            className={({ isActive }) =>
              cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    );

    // Clean up when leaving group pages
    return () => setCenter(null);
  }, [id, setCenter]);

  return (
    <GroupContext.Provider value={{ group, loading, error }}>
      <Outlet />
    </GroupContext.Provider>
  );
}