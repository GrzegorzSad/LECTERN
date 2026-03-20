import { useEffect, useState } from "react";
import { Outlet, NavLink, useParams } from "react-router-dom";
import { groupsApi, membersApi } from "../../api/client";
import type { Group } from "../../types/types";
import { useNavbarCenter } from "../../context/NavbarCenterContext";
import { cn } from "../../lib/utils";
import { createContext, useContext } from "react";

type MyRole = "OWNER" | "ADMIN" | "MEMBER" | null;

interface GroupContextType {
  group: Group | null;
  loading: boolean;
  error: boolean;
  myRole: MyRole;
}

const GroupContext = createContext<GroupContextType>({
  group: null,
  loading: true,
  error: false,
  myRole: null,
});

export const useGroup = () => useContext(GroupContext);

const tabs = [
  { label: "Chat", path: "chat" },
  { label: "Data", path: "data" },
  { label: "Members", path: "members" },
];

export function GroupLayout() {
  const { id } = useParams();
  const { setCenter, setTitle } = useNavbarCenter();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [myRole, setMyRole] = useState<MyRole>(null);

  useEffect(() => {
    if (!id) return;
    groupsApi
      .get(Number(id))
      .then(setGroup)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    membersApi
      .getMyRole(Number(id))
      .then((data) => setMyRole(data.role))
      .catch(() => setMyRole(null));
  }, [id]);

  useEffect(() => {
    if (group) setTitle(group.name);
    return () => setTitle(null);
  }, [group]);

  useEffect(() => {
    const isAdmin = myRole === "OWNER" || myRole === "ADMIN";
    const visibleTabs = tabs.filter(
      (tab) => tab.path !== "settings" || isAdmin,
    );

    setCenter(
      <div className="flex gap-1">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={`/group/${id}/${tab.path}`}
            className={({ isActive }) =>
              cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted hover:text-foreground",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>,
    );
    return () => setCenter(null);
  }, [id, setCenter, myRole]);

  return (
    <GroupContext.Provider value={{ group, loading, error, myRole }}>
      <Outlet />
    </GroupContext.Provider>
  );
}