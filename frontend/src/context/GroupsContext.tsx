import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { groupsApi, membersApi } from "../api/client";
import type { Group } from "../types/types";
import { useAuth } from "./AuthContext";

interface GroupsContextType {
  groups: Group[];
  myRoles: Record<number, string>;
  addGroup: (group: Group) => void;
  updateGroup: (group: Group) => void;
  removeGroup: (id: number) => void;
}

const GroupsContext = createContext<GroupsContextType>({
  groups: [],
  myRoles: {},
  addGroup: () => {},
  updateGroup: () => {},
  removeGroup: () => {},
});

export const GroupsProvider = ({ children }: { children: ReactNode }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [myRoles, setMyRoles] = useState<Record<number, string>>({});
  const { loggedIn } = useAuth();

  useEffect(() => {
    if (!loggedIn) {
      setGroups([]);
      setMyRoles({});
      return;
    }
    groupsApi.getAll().then((data) => {
      setGroups(data);
      Promise.all(
        data.map((g: Group) =>
          membersApi.getMyRole(g.id).then((r) => ({ id: g.id, role: r.role })).catch(() => ({ id: g.id, role: "MEMBER" }))
        )
      ).then((roles) => {
        const map: Record<number, string> = {};
        roles.forEach((r) => { map[r.id] = r.role; });
        setMyRoles(map);
      });
    }).catch(() => setGroups([]));
  }, [loggedIn]);

  const addGroup = (group: Group) => setGroups((prev) => [...prev, group]);
  const updateGroup = (group: Group) => setGroups((prev) => prev.map((g) => g.id === group.id ? group : g));
  const removeGroup = (id: number) => setGroups((prev) => prev.filter((g) => g.id !== id));

  return (
    <GroupsContext.Provider value={{ groups, myRoles, addGroup, updateGroup, removeGroup }}>
      {children}
    </GroupsContext.Provider>
  );
};

export const useGroups = () => useContext(GroupsContext);