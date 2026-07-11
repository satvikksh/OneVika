"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function useUserAvatar() {
  const { status } = useSession();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAvatar = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile", { cache: "no-store" });
      const data = await res.json();

      setAvatar(data?.user?.avatar ?? null);
      setIsPremium(Boolean(data?.user?.isPremium));
    } catch {
      setAvatar(null);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      setAvatar(null);
      setIsPremium(false);
      setLoading(false);
      return;
    }

    void loadAvatar();
  }, [loadAvatar, status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const refresh = () => {
      void loadAvatar();
    };

    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("orbitbyte:premium-status-changed", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      window.removeEventListener("orbitbyte:premium-status-changed", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [loadAvatar, status]);

  return { avatar, isPremium, loading };
}
