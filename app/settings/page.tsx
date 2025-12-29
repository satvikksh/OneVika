"use client";

import { useState, useEffect, useRef } from "react";
import {
  Settings,
  User,
  Bell,
  Shield,
  Moon,
  Sun,
  Globe,
  Key,
  Database,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  LogOut,
  Check,
  X,
  ChevronRight,
  AlertCircle,
  Wifi,
  Cpu,
  HardDrive,
  Network,
  Volume2,
  Palette,
  Languages,
  Clock,
  Calendar,
  Mail,
  Smartphone,
  Cloud,
  Server,
  Zap,
  ShieldCheck,
  BellRing,
  SmartphoneIcon as Phone,
  CreditCard,
  Users,
  EyeIcon as Visibility,
  History,
  Code,
  Terminal,
  Bug,
  ExternalLink,
  HelpCircle,
  Info,
  FileText,
  ShieldAlert,
  Globe2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  WifiOff,
  Battery,
  Thermometer,
  Cctv,
} from "lucide-react";

// ================= NOTIFICATION TYPES =================

type EmailNotifications = {
  mentions: boolean;
  replies: boolean;
  directMessages: boolean;
  system: boolean;
  marketing: boolean;
};

type PushNotifications = {
  mentions: boolean;
  replies: boolean;
  directMessages: boolean;
  system: boolean;
  sound: boolean;
  vibration: boolean;
};

type InAppNotifications = {
  showBadges: boolean;
  showPreview: boolean;
  desktopNotifications: boolean;
  frequency: "real-time" | "hourly" | "daily";
};

type NotificationsState = {
  email: EmailNotifications;
  push: PushNotifications;
  inApp: InAppNotifications;
};

type NotificationType = keyof NotificationsState;

