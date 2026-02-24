import { useState } from "react";
import { ScrollArea } from "./scroll-area";
import { Card, CardHeader, CardTitle } from "./card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./context-menu";
import type { Group } from "../../types/types";
import { useNavigate } from "react-router-dom";
import { Button } from "./button";
import { cn } from "../../lib/utils";
import { groupsApi } from "../../api/client";
import { useGroups } from "../../context/GroupsContext";

type DialogMode = "create" | "edit";

export function GroupList({ groups }: { groups: Group[] }) {
  const navigate = useNavigate();
  const { addGroup, updateGroup, removeGroup } = useGroups();
  const [selectedId, setSelectedId] = useState<number | undefined>();

  // Shared dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupImg, setGroupImg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClick = (group: Group) => {
    setSelectedId(group.id);
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
      <ScrollArea className="rounded-md">
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <ContextMenu key={group.id}>
              <ContextMenuTrigger>
                <Card
                  className={cn(
                    "cursor-pointer transition hover:shadow-md bg-transparent ring-0 shadow-none",
                    selectedId === group.id && "ring-2 ring-primary bg-primary text-secondary",
                  )}
                  onClick={() => handleClick(group)}
                >
                  {group.img && (
                    <img
                      src={group.img}
                      alt={group.name}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <CardHeader>
                    <CardTitle>{group.name}</CardTitle>
                  </CardHeader>
                </Card>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleClick(group)}>
                  Open
                </ContextMenuItem>
                <ContextMenuItem onClick={() => openEditDialog(group)}>
                  Edit
                </ContextMenuItem>
                <ContextMenuItem
                  className="text-destructive"
                  onClick={() => handleDelete(group)}
                >
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
        <div className="p-4 pt-4">
          <Button className="w-full" variant="outline" onClick={openCreateDialog}>
            + New Group
          </Button>
        </div>
      </ScrollArea>

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
              <Button onClick={handleSubmit} disabled={!groupName.trim() || submitting}>
                {submitting
                  ? dialogMode === "create" ? "Creating..." : "Saving..."
                  : dialogMode === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}