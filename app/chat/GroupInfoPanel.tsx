"use client";

import React, { useMemo, useState } from "react";
import {
  Check,
  Crown,
  Loader2,
  LogOut,
  Pencil,
  Save,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { PremiumAvatar } from "../components/premium-ui";
import { User } from "../types/socket";

export type GroupInfoMember = {
  id: string;
  name: string;
  avatar?: string;
  role: "admin" | "member";
  isYou?: boolean;
};

export type GroupInfoData = {
  id: string;
  conversationId: string;
  name: string;
  memberIds: string[];
  memberCount: number;
  adminIds: string[];
  createdBy?: string | null;
  isGroupOwner?: boolean;
  isGroupAdmin?: boolean;
  subtitle?: string | null;
};

interface GroupInfoPanelProps {
  isOpen: boolean;
  isMobile: boolean;
  selectedGroup: User | null;
  group: GroupInfoData | null;
  members: GroupInfoMember[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  eligibleUsers: User[];
  onClose: () => void;
  onAddMembers: (memberIds: string[]) => Promise<void> | void;
  onRenameGroup: (name: string) => Promise<void> | void;
  onRemoveMember: (member: GroupInfoMember) => Promise<void> | void;
  onExitGroup: () => void;
}

function GroupInfoPanel({
  isOpen,
  isMobile,
  selectedGroup,
  group,
  members,
  loading,
  error,
  saving,
  eligibleUsers,
  onClose,
  onAddMembers,
  onRenameGroup,
  onRemoveMember,
  onExitGroup,
}: GroupInfoPanelProps) {
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string>("");
  const [renameError, setRenameError] = useState<string>("");

  const currentGroup = group ?? (selectedGroup
    ? {
        id: selectedGroup.id,
        conversationId: selectedGroup.conversationId ?? selectedGroup.id,
        name: selectedGroup.name || "Untitled group",
        memberIds: selectedGroup.memberIds || [],
        memberCount:
          selectedGroup.memberCount ?? selectedGroup.memberIds?.length ?? 0,
        adminIds: selectedGroup.adminIds || [],
        createdBy: null,
        isGroupOwner: Boolean(selectedGroup.isGroupOwner),
        isGroupAdmin: Boolean(selectedGroup.isGroupAdmin),
        subtitle: selectedGroup.subtitle ?? null,
      }
    : null);

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        if (a.isYou && !b.isYou) return -1;
        if (b.isYou && !a.isYou) return 1;
        if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [members]
  );

  if (!isOpen) {
    return null;
  }

  const handleSubmitMembers = async () => {
    if (selectedMemberIds.length === 0) {
      setSubmitError("Select at least one member to add.");
      return;
    }

    try {
      setSubmitError("");
      await onAddMembers(selectedMemberIds);
      setSelectedMemberIds([]);
      setIsAddMembersOpen(false);
    } catch (error) {
      console.error("Add member action failed:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Unable to add members right now."
      );
    }
  };

  const handleRenameSubmit = async () => {
    const nextName = groupNameInput.trim();

    if (nextName.length < 2) {
      setRenameError("Enter a group name with at least 2 characters.");
      return;
    }

    if (nextName === (currentGroup?.name ?? "").trim()) {
      setRenameError("");
      setIsEditingName(false);
      return;
    }

    try {
      setRenameError("");
      await onRenameGroup(nextName);
      setIsEditingName(false);
    } catch (error) {
      console.error("Rename group action failed:", error);
      setRenameError(
        error instanceof Error ? error.message : "Unable to rename this group right now."
      );
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[85] bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className={`fixed z-[86] flex h-full flex-col border-l border-gray-200 bg-white shadow-2xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-950 ${
          isMobile
            ? "inset-y-0 right-0 w-full max-w-full animate-[slideInRight_0.22s_ease-out]"
            : "inset-y-16 right-0 w-full max-w-md animate-[slideInRight_0.22s_ease-out]"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                Group info
              </p>
              <h3 className="mt-1 truncate text-xl font-semibold text-gray-900 dark:text-white">
                {currentGroup?.name || "Group"}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {currentGroup?.subtitle ||
                  `${currentGroup?.memberCount ?? members.length} members`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Close group info"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="rounded-[28px] border border-gray-200 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-5 dark:border-gray-800 dark:from-blue-950/30 dark:via-gray-950 dark:to-slate-950">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                <Users size={28} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                  {currentGroup?.name || "Group"}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {currentGroup?.memberCount ?? members.length} members
                </div>
                {currentGroup?.isGroupAdmin ? (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <Crown size={12} />
                    Admin access
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Group name
                  </h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {currentGroup?.isGroupAdmin
                      ? "Admins can update the group name for everyone."
                      : "Only admins can change the group name."}
                  </p>
                </div>
                {currentGroup?.isGroupAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setGroupNameInput(currentGroup?.name ?? "");
                      setRenameError("");
                      setIsEditingName((prev) => !prev);
                    }}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <Pencil size={15} />
                    {isEditingName ? "Cancel" : "Edit"}
                  </button>
                ) : null}
              </div>

              {isEditingName ? (
                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    value={groupNameInput}
                    onChange={(event) => setGroupNameInput(event.target.value)}
                    placeholder="Enter group name"
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                  {renameError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                      {renameError}
                    </div>
                  ) : null}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleRenameSubmit}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                      Save name
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white">
                  {currentGroup?.name || "Untitled group"}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  Members
                </h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Everyone in this conversation
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                {currentGroup?.memberCount ?? members.length}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading group details...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <PremiumAvatar
                        src={member.avatar || null}
                        alt={member.name}
                        fallback={member.name}
                        size={44}
                        isPremium={false}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium text-gray-900 dark:text-white">
                            {member.name}
                          </span>
                          {member.isYou ? (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              You
                            </span>
                          ) : null}
                          {member.role === "admin" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              <Crown size={11} />
                              Admin
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              Member
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {currentGroup?.isGroupAdmin && !member.isYou && member.role !== "admin" ? (
                      <button
                        type="button"
                        onClick={() => void onRemoveMember(member)}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                      >
                        <UserMinus size={15} />
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentGroup?.isGroupAdmin ? (
            <div className="mt-6 rounded-[24px] border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Add members
                  </h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Admins can add more people to this group.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsAddMembersOpen((prev) => !prev);
                    setSubmitError("");
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <UserPlus size={16} />
                  {isAddMembersOpen ? "Close" : "Add member"}
                </button>
              </div>

              {isAddMembersOpen ? (
                <div className="mt-4 space-y-3">
                  {eligibleUsers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      No eligible contacts are available to add right now.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {eligibleUsers.map((user) => {
                        const isSelected = selectedMemberIds.includes(user.id);

                        return (
                          <button
                            key={user.id}
                            onClick={() =>
                              setSelectedMemberIds((prev) =>
                                prev.includes(user.id)
                                  ? prev.filter((id) => id !== user.id)
                                  : [...prev, user.id]
                              )
                            }
                            className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                                : "border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <PremiumAvatar
                                src={typeof user.avatar === "string" ? user.avatar : null}
                                alt={user.name || "User"}
                                fallback={user.name || user.email || "User"}
                                size={38}
                                isPremium={Boolean(user.isPremium)}
                              />
                              <div className="min-w-0">
                                <div className="truncate font-medium">
                                  {user.name || user.email || "Unknown user"}
                                </div>
                                <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                                  {user.email || "Contact"}
                                </div>
                              </div>
                            </div>
                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                                isSelected
                                  ? "border-blue-500 bg-blue-500 text-white"
                                  : "border-gray-300 text-transparent dark:border-gray-700"
                              }`}
                            >
                              <Check size={14} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {submitError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                      {submitError}
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmitMembers}
                      disabled={saving || eligibleUsers.length === 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus size={16} />}
                      Add selected
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
          <button
            onClick={onExitGroup}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut size={16} />}
            Exit Group
          </button>
        </div>
      </aside>

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

export default React.memo(GroupInfoPanel);
