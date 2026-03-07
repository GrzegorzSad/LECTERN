import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Group } from "../types/types";
import { groupsApi } from "../api/client";
import { useGroups } from "../context/GroupsContext";
import { cn } from "../lib/utils";
import { useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  //SidebarGroupAction,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "./sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

import { Card } from "./card";
import { Button } from "./button";
import { MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";

type DialogMode = "create" | "edit";

export function GroupList({ groups }: { groups: Group[] }) {
  const navigate = useNavigate();
  const { addGroup, updateGroup, removeGroup } = useGroups();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const selectedId = (() => {
    const match = location.pathname.match(/\/group\/(\d+)/);
    return match ? Number(match[1]) : undefined;
  })();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupImg, setGroupImg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClick = (group: Group) => {
    navigate(`/group/${group.id}`);
  };

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditingGroup(null);
    setGroupName("");
    setGroupImg("");
    setDialogOpen(true);
  };

  const openEditDialog = (group: Group) => {
    setDialogMode("edit");
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupImg(group.img ?? "");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setGroupName("");
    setGroupImg("");
    setEditingGroup(null);
  };

  const handleSubmit = async () => {
    if (!groupName.trim()) return;
    setSubmitting(true);
    try {
      if (dialogMode === "create") {
        const newGroup = await groupsApi.create({
          name: groupName.trim(),
          img: groupImg.trim() || undefined,
        });
        addGroup(newGroup);
        closeDialog();
        navigate(`/group/${newGroup.id}`);
      } else if (editingGroup) {
        const updated = await groupsApi.update(editingGroup.id, {
          name: groupName.trim(),
          img: groupImg.trim() || undefined,
        });
        updateGroup(updated);
        closeDialog();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (group: Group) => {
    await groupsApi.remove(group.id);
    removeGroup(group.id);
    if (selectedId === group.id) navigate("/");
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="flex flex-row items-center justify-between px-2 py-2">
          {!isCollapsed && (
            <span className="text-md font-semibold">LECTERN</span>
          )}
          <SidebarTrigger />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            {!isCollapsed && <SidebarGroupLabel>Groups</SidebarGroupLabel>}
            {/* <SidebarGroupAction title="New Group" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
            </SidebarGroupAction> */}

            <SidebarMenu>
              {groups.map((group) => (
                <SidebarMenuItem key={group.id}>
                  <SidebarMenuButton
                    isActive={selectedId === group.id}
                    onClick={() => handleClick(group)}
                    tooltip={group.name}
                    className={cn(
                      "gap-3",
                      selectedId === group.id
                        ? "bg-primary! text-primary-foreground! hover:bg-primary! hover:text-primary-foreground!"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    {group.img ? (
                      <img
                        src={group.img}
                        alt={group.name}
                        className="h-6 w-6 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                        {group.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="truncate">{group.name}</span>
                  </SidebarMenuButton>

                  {!isCollapsed && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction
                          showOnHover
                          className={cn(
                            selectedId === group.id
                              ? "text-primary-foreground! hover:bg-primary/80! hover:text-primary-foreground!"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          )}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start">
                        <DropdownMenuItem onClick={() => openEditDialog(group)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(group)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {!isCollapsed && (
          <SidebarFooter className="p-2">
            <Button
              variant="sidebar"
              className="w-full"
              size="sm"
              onClick={openCreateDialog}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Group
            </Button>
          </SidebarFooter>
        )}
      </Sidebar>

      {/* Create / Edit dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="p-6 w-80 space-y-4">
            <h2 className="text-lg font-semibold">
              {dialogMode === "create" ? "New Group" : "Edit Group"}
            </h2>
            <input
              autoFocus
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Group name"
              className="w-full border rounded px-3 py-2"
            />
            <input
              value={groupImg}
              onChange={(e) => setGroupImg(e.target.value)}
              placeholder="Image URL (optional)"
              className="w-full border rounded px-3 py-2"
            />
            {groupImg.trim() && (
              <img
                src={groupImg.trim()}
                alt="Preview"
                className="w-full h-32 object-cover rounded-md"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!groupName.trim() || submitting}
              >
                {submitting
                  ? dialogMode === "create"
                    ? "Creating..."
                    : "Saving..."
                  : dialogMode === "create"
                    ? "Create"
                    : "Save"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
