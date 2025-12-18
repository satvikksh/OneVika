"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function useUserAvatar() {
  const { data: session, status } = useSession();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      setAvatar(null);
      setLoading(false);
      return;
    }

    async function loadAvatar() {
      try {
        const res = await fetch("/api/user/profile");
        const data = await res.json();

        setAvatar(data?.user?.avatar ?? null);
      } catch {
        setAvatar(null);
      } finally {
        setLoading(false);
      }
    }

    loadAvatar();
  }, [status]);

  return { avatar, loading };
}
