"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  Clock,
  Compass,
  ExternalLink,
  Loader2,
  LocateFixed,
  MapPin,
  Newspaper,
  RotateCw,
  Search,
  ShieldAlert,
  Signal,
  WifiOff,
} from "lucide-react";
import { PremiumAmbient } from "@/app/components/premium-ambient";
import { useUserAvatar } from "@/app/hooks/useUserAvatar";

type NewsArticle = {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  snippet: string;
  thumbnail: string | null;
};

type GeoState =
  | "idle"
  | "detecting"
  | "detected"
  | "searched"
  | "denied"
  | "unsupported"
  | "failed";

type NewsErrorKind = "network" | "api" | "rate-limit" | "auth" | null;

/* ============================
   NEWS CARD
============================ */
function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/30 hover:bg-white/[0.06] hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.8)]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-white/[0.06] to-transparent">
        {article.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.thumbnail}
            alt={article.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Newspaper size={32} className="text-white/25" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-[11px] text-white/45">
          <span className="font-semibold uppercase tracking-wide text-amber-200/80">
            {article.source}
          </span>
          {article.publishedAt && (
            <>
              <span className="h-1 w-1 shrink-0 rounded-full bg-white/30" />
              <span className="inline-flex items-center gap-1">
                <Clock size={11} />
                {article.publishedAt}
              </span>
            </>
          )}
        </div>

        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-white transition-colors group-hover:text-amber-100">
          {article.title}
        </h3>

        {article.snippet && (
          <p className="line-clamp-3 text-sm leading-relaxed text-white/55">{article.snippet}</p>
        )}

        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[13px] font-medium text-emerald-300/90">
          Read article
          <ExternalLink size={13} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </a>
  );
}

/* ============================
   SKELETON
============================ */
function NewsSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
      <div className="aspect-[16/9] w-full animate-pulse bg-white/5" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-full animate-pulse rounded bg-white/10" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-full animate-pulse rounded bg-white/[0.07]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.07]" />
      </div>
    </div>
  );
}

