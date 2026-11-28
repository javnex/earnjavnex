"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function DashboardAuthGuard() {
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.replace("/auth/login");
    }
  }, [status]);

  useEffect(() => {
    const verifyLiveSession = async (forceReload = false) => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as { user?: unknown } | null;
        if (!res.ok || !data?.user) {
          window.location.replace("/auth/login");
          return;
        }
        if (forceReload) {
          window.location.reload();
        }
      } catch {
        window.location.replace("/auth/login");
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void verifyLiveSession(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void verifyLiveSession(false);
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
