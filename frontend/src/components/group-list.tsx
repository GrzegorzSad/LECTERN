import { useState, useEffect, useRef } from "react";
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
import { MoreHorizontal, Plus, Pencil, Settings } from "lucide-react";
import { Link } from "react-router-dom";

type DialogMode = "create" | "edit";

export function GroupList({ groups }: { groups: Group[] }) {
  const navigate = useNavigate();
  const { addGroup, updateGroup } = useGroups();
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
  const [groupImgFile, setGroupImgFile] = useState<File | null>(null);
  const [groupImgPreview, setGroupImgPreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { myRoles } = useGroups();

  const handleClick = (group: Group) => {
    navigate(`/group/${group.id}`);
  };

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditingGroup(null);
    setGroupName("");
    setGroupImgFile(null);
    setGroupImgPreview("");
    setDialogOpen(true);
  };

  useEffect(() => {
    const handler = () => openCreateDialog();
    window.addEventListener("open-create-group-dialog", handler);
    return () =>
      window.removeEventListener("open-create-group-dialog", handler);
  }, []);

  const openEditDialog = (group: Group) => {
    setDialogMode("edit");
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupImgFile(null);
    setGroupImgPreview(group.img ?? "");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setGroupName("");
    setGroupImgFile(null);
    setGroupImgPreview("");
    setEditingGroup(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGroupImgFile(file);
    setGroupImgPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!groupName.trim()) return;
    setSubmitting(true);
    try {
      if (dialogMode === "create") {
        const newGroup = await groupsApi.create({ name: groupName.trim() });
        if (groupImgFile) {
          const updated = await groupsApi.uploadImage(
            newGroup.id,
            groupImgFile,
          );
          addGroup(updated);
        } else {
          addGroup(newGroup);
        }
        closeDialog();
        navigate(`/group/${newGroup.id}`);
      } else if (editingGroup) {
        const updated = await groupsApi.update(editingGroup.id, {
          name: groupName.trim(),
        });

        if (groupImgFile) {
          const withImg = await groupsApi.uploadImage(
            editingGroup.id,
            groupImgFile,
          );
          updateGroup(withImg);
        } else if (!groupImgPreview && editingGroup.img) {
          const withImg = await groupsApi.uploadImage(
            editingGroup.id,
            undefined,
          );
          updateGroup(withImg);
        } else {
          updateGroup(updated);
        }
        closeDialog();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="flex flex-row items-center justify-between px-2 py-2">
          {!isCollapsed && (
            <Link to="/">
              <span className="text-md font-semibold">LECTERN</span>
            </Link>
          )}
          <SidebarTrigger />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            {!isCollapsed && <SidebarGroupLabel>Groups</SidebarGroupLabel>}

            <SidebarMenu>
              {groups.map((group) => {
                const isAdmin =
                  myRoles[group.id] === "OWNER" ||
                  myRoles[group.id] === "ADMIN";
                return (
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

                    {!isCollapsed && isAdmin && (
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
                          <DropdownMenuItem
                            onClick={() => openEditDialog(group)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/group/${group.id}/settings`)
                            }
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </SidebarMenuItem>
                );
              })}
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

            {/* Group name */}
            <div className="space-y-1">
              <label htmlFor="group-name" className="text-sm font-medium">
                Group name
              </label>
              <input
                id="group-name"
                autoFocus
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Enter group name"
                className="w-full border rounded px-3 py-2 bg-white text-black"
              />
            </div>

            {/* Image upload */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Image (optional)</label>
              <div
                className="w-full h-28 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden relative"
                onClick={() => fileInputRef.current?.click()}
              >
                {groupImgPreview ? (
                  <img
                    src={groupImgPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground pointer-events-none">
                    <Plus className="h-5 w-5" />
                    <span className="text-xs">Click to upload</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {groupImgPreview && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGroupImgFile(null);
                    setGroupImgPreview("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Remove image
                </button>
              )}
            </div>

            {/* Actions */}
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