/* ============================
   STATE CARD (empty / errors)
============================ */
function StateCard({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] text-white/70">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-white/55">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-5 py-2.5 text-sm font-semibold text-amber-200 ring-1 ring-amber-300/30 transition hover:bg-amber-400/25 active:scale-95"
        >
          <RotateCw size={15} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ============================
   PAGE
============================ */
export default function DiscoverPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const { isPremium } = useUserAvatar();

  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [location, setLocation] = useState<string | null>(null);
  const [locationResolveFailed, setLocationResolveFailed] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<NewsErrorKind>(null);
  const [retryAfter, setRetryAfter] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const newsCacheRef = useRef(new Map<string, NewsArticle[]>());
  const labelCacheRef = useRef(new Map<string, string>());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);

  const fetchNews = useCallback(async (loc: string) => {
    const cacheKey = loc.trim().toLowerCase();
    if (!cacheKey) return;
    setLocationResolveFailed(false);

    const cached = newsCacheRef.current.get(cacheKey);
    if (cached) {
      setNews(cached);
      setLocation(labelCacheRef.current.get(cacheKey) || loc.trim());
      setNewsError(null);
      return;
    }

    const seq = ++requestSeqRef.current;
    setNewsLoading(true);
    setNewsError(null);
    try {
      const res = await fetch(`/api/discover/news?location=${encodeURIComponent(loc.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (seq !== requestSeqRef.current) return;

      if (res.status === 429) {
        setNewsError("rate-limit");
        setRetryAfter(typeof data?.retryAfterSec === "number" ? data.retryAfterSec : 30);
        return;
      }
      if (res.status === 401) {
        setNewsError("auth");
        return;
      }
      if (!res.ok) {
        setNewsError("api");
        return;
      }

      const articles: NewsArticle[] = Array.isArray(data?.articles) ? data.articles : [];
      newsCacheRef.current.set(cacheKey, articles);
      if (typeof data?.location === "string" && data.location) {
        setLocation(data.location);
        labelCacheRef.current.set(cacheKey, data.location);
      } else {
        setLocation(loc.trim());
      }
      setNews(articles);
    } catch {
      if (seq !== requestSeqRef.current) return;
      setNewsError("network");
    } finally {
      if (seq === requestSeqRef.current) {
        setNewsLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const detectLocation = useCallback(async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    if (!("geolocation" in navigator)) {
      setGeoState("unsupported");
      return;
    }

    setGeoState("detecting");
    setLocationResolveFailed(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(
            `/api/discover/location?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
          );
          const data = await res.json().catch(() => ({}));
          if (res.ok && data?.location?.label) {
            setLocation(data.location.label);
            setGeoState("detected");
            void fetchNews(data.location.label);
          } else {
            setLocationResolveFailed(true);
            setGeoState("failed");
          }
        } catch {
          setLocationResolveFailed(true);
          setGeoState("failed");
        }
      },
      (error) => {
        setGeoState(error?.code === error?.PERMISSION_DENIED ? "denied" : "failed");
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }, [fetchNews]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      void detectLocation();
    }
  }, [authStatus, detectLocation]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/login");
    }
  }, [authStatus, router]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const trimmed = value.trim();
    if (!trimmed) return;
    if (location && trimmed.toLowerCase() === location.toLowerCase()) return;
    searchTimerRef.current = setTimeout(() => {
      setGeoState("searched");
      void fetchNews(trimmed);
    }, 600);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    setGeoState("searched");
    void fetchNews(trimmed);
  };

  const handleRefresh = () => {
    const target = location || searchInput.trim();
    if (!target) return;
    newsCacheRef.current.delete(target.trim().toLowerCase());
    setRefreshing(true);
    void fetchNews(target);
  };

  const retryNews = () => {
    const target = location || searchInput.trim();
    if (target) void fetchNews(target);
  };

  const isDetecting = geoState === "idle" || geoState === "detecting";
  const emptyResults = !newsLoading && !newsError && news.length === 0 && Boolean(location);
  const locationBlocked =
    geoState === "denied" || geoState === "unsupported" || (geoState === "failed" && !location);

  /* ── Loading / unauth gates ── */
  if (authStatus === "loading") {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#020617,#050505)] px-4 py-10 text-white">
        <PremiumAmbient />
        <div className="relative z-10 flex flex-col items-center justify-center gap-3 py-24">
          <Loader2 className="h-6 w-6 animate-spin text-amber-200/70" />
          <p className="text-sm text-white/50">Loading Discover…</p>
        </div>
      </main>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#020617,#050505)] px-4 py-10 text-white">
        <PremiumAmbient />
        <div className="relative z-10">
          <StateCard
            icon={<ShieldAlert size={26} />}
            title="Sign in to Discover"
            message="You need an OrbitByte account to browse location-based news."
            actionLabel="Go to login"
            onAction={() => router.push("/login")}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#020617,#050505)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <PremiumAmbient />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-7">
        {/* ── Header ── */}
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                isPremium
                  ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/30"
                  : "bg-white/[0.06] text-cyan-300 ring-1 ring-white/10"
              }`}
            >
              <Compass size={18} />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Discover</h1>
              <p className="text-sm text-white/45">
                Local news and headlines, personalised by location.
              </p>
            </div>
          </div>
        </header>

        {/* ── Current location banner ── */}
        <section
          className={`rounded-2xl border p-4 sm:p-5 ${
            isPremium
              ? "border-amber-300/25 bg-amber-300/[0.06] shadow-[0_10px_36px_-18px_rgba(184,134,11,0.4)]"
              : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/20">
                <MapPin size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  {geoState === "detecting"
                    ? "Detecting location"
                    : geoState === "detected"
                      ? "Your current location"
                      : "Current location"}
                </p>
                <p className="mt-0.5 truncate text-lg font-bold tracking-tight text-white sm:text-xl">
                  {geoState === "detecting" ? "Locating you…" : location || "Select a location"}
                </p>
                {(geoState === "detected" || geoState === "searched") && location && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/40">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-emerald-300/90">
                      <Signal size={11} />
                      {geoState === "detected" ? "Auto-detected" : "Your selection"}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Search form */}
            <form onSubmit={handleSearchSubmit} className="w-full sm:max-w-sm">
              <label className="sr-only" htmlFor="discover-location">
                Change location
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  id="discover-location"
                  type="text"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search location, e.g. Delhi"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-20 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/20"
                />
                {locationBlocked && (
                  <button
                    type="button"
                    onClick={() => detectLocation()}
                    className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-lg bg-cyan-500/15 px-2 py-1.5 text-[11px] font-semibold text-cyan-200 ring-1 ring-cyan-400/20 transition hover:bg-cyan-500/25"
                  >
                    <LocateFixed size={12} />
                    Use mine
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Location status hints */}
          {geoState === "detecting" && (
            <p className="mt-3 flex items-center gap-2 text-xs text-white/45">
              <Loader2 size={13} className="animate-spin text-amber-200/70" />
              Using your browser location to find the latest local headlines…
            </p>
          )}

          {geoState === "denied" && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-400/10 px-3 py-2.5 text-xs text-amber-100/90 ring-1 ring-amber-300/20">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
              <span>
                Location permission was denied. Allow location access in your browser to auto-detect
                your city, or search for any location above.
              </span>
            </div>
          )}

          {geoState === "unsupported" && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-400/10 px-3 py-2.5 text-xs text-amber-100/90 ring-1 ring-amber-300/20">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
              <span>Location detection is not supported on this device. Search for a location above.</span>
            </div>
          )}

          {(locationResolveFailed || (geoState === "failed" && !location)) && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-400/10 px-3 py-2.5 text-xs text-rose-100/90 ring-1 ring-rose-300/20">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-300" />
              <span>We couldn’t resolve your coordinates. Search for a location above instead.</span>
            </div>
          )}
        </section>

        {/* ── News section ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-amber-200/80 ring-1 ring-white/10">
                <Newspaper size={15} />
              </span>
              <h2 className="text-lg font-bold tracking-tight">Latest News</h2>
              {location && !isDetecting && (
                <span className="hidden truncate text-sm text-white/40 sm:inline">
                  for <span className="font-semibold text-white/70">{location}</span>
                </span>
              )}
            </div>

            {location && !isDetecting && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing || newsLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-50"
              >
                <RotateCw size={13} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            )}
          </div>

          {/* Loading skeletons */}
          {newsLoading && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <NewsSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Errors */}
          {!newsLoading && newsError === "network" && (
            <StateCard
              icon={<WifiOff size={26} />}
              title="Network error"
              message="We couldn’t reach the news service. Check your connection and try again."
              actionLabel="Try again"
              onAction={retryNews}
            />
          )}

          {!newsLoading && newsError === "api" && (
            <StateCard
              icon={<AlertTriangle size={26} />}
              title="Couldn’t load news"
              message="Something went wrong on our side while fetching news for this location."
              actionLabel="Try again"
              onAction={retryNews}
            />
          )}

          {!newsLoading && newsError === "rate-limit" && (
            <StateCard
              icon={<ShieldAlert size={26} />}
              title="Slow down a little"
              message={`You’ve reached the news limit for now. Try again in about ${retryAfter} seconds.`}
              actionLabel="Try again"
              onAction={retryNews}
            />
          )}

          {!newsLoading && newsError === "auth" && (
            <StateCard
              icon={<ShieldAlert size={26} />}
              title="Session expired"
              message="Please sign in again to keep browsing the news."
              actionLabel="Go to login"
              onAction={() => router.push("/login")}
            />
          )}

          {/* Empty */}
          {!newsLoading && !newsError && emptyResults && (
            <StateCard
              icon={<Newspaper size={26} />}
              title="No news found"
              message={`We couldn’t find any recent headlines for “${location}”. Try a nearby city or a different spelling.`}
            />
          )}

          {/* News grid */}
          {!newsLoading && !newsError && news.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}