import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { groupsApi } from "../api/client";
import type { Group } from "../types/types";
import { useAuth } from "./AuthContext";

interface GroupsContextType {
  groups: Group[];
  addGroup: (group: Group) => void;
  updateGroup: (group: Group) => void;
  removeGroup: (id: number) => void;
}

const GroupsContext = createContext<GroupsContextType>({
  groups: [],
  addGroup: () => {},
  updateGroup: () => {},
  removeGroup: () => {},
});

export const GroupsProvider = ({ children }: { children: ReactNode }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const { loggedIn } = useAuth();

  useEffect(() => {
    if (!loggedIn) { setGroups([]); return; }
    groupsApi.getAll().then(setGroups).catch(() => setGroups([]));
  }, [loggedIn]);

  const addGroup = (group: Group) => setGroups((prev) => [...prev, group]);
  const updateGroup = (group: Group) => setGroups((prev) => prev.map((g) => g.id === group.id ? group : g));
  const removeGroup = (id: number) => setGroups((prev) => prev.filter((g) => g.id !== id));

  return (
    <GroupsContext.Provider value={{ groups, addGroup, updateGroup, removeGroup }}>
      {children}
    </GroupsContext.Provider>
  );
};

export const useGroups = () => useContext(GroupsContext);