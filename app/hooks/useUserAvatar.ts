"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function useUserAvatar() {
  const { status } = useSession();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      setAvatar(null);
      setIsPremium(false);
      setLoading(false);
      return;
    }

    async function loadAvatar() {
      try {
        const res = await fetch("/api/user/profile");
        const data = await res.json();

        setAvatar(data?.user?.avatar ?? null);
        setIsPremium(Boolean(data?.user?.isPremium));
      } catch {
        setAvatar(null);
        setIsPremium(false);
      } finally {
        setLoading(false);
      }
    }

    loadAvatar();
  }, [status]);

  return { avatar, isPremium, loading };
}