export default function SettingsPage() {
  // User Profile
  const [profile, setProfile] = useState({
    name: "Satvik Kushwaha",
    email: "satvik@neuralnexus.com",
    username: "@satvik_kushwaha",
    bio: "Quantum Reality Engineer • Neural Architect • Building tomorrow's consciousness",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Satvik",
    role: "Admin",
    joinDate: "2024-01-15",
    status: "Active",
  });

  // Theme Settings
  const [theme, setTheme] = useState({
    mode: "dark" as "light" | "dark" | "auto",
    accentColor: "#8b5cf6",
    fontSize: 16,
    reduceMotion: false,
    highContrast: false,
    showAnimations: true,
  });

  // Notification Settings
  const [notifications, setNotifications] = useState<NotificationsState>({
    email: {
      mentions: true,
      replies: true,
      directMessages: true,
      system: false,
      marketing: false,
    },
    push: {
      mentions: true,
      replies: true,
      directMessages: true,
      system: true,
      sound: true,
      vibration: true,
    },
    inApp: {
      showBadges: true,
      showPreview: true,
      desktopNotifications: true,
      frequency: "real-time" as "real-time" | "hourly" | "daily",
    },
  });

  // Privacy & Security
  const [privacy, setPrivacy] = useState({
    twoFactorAuth: true,
    loginNotifications: true,
    showOnlineStatus: true,
    allowTracking: false,
    dataCollection: "minimal" as "minimal" | "standard" | "enhanced",
    autoLogout: 30, // minutes
    sessionLimit: 5,
    requirePasswordChange: 90, // days
  });

  // Account Settings
  const [account, setAccount] = useState({
    language: "en",
    timezone: "Asia/Kolkata",
    currency: "USD",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    weekStart: "monday" as "monday" | "sunday",
  });

  // Display Settings
  const [display, setDisplay] = useState({
    density: "comfortable" as "compact" | "comfortable" | "spacious",
    sidebarPosition: "left" as "left" | "right",
    showThumbnails: true,
    showTimestamps: true,
    colorBlindMode: false,
    transparentBackground: false,
    sidebarWidth: 240,
  });

  // Sound Settings
  const [sound, setSound] = useState({
    volume: 80,
    muteSounds: false,
    muteNotifications: false,
    inputDevice: "default",
    outputDevice: "default",
    echoCancellation: true,
    noiseSuppression: true,
  });

  // Network Settings
  const [network, setNetwork] = useState({
    autoConnect: true,
    lowDataMode: false,
    proxyEnabled: false,
    proxyUrl: "",
    dns: "auto" as "auto" | "custom",
    customDns: ["8.8.8.8", "8.8.4.4"],
  });

  // Developer Settings
  const [developer, setDeveloper] = useState({
    devMode: false,
    showConsole: false,
    logLevel: "error" as "debug" | "info" | "warn" | "error",
    apiEndpoint: "https://api.neuralnexus.com",
    enableExperiments: false,
    enableBeta: false,
    clearCacheOnExit: false,
  });

  // System Info
  const [systemInfo, setSystemInfo] = useState({
    version: "3.7.2",
    build: "2024.03.15",
    platform: "web",
    lastUpdate: "2024-03-15",
    storage: {
      used: 4.2,
      total: 10,
      unit: "GB",
    },
    memory: {
      used: 2.8,
      total: 8,
      unit: "GB",
    },
    cpu: "Intel Core i7",
    gpu: "NVIDIA RTX 3080",
    resolution: "1920x1080",
  });

  // Password Change
  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
    showCurrent: false,
    showNew: false,
    showConfirm: false,
  });

  // Active Section
  const [activeSection, setActiveSection] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveAlert, setShowSaveAlert] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);

  // Backup file input ref
  const backupFileRef = useRef<HTMLInputElement>(null);

  // Handle theme change
  const handleThemeChange = (mode: "light" | "dark" | "auto") => {
    setTheme((prev) => ({ ...prev, mode }));
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else if (mode === "light") {
      document.documentElement.classList.remove("dark");
    }
  };

  // Handle notification toggle
  const toggleNotification = (
    type: "email" | "push" | "inApp",
    category: string
  ) => {
    setNotifications((prev) => {
      const section = prev[type];

      // ⛔ Prevent toggling non-boolean values (like frequency)
      if (typeof (section as any)[category] !== "boolean") {
        return prev;
      }

      return {
        ...prev,
        [type]: {
          ...section,
          [category]: !(section as Record<string, boolean>)[category],
        },
      };
    });
  };

  // Handle privacy toggle
  const togglePrivacy = (setting: string) => {
    setPrivacy((prev) => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof prev],
    }));
  };

  // Save settings
  const saveSettings = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setShowSaveAlert(true);
      setTimeout(() => setShowSaveAlert(false), 3000);
    }, 1000);
  };

  // Reset settings
  const resetSettings = () => {
    // Reset all settings to defaults
    setTheme({
      mode: "dark",
      accentColor: "#8b5cf6",
      fontSize: 16,
      reduceMotion: false,
      highContrast: false,
      showAnimations: true,
    });
    setNotifications({
      email: {
        mentions: true,
        replies: true,
        directMessages: true,
        system: false,
        marketing: false,
      },
      push: {
        mentions: true,
        replies: true,
        directMessages: true,
        system: true,
        sound: true,
        vibration: true,
      },
      inApp: {
        showBadges: true,
        showPreview: true,
        desktopNotifications: true,
        frequency: "real-time",
      },
    });
    setShowResetConfirm(false);
  };

  // Backup settings
  const backupSettings = () => {
    const settings = {
      profile,
      theme,
      notifications,
      privacy,
      account,
      display,
      sound,
      network,
      developer,
      systemInfo,
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neuralnexus-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Simulate backup progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setBackupProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => setBackupProgress(0), 1000);
      }
    }, 100);
  };

  // Restore settings
  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);
        // Validate and restore settings
        if (settings.profile) setProfile(settings.profile);
        if (settings.theme) setTheme(settings.theme);
        if (settings.notifications) setNotifications(settings.notifications);
        if (settings.privacy) setPrivacy(settings.privacy);
        if (settings.account) setAccount(settings.account);
        if (settings.display) setDisplay(settings.display);
        if (settings.sound) setSound(settings.sound);
        if (settings.network) setNetwork(settings.network);
        if (settings.developer) setDeveloper(settings.developer);
        if (settings.systemInfo) setSystemInfo(settings.systemInfo);

        // Simulate restore progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setRestoreProgress(progress);
          if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => setRestoreProgress(0), 1000);
          }
        }, 100);
      } catch (error) {
        console.error("Error restoring settings:", error);
      }
    };
    reader.readAsText(file);
  };

  // Change password
  const changePassword = () => {
    if (password.new !== password.confirm) {
      alert("New passwords don't match!");
      return;
    }
    if (password.new.length < 8) {
      alert("Password must be at least 8 characters!");
      return;
    }

    // Simulate password change
    alert("Password changed successfully!");
    setPassword({
      current: "",
      new: "",
      confirm: "",
      showCurrent: false,
      showNew: false,
      showConfirm: false,
    });
  };

  // Delete account
  const deleteAccount = () => {
    // Simulate account deletion
    alert("Account deletion initiated. Check your email for confirmation.");
    setShowDeleteConfirm(false);
  };

  // Render active section
  const renderActiveSection = () => {
    switch (activeSection) {
      case "profile":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-24 h-24 rounded-2xl border-4 border-white/10"
                />
                <button className="absolute -bottom-2 -right-2 p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full hover:scale-110 transition-transform">
                  <Upload className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h3 className="text-2xl font-bold">{profile.name}</h3>
                <p className="text-white/60">{profile.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                    {profile.status}
                  </span>
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-xs">
                    {profile.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) =>
                    setProfile({ ...profile, username: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Bio
                </label>
                <textarea
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>
        );

      case "theme":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Theme Mode</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { mode: "light", label: "Light", icon: Sun },
                  { mode: "dark", label: "Dark", icon: Moon },
                  { mode: "auto", label: "Auto", icon: Globe },
                ].map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    onClick={() => handleThemeChange(mode as any)}
                    className={`p-6 rounded-2xl border-2 transition-all ${
                      theme.mode === mode
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-8 h-8 mx-auto mb-3" />
                    <div className="font-medium">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Accent Color</h3>
              <div className="flex flex-wrap gap-3">
                {[
                  "#8b5cf6", // Purple
                  "#3b82f6", // Blue
                  "#10b981", // Green
                  "#f59e0b", // Amber
                  "#ef4444", // Red
                  "#ec4899", // Pink
                  "#6366f1", // Indigo
                  "#06b6d4", // Cyan
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => setTheme({ ...theme, accentColor: color })}
                    className={`w-10 h-10 rounded-full border-2 transition-transform ${
                      theme.accentColor === color
                        ? "border-white scale-110"
                        : "border-white/20 hover:scale-110"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Font Size</h4>
                  <p className="text-sm text-white/60">{theme.fontSize}px</p>
                </div>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={theme.fontSize}
                  onChange={(e) =>
                    setTheme({ ...theme, fontSize: parseInt(e.target.value) })
                  }
                  className="w-48"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Reduce Motion</h4>
                  <p className="text-sm text-white/60">Minimize animations</p>
                </div>
                <Toggle
                  enabled={theme.reduceMotion}
                  onChange={() =>
                    setTheme({ ...theme, reduceMotion: !theme.reduceMotion })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">High Contrast</h4>
                  <p className="text-sm text-white/60">Increase contrast</p>
                </div>
                <Toggle
                  enabled={theme.highContrast}
                  onChange={() =>
                    setTheme({ ...theme, highContrast: !theme.highContrast })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Show Animations</h4>
                  <p className="text-sm text-white/60">Enable UI animations</p>
                </div>
                <Toggle
                  enabled={theme.showAnimations}
                  onChange={() =>
                    setTheme({
                      ...theme,
                      showAnimations: !theme.showAnimations,
                    })
                  }
                />
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Notifications
              </h3>
              <div className="space-y-3">
                {Object.entries(notifications.email).map(([key, value]) => (
                  <ToggleRow
                    key={key}
                    label={key.split(/(?=[A-Z])/).join(" ")}
                    enabled={value}
                    onChange={() => toggleNotification("email", key)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BellRing className="w-5 h-5" />
                Push Notifications
              </h3>
              <div className="space-y-3">
                {Object.entries(notifications.push).map(([key, value]) => (
                  <ToggleRow
                    key={key}
                    label={key.split(/(?=[A-Z])/).join(" ")}
                    enabled={value}
                    onChange={() => toggleNotification("push", key)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                In-App Settings
              </h3>
              <div className="space-y-3">
                {Object.entries(notifications.inApp).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {key.split(/(?=[A-Z])/).join(" ")}
                      </h4>
                      {key === "frequency" && (
                        <select
                          value={value as string}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              inApp: {
                                ...notifications.inApp,
                                frequency: e.target.value as any,
                              },
                            })
                          }
                          className="mt-1 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm"
                        >
                          <option value="real-time">Real-time</option>
                          <option value="hourly">Hourly digest</option>
                          <option value="daily">Daily digest</option>
                        </select>
                      )}
                    </div>
                    {key !== "frequency" && (
                      <Toggle
                        enabled={value as boolean}
                        onChange={() => toggleNotification("inApp", key)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Security
              </h3>
              <div className="space-y-4">
                <ToggleRow
                  label="Two-Factor Authentication"
                  enabled={privacy.twoFactorAuth}
                  onChange={() => togglePrivacy("twoFactorAuth")}
                  description="Add an extra layer of security"
                />
                <ToggleRow
                  label="Login Notifications"
                  enabled={privacy.loginNotifications}
                  onChange={() => togglePrivacy("loginNotifications")}
                  description="Get notified of new logins"
                />
                <ToggleRow
                  label="Show Online Status"
                  enabled={privacy.showOnlineStatus}
                  onChange={() => togglePrivacy("showOnlineStatus")}
                  description="Let others see when you're online"
                />
                <ToggleRow
                  label="Allow Tracking"
                  enabled={privacy.allowTracking}
                  onChange={() => togglePrivacy("allowTracking")}
                  description="Help improve our services"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Data Collection</h3>
              <div className="space-y-3">
                {["minimal", "standard", "enhanced"].map((level) => (
                  <button
                    key={level}
                    onClick={() =>
                      setPrivacy({ ...privacy, dataCollection: level as any })
                    }
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      privacy.dataCollection === level
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-medium capitalize">{level}</div>
                    <p className="text-sm text-white/60 mt-1">
                      {level === "minimal" && "Only essential data"}
                      {level === "standard" && "Basic usage analytics"}
                      {level === "enhanced" && "Full analytics and insights"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Auto Logout (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={privacy.autoLogout}
                  onChange={(e) =>
                    setPrivacy({
                      ...privacy,
                      autoLogout: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Session Limit
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={privacy.sessionLimit}
                  onChange={(e) =>
                    setPrivacy({
                      ...privacy,
                      sessionLimit: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>
        );

      case "account":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Language
                </label>
                <select
                  value={account.language}
                  onChange={(e) =>
                    setAccount({ ...account, language: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Timezone
                </label>
                <select
                  value={account.timezone}
                  onChange={(e) =>
                    setAccount({ ...account, timezone: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="America/New_York">New York (EST)</option>
                  <option value="America/Los_Angeles">Los Angeles (PST)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Kolkata">Kolkata (IST)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Currency
                </label>
                <select
                  value={account.currency}
                  onChange={(e) =>
                    setAccount({ ...account, currency: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">British Pound (£)</option>
                  <option value="JPY">Japanese Yen (¥)</option>
                  <option value="INR">Indian Rupee (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Date Format
                </label>
                <select
                  value={account.dateFormat}
                  onChange={(e) =>
                    setAccount({ ...account, dateFormat: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Time Format
                </label>
                <select
                  value={account.timeFormat}
                  onChange={(e) =>
                    setAccount({ ...account, timeFormat: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="12h">12-hour</option>
                  <option value="24h">24-hour</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Week Starts On
                </label>
                <select
                  value={account.weekStart}
                  onChange={(e) =>
                    setAccount({ ...account, weekStart: e.target.value as any })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="monday">Monday</option>
                  <option value="sunday">Sunday</option>
                </select>
              </div>
            </div>
          </div>
        );

      case "password":
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={password.showCurrent ? "text" : "password"}
                    value={password.current}
                    onChange={(e) =>
                      setPassword({ ...password, current: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors pr-12"
                    placeholder="Enter current password"
                  />
                  <button
                    onClick={() =>
                      setPassword({
                        ...password,
                        showCurrent: !password.showCurrent,
                      })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {password.showCurrent ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={password.showNew ? "text" : "password"}
                    value={password.new}
                    onChange={(e) =>
                      setPassword({ ...password, new: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors pr-12"
                    placeholder="Enter new password"
                  />
                  <button
                    onClick={() =>
                      setPassword({ ...password, showNew: !password.showNew })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {password.showNew ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-white/60 mt-2">
                  Must be at least 8 characters with letters and numbers
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={password.showConfirm ? "text" : "password"}
                    value={password.confirm}
                    onChange={(e) =>
                      setPassword({ ...password, confirm: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors pr-12"
                    placeholder="Confirm new password"
                  />
                  <button
                    onClick={() =>
                      setPassword({
                        ...password,
                        showConfirm: !password.showConfirm,
                      })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {password.showConfirm ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={changePassword}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-all font-medium"
              >
                Change Password
              </button>
              <button
                onClick={() =>
                  setPassword({
                    current: "",
                    new: "",
                    confirm: "",
                    showCurrent: false,
                    showNew: false,
                    showConfirm: false,
                  })
                }
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        );

      case "backup":
        return (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl border border-white/10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-xl">
                  <Database className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Backup Your Settings
                  </h3>
                  <p className="text-white/60 mb-4">
                    Create a backup file with all your current settings. You can
                    restore them later if needed.
                  </p>
                  <button
                    onClick={backupSettings}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-all font-medium"
                  >
                    <Download className="w-5 h-5" />
                    Create Backup
                  </button>
                  {backupProgress > 0 && (
                    <div className="mt-4">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                          style={{ width: `${backupProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-white/60 mt-2">
                        Backing up... {backupProgress}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl border border-white/10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <Upload className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    Restore Settings
                  </h3>
                  <p className="text-white/60 mb-4">
                    Upload a backup file to restore your previous settings.
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      ref={backupFileRef}
                      onChange={handleRestore}
                      accept=".json"
                      className="hidden"
                    />
                    <button
                      onClick={() => backupFileRef.current?.click()}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all font-medium"
                    >
                      <Upload className="w-5 h-5" />
                      Restore from File
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                    >
                      Reset to Defaults
                    </button>
                  </div>
                  {restoreProgress > 0 && (
                    <div className="mt-4">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                          style={{ width: `${restoreProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-white/60 mt-2">
                        Restoring... {restoreProgress}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-rose-500/10 to-red-500/10 rounded-2xl border border-white/10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-500/20 rounded-xl">
                  <Trash2 className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-rose-300">
                    Danger Zone
                  </h3>
                  <p className="text-white/60 mb-4">
                    Permanently delete your account and all associated data.
                  </p>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 rounded-xl transition-all font-medium text-white"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case "system":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Cpu, label: "CPU", value: systemInfo.cpu },
                {
                  icon: HardDrive,
                  label: "Storage",
                  value: `${systemInfo.storage.used} / ${systemInfo.storage.total} ${systemInfo.storage.unit}`,
                },
                {
                  icon: Database,
                  label: "Memory",
                  value: `${systemInfo.memory.used} / ${systemInfo.memory.total} ${systemInfo.memory.unit}`,
                },
                { icon: Server, label: "Platform", value: systemInfo.platform },
                { icon: Calendar, label: "Version", value: systemInfo.version },
                { icon: Clock, label: "Build Date", value: systemInfo.build },
                {
                  icon: Globe,
                  label: "Resolution",
                  value: systemInfo.resolution,
                },
                {
                  icon: History,
                  label: "Last Update",
                  value: systemInfo.lastUpdate,
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-white/5 rounded-xl border border-white/10"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <item.icon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-sm text-white/60">{item.label}</div>
                      <div className="font-medium">{item.value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Storage Usage */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Storage Usage</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>System Files</span>
                    <span>1.2 GB</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: "12%" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Cache</span>
                    <span>850 MB</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: "8.5%" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>User Data</span>
                    <span>2.1 GB</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: "21%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* System Actions */}
            <div className="flex flex-wrap gap-3">
              <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Clear Cache
              </button>
              <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors flex items-center gap-2">
                <Database className="w-5 h-5" />
                Optimize Storage
              </button>
              <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors flex items-center gap-2">
                <Bug className="w-5 h-5" />
                Run Diagnostics
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
              <Settings className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Settings Dashboard</h3>
            <p className="text-white/60 max-w-md mx-auto">
              Select a category from the sidebar to configure your settings.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-indigo-950/40 to-purple-950/30 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Settings</h1>
          <p className="text-white/60">
            Configure your Neural Nexus experience
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
              <nav className="space-y-1">
                {[
                  { id: "profile", label: "Profile", icon: User },
                  { id: "theme", label: "Appearance", icon: Palette },
                  { id: "notifications", label: "Notifications", icon: Bell },
                  { id: "privacy", label: "Privacy & Security", icon: Shield },
                  { id: "account", label: "Account", icon: Globe2 },
                  { id: "password", label: "Password", icon: Key },
                  { id: "backup", label: "Backup & Restore", icon: Database },
                  { id: "system", label: "System", icon: Cpu },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                        activeSection === item.id
                          ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30"
                          : "hover:bg-white/10 text-white/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  );
                })}
              </nav>

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="space-y-3">
                  <button
                    onClick={saveSettings}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-all font-medium"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Changes
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Reset All
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
              <h3 className="text-sm font-medium mb-3 text-white/70">
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Storage Used</span>
                  <span className="font-medium">
                    {systemInfo.storage.used} GB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Memory</span>
                  <span className="font-medium">
                    {systemInfo.memory.used} GB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Notifications</span>
                  <span className="font-medium">
                    {Object.values(notifications.email).filter((v) => v).length}{" "}
                    active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold">
                    {activeSection.charAt(0).toUpperCase() +
                      activeSection.slice(1)}{" "}
                    Settings
                  </h2>
                  <p className="text-white/60 mt-1">
                    {activeSection === "profile" &&
                      "Manage your profile information"}
                    {activeSection === "theme" && "Customize the look and feel"}
                    {activeSection === "notifications" &&
                      "Configure notification preferences"}
                    {activeSection === "privacy" &&
                      "Manage privacy and security settings"}
                    {activeSection === "account" &&
                      "Update account preferences"}
                    {activeSection === "password" && "Change your password"}
                    {activeSection === "backup" &&
                      "Backup and restore your settings"}
                    {activeSection === "system" &&
                      "View system information and manage storage"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {activeSection === "system" && (
                    <button className="p-3 hover:bg-white/10 rounded-xl transition-colors">
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Settings Content */}
              <div className="min-h-[500px]">{renderActiveSection()}</div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-wrap gap-4 mt-6">
              <button
                onClick={() =>
                  window.open("https://docs.neuralnexus.com/settings", "_blank")
                }
                className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                <HelpCircle className="w-5 h-5" />
                Help & Documentation
              </button>
              <button
                onClick={() =>
                  window.open("mailto:support@neuralnexus.com", "_blank")
                }
                className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                <Mail className="w-5 h-5" />
                Contact Support
              </button>
              <button
                onClick={() =>
                  window.open("https://status.neuralnexus.com", "_blank")
                }
                className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                <Server className="w-5 h-5" />
                System Status
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Alert */}
      {showSaveAlert && (
        <div className="fixed bottom-4 right-4 z-50 animate-slideInUp">
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-2xl border border-white/20 backdrop-blur-sm flex items-center gap-3">
            <Check className="w-5 h-5" />
            <span>Settings saved successfully!</span>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4">
          <div className="relative max-w-md w-full rounded-2xl border border-white/20 bg-gradient-to-b from-slate-900 to-black p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-400" />
              Reset Settings
            </h3>
            <p className="text-white/70 mb-6">
              Are you sure you want to reset all settings to default values?
              This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={resetSettings}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl transition-all font-medium"
              >
                Reset All
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4">
          <div className="relative max-w-md w-full rounded-2xl border border-white/20 bg-gradient-to-b from-slate-900 to-black p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-rose-400" />
              Delete Account
            </h3>
            <p className="text-white/70 mb-6">
              This will permanently delete your account and all associated data.
              This action cannot be undone.
            </p>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Type 'DELETE' to confirm"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none"
              />
              <div className="flex gap-4">
                <button
                  onClick={deleteAccount}
                  className="flex-1 px-6 py-3 bg-rose-600 hover:bg-rose-700 rounded-xl transition-all font-medium"
                >
                  Delete Account
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS animations */}
      <style jsx global>{`
        @keyframes slideInUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slideInUp {
          animation: slideInUp 0.3s ease-out;
        }

        /* Custom range input */
        input[type="range"] {
          -webkit-appearance: none;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          outline: none;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(to right, #8b5cf6, #6366f1);
          cursor: pointer;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(to right, #8b5cf6, #6366f1);
          cursor: pointer;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

// Toggle Component
function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        enabled
          ? "bg-gradient-to-r from-indigo-500 to-purple-500"
          : "bg-white/10"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// Toggle Row Component
function ToggleRow({
  label,
  enabled,
  onChange,
  description,
}: {
  label: string;
  enabled: boolean;
  onChange: () => void;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h4 className="font-medium">{label}</h4>
        {description && <p className="text-sm text-white/60">{description}</p>}
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}
