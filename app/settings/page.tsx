"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "../theme-provider";
import { Settings, Save, RotateCcw, Moon, Sun, Bell, Shield, User, Check, AlertCircle, Camera, Trash2 } from "lucide-react";
import AvatarCropperModal from "../components/AvatarCropperModal";

type SettingsState = {
  profile: {
    name: string;
    email: string;
    bio: string;
    isPrivate: boolean;
    avatar: string;
  };
  feed: {
    enableBlinkScroll: boolean;
    autoPlayVideos: boolean;
    muteVideos: boolean;
    showReels: boolean;
  };
  notifications: {
    emailMentions: boolean;
    pushMessages: boolean;
    inAppBadges: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    allowTracking: boolean;
  };
};

const STORAGE_KEY = "orbitbyte.settings.v1";

const DEFAULT_SETTINGS: SettingsState = {
  profile: {
    name: "",
    email: "",
    bio: "",
    isPrivate: false,
    avatar: "",
  },
  feed: {
    enableBlinkScroll: true,
    autoPlayVideos: true,
    muteVideos: false,
    showReels: true,
  },
  notifications: {
    emailMentions: true,
    pushMessages: true,
    inAppBadges: true,
  },
  privacy: {
    showOnlineStatus: true,
    allowTracking: false,
  },
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<"profile" | "appearance" | "feed" | "notifications" | "privacy">("profile");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [cropSourceUrl, setCropSourceUrl] = useState("");
  const [showCropper, setShowCropper] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const load = async () => {
      setIsLoading(true);

      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const user = data?.user;
          if (user) {
            setSettings((prev) => ({
              ...prev,
              profile: {
                name: user.name ?? "",
                email: user.email ?? "",
                bio: user.bio ?? "",
                isPrivate: Boolean(user.isPrivate),
                avatar: user.avatar ?? user.image ?? "",
              },
            }));
          }
        }
      } catch {
        // Keep defaults and local state fallback.
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const localSettings = JSON.parse(raw);
          setSettings((prev) => ({
            ...prev,
            ...localSettings,
            profile: prev.profile,
          }));
        }
      } catch {
        // Ignore malformed local settings.
      }

      setIsLoading(false);
    };

    void load();
  }, [status]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  useEffect(() => {
    return () => {
      if (cropSourceUrl) {
        URL.revokeObjectURL(cropSourceUrl);
      }
    };
  }, [cropSourceUrl]);

  const saveSettings = async () => {
    setIsSaving(true);
    setSaveError("");

    try {
      const formData = new FormData();
      formData.append("name", settings.profile.name);
      formData.append("bio", settings.profile.bio);
      formData.append("isPrivate", String(settings.profile.isPrivate));
      formData.append("removeAvatar", String(removeAvatar));
      if (avatarFile) {
        formData.append("file", avatarFile);
      }

      const profileRes = await fetch("/api/user/update", {
        method: "POST",
        body: formData,
      });

      if (!profileRes.ok) {
        throw new Error("profile-save-failed");
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          feed: settings.feed,
          notifications: settings.notifications,
          privacy: settings.privacy,
        })
      );

      try {
        const profileRefreshRes = await fetch("/api/user/profile", {
          cache: "no-store",
        });
        if (profileRefreshRes.ok) {
          const refreshed = await profileRefreshRes.json();
          const nextAvatar =
            refreshed?.user?.avatar ?? refreshed?.user?.image ?? "";
          setSettings((prev) => ({
            ...prev,
            profile: { ...prev.profile, avatar: nextAvatar },
          }));
        }
      } catch {
        // Keep current avatar state on refresh failure.
      }

      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2500);
      if (removeAvatar) setRemoveAvatar(false);
      setAvatarFile(null);
    } catch {
      setSaveError("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    setSettings((prev) => ({
      ...prev,
      feed: DEFAULT_SETTINGS.feed,
      notifications: DEFAULT_SETTINGS.notifications,
      privacy: DEFAULT_SETTINGS.privacy,
    }));
    setTheme("dark");
    localStorage.removeItem(STORAGE_KEY);
  };

  const tabs = useMemo(
    () => [
      { id: "profile", label: "Profile", icon: User },
      { id: "appearance", label: "Appearance", icon: theme === "dark" ? Sun : Moon },
      { id: "feed", label: "Feed", icon: Settings },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "privacy", label: "Privacy", icon: Shield },
    ],
    [theme]
  );

  if (status === "loading" || isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading settings...</div>;
  }

  if (status !== "authenticated") {
    return null;
  }

  const currentAvatar = removeAvatar
    ? ""
    : avatarPreview || settings.profile.avatar || session?.user?.image || "";

  const startCrop = (file: File | null) => {
    if (!file) return;
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
    const sourceUrl = URL.createObjectURL(file);
    setCropSourceUrl(sourceUrl);
    setShowCropper(true);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-white/60 mt-1">Manage your account and app preferences.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-1 h-fit">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${activeTab === tab.id ? "bg-indigo-500/20 text-indigo-300" : "hover:bg-white/10 text-white/80"}`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </aside>

          <main className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 space-y-6">
            {activeTab === "profile" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-white/70 mb-3">Profile Photo</p>
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-3xl bg-white/10 border border-white/20 overflow-hidden shadow-inner">
                      {currentAvatar ? (
                        <img
                          src={currentAvatar}
                          alt="Profile avatar preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/50">
                          <User size={28} />
                        </div>
                      )}
                      <div className="absolute inset-0 ring-1 ring-white/25 rounded-3xl pointer-events-none" />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
                        <Camera size={16} />
                        <span>Change Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            startCrop(file);
                            setRemoveAvatar(false);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview("");
                          setRemoveAvatar(true);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/15 hover:bg-white/10"
                      >
                        <Trash2 size={16} />
                        Remove Photo
                      </button>
                      <p className="text-xs text-white/50">Square frame recommended. JPG/PNG/WEBP.</p>
                    </div>
                  </div>
                </div>

                <label className="block text-sm text-white/70">Name</label>
                <input
                  value={settings.profile.name}
                  onChange={(e) => setSettings((s) => ({ ...s, profile: { ...s.profile, name: e.target.value } }))}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
                />
                <label className="block text-sm text-white/70">Email</label>
                <input value={settings.profile.email} disabled className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-white/60" />
                <label className="block text-sm text-white/70">Bio</label>
                <textarea
                  value={settings.profile.bio}
                  onChange={(e) => setSettings((s) => ({ ...s, profile: { ...s.profile, bio: e.target.value } }))}
                  rows={4}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
                />
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.profile.isPrivate}
                    onChange={(e) => setSettings((s) => ({ ...s, profile: { ...s.profile, isPrivate: e.target.checked } }))}
                  />
                  <span>Private profile</span>
                </label>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-4">
                <p className="text-white/70">Theme mode</p>
                <div className="flex gap-3">
                  <button onClick={() => setTheme("light")} className={`px-4 py-2 rounded-xl border ${theme === "light" ? "border-indigo-400 bg-indigo-500/20" : "border-white/10"}`}>Light</button>
                  <button onClick={() => setTheme("dark")} className={`px-4 py-2 rounded-xl border ${theme === "dark" ? "border-indigo-400 bg-indigo-500/20" : "border-white/10"}`}>Dark</button>
                </div>
              </div>
            )}

            {activeTab === "feed" && (
              <div className="space-y-4">
                <Toggle label="Enable Blink Scroll" checked={settings.feed.enableBlinkScroll} onChange={(checked) => setSettings((s) => ({ ...s, feed: { ...s.feed, enableBlinkScroll: checked } }))} />
                <Toggle label="Auto-play videos" checked={settings.feed.autoPlayVideos} onChange={(checked) => setSettings((s) => ({ ...s, feed: { ...s.feed, autoPlayVideos: checked } }))} />
                <Toggle label="Mute videos by default" checked={settings.feed.muteVideos} onChange={(checked) => setSettings((s) => ({ ...s, feed: { ...s.feed, muteVideos: checked } }))} />
                <Toggle label="Show reels" checked={settings.feed.showReels} onChange={(checked) => setSettings((s) => ({ ...s, feed: { ...s.feed, showReels: checked } }))} />
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-4">
                <Toggle label="Email mentions" checked={settings.notifications.emailMentions} onChange={(checked) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, emailMentions: checked } }))} />
                <Toggle label="Push messages" checked={settings.notifications.pushMessages} onChange={(checked) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, pushMessages: checked } }))} />
                <Toggle label="In-app badges" checked={settings.notifications.inAppBadges} onChange={(checked) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, inAppBadges: checked } }))} />
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-4">
                <Toggle label="Show online status" checked={settings.privacy.showOnlineStatus} onChange={(checked) => setSettings((s) => ({ ...s, privacy: { ...s.privacy, showOnlineStatus: checked } }))} />
                <Toggle label="Allow tracking" checked={settings.privacy.allowTracking} onChange={(checked) => setSettings((s) => ({ ...s, privacy: { ...s.privacy, allowTracking: checked } }))} />
              </div>
            )}

            {saveError && (
              <div className="flex items-center gap-2 text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-4 py-3">
                <AlertCircle size={16} />
                <span>{saveError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={saveSettings} disabled={isSaving} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2">
                <Save size={16} />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={resetSettings} className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 flex items-center gap-2">
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </main>
        </div>
      </div>

      {showSaved && (
        <div className="fixed bottom-4 right-4 bg-emerald-700 text-white px-4 py-3 rounded-xl flex items-center gap-2">
          <Check size={16} />
          <span>Settings saved</span>
        </div>
      )}

      <AvatarCropperModal
        isOpen={showCropper}
        imageSrc={cropSourceUrl}
        onCancel={() => {
          setShowCropper(false);
          if (cropSourceUrl) {
            URL.revokeObjectURL(cropSourceUrl);
            setCropSourceUrl("");
          }
        }}
        onApply={(croppedFile) => {
          setAvatarFile(croppedFile);
          setRemoveAvatar(false);
          setShowCropper(false);
          if (cropSourceUrl) {
            URL.revokeObjectURL(cropSourceUrl);
            setCropSourceUrl("");
          }
        }}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 p-3 rounded-xl border border-white/10 bg-black/20">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full transition ${checked ? "bg-indigo-500" : "bg-white/20"}`}
      >
        <span
          className={`block w-5 h-5 bg-white rounded-full transform transition ${checked ? "translate-x-6" : "translate-x-0.5"}`}
        />
      </button>
    </label>
  );
}
