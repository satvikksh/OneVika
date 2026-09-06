"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Orbit,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  WifiOff,
  Youtube,
} from "lucide-react";
import type { YouTubeShort } from "@/app/lib/youtube";
import {
  buildFreshQuery,
  sanitizeQuery,
  type ShortsWatchSignal,
} from "@/app/lib/shortsRecommendations";
import { createSessionSeen } from "@/app/lib/sessionSeen";
import FeedStateCard from "./FeedStateCard";
import ShortPlayer from "./ShortPlayer";

const DEFAULT_QUERY = "trending shorts";
const DESKTOP_IFRAME_WINDOW = 3;
const MOBILE_IFRAME_WINDOW = 2;

/* Infinite-scroll tuning */
const BATCH_SIZE = 12;
const LOAD_MORE_THRESHOLD = 4;

/* ── Session-scoped "seen" registry (shared helper, unique storage key) ── */
const seen = createSessionSeen("onevika:youtube-shorts-seen:v1");

export type ShortsNavHandle = {
  next: () => void;
  prev: () => void;
};

type ShortsStatus = "loading" | "ready" | "empty" | "network" | "api" | "rate-limit";

/* ============================
   STATE CARD (loading / empty / errors)
============================ */


/* ============================
   SHORTS / ORBITBYTE SELECTOR (desktop top bar)
============================ */
function ShortsSelector({
  isPremium,
  onSwitchToOrbit,
}: {
  isPremium: boolean;
  onSwitchToOrbit: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-black/50 p-1 shadow-lg backdrop-blur-md">
      <button
        type="button"
        aria-pressed="true"
        aria-label="Search Shorts"
        title="Search Shorts"
        className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition active:scale-95 ${
          isPremium
            ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/30"
            : "bg-red-500/20 text-red-300 ring-1 ring-red-400/40"
        }`}
      >
        <Youtube size={15} />
        Shorts
      </button>
      <button
        type="button"
        onClick={onSwitchToOrbit}
        aria-pressed="false"
        aria-label="Search OrbitByte posts"
        title="Switch to OrbitByte posts"
        className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white/50 transition hover:bg-white/10 hover:text-white active:scale-95"
      >
        <Orbit size={15} />
        OrbitByte
      </button>
    </div>
  );
}

/* ============================
   SEARCH FORM (shared by mobile + desktop top bars)
============================ */
function ShortSearchForm({
  searchBox,
  onSearchBoxChange,
  status,
  onSubmit,
  onRefresh,
  onLocate,
}: {
  searchBox: string;
  onSearchBoxChange: (v: string) => void;
  status: ShortsStatus;
  onSubmit: (e: React.FormEvent) => void;
  onRefresh: () => void;
  onLocate: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex min-w-0 flex-1 items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
        />
        <input
          value={searchBox}
          onChange={(e) => onSearchBoxChange(e.target.value)}
          placeholder="Search Shorts…"
          autoComplete="off"
          spellCheck={false}
          className="h-9 w-full rounded-full border border-white/10 bg-black/40 pl-8 pr-8 text-xs text-white outline-none transition placeholder:text-white/35 focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/20 sm:text-sm"
        />
        <button
          type="button"
          onClick={onLocate}
          aria-label="Search Shorts near me"
          title="Search Shorts near me"
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white active:scale-90"
        >
          <MapPin size={14} />
        </button>
      </div>
      <button
        type="submit"
        aria-label="Search Shorts"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-white/10 transition hover:bg-white/20 active:scale-95"
      >
        <Search size={15} />
      </button>
      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh Shorts"
        disabled={status === "loading"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-white/10 transition hover:bg-white/20 active:scale-95 disabled:opacity-50"
      >
        <RefreshCw size={15} className={status === "loading" ? "animate-spin" : ""} />
      </button>
    </form>
  );
}

/* ============================
   DESKTOP SHORT CARD (scrollable vertical feed)
============================ */
function DesktopShortCard({
  short,
  index,
  total,
  isFocused,
  inWindow,
  onCenter,
}: {
  short: YouTubeShort;
  index: number;
  total: number;
  isFocused: boolean;
  inWindow: boolean;
  onCenter: () => void;
}) {
  return (
    <div className="relative aspect-[9/16] h-[76vh] w-auto max-w-full overflow-hidden rounded-[2rem] bg-black shadow-2xl ring-1 ring-white/10">
      {inWindow ? (
        /* In/near viewport: live sound-on player. Only the centered video
           plays; the rest stay cued/paused so switching stays smooth. */
        <ShortPlayer videoId={short.id} title={short.title} active={isFocused} />
      ) : (
        <>
          {short.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={short.thumbnail}
              alt={short.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
              <Youtube size={44} className="text-white/25" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/25" />

          {/* Play → center + autoplay the video */}
          <button
            type="button"
            onClick={onCenter}
            aria-label={`Play "${short.title}"`}
            className="absolute inset-0 z-10 flex items-center justify-center"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40 ring-1 ring-white/20 backdrop-blur transition active:scale-110">
              <Play size={28} className="ml-1 fill-white text-white" />
            </span>
          </button>

          <div className="absolute bottom-3 right-3 z-20 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-semibold text-white/80 ring-1 ring-white/15">
            {index + 1} / {total}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================
   MOBILE SHORT CARD (native snap-scroll feed)
   Each snap panel fills the viewport; the live embed stays mounted for
   every card within MOBILE_IFRAME_WINDOW of the focused Short so scrolling
   never tears the player down mid-gesture. The video fills the viewer;
   the poster (still frame + play button) only shows outside that window.
============================ */
function MobileShortCard({
  short,
  index,
  total,
  inWindow,
  isFocused,
  onPlay,
}: {
  short: YouTubeShort;
  index: number;
  total: number;
  inWindow: boolean;
  isFocused: boolean;
  onPlay: () => void;
}) {
  const playing = inWindow;
  return (
    <div className="relative h-full min-h-full w-full shrink-0 snap-start overflow-hidden bg-black">
      <div className="absolute inset-0 flex items-center justify-center bg-black pb-[env(safe-area-inset-bottom)]">
        {/* 9:16 frame — sized to contain the full video (never cropped/stretched),
            vertically centered below the mobile header. */}
        <div className="relative aspect-[9/16] h-[min(100%,calc(100vw_*_16_/_9))] max-w-full overflow-hidden bg-black">
          {playing ? (
            /* Sound-on player; only the focused Short attempts autoplay. */
            <ShortPlayer videoId={short.id} title={short.title} active={isFocused} />
          ) : (
            <>
              {short.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={short.thumbnail}
                  alt={short.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                  <Youtube size={44} className="text-white/25" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/25" />

              {/* Play → resume + center this Short */}
              <button
                type="button"
                onClick={onPlay}
                aria-label={`Play "${short.title}"`}
                className="absolute inset-0 z-10 flex items-center justify-center"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40 ring-1 ring-white/20 backdrop-blur transition active:scale-110">
                  <Play size={28} className="ml-1 fill-white text-white" />
                </span>
              </button>
            </>
          )}

          <div className="absolute bottom-3 right-3 z-20 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-semibold text-white/80 ring-1 ring-white/15">
            {index + 1} / {total}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================
   SHORTS FEED
============================ */
export default function YouTubeShortsFeed({
  isPremium = false,
  navRef,
  onSwitchToOrbit,
}: {
  isPremium: boolean;
  navRef?: RefObject<ShortsNavHandle | null> | null;
  onSwitchToOrbit: () => void;
}) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [searchBox, setSearchBox] = useState("");
  const [shorts, setShorts] = useState<YouTubeShort[]>([]);
  const [status, setStatus] = useState<ShortsStatus>("loading");
  const [retryAfter, setRetryAfter] = useState(30);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreMsg, setMoreMsg] = useState<string | null>(null);
  const [emptyNote, setEmptyNote] = useState<string | null>(null);
  const [feedId, setFeedId] = useState(0);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && (window.matchMedia?.("(min-width: 1024px)").matches ?? false)
  );

  const reqSeqRef = useRef(0);
  const shortsRef = useRef(shorts);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardElRefs = useRef<(HTMLDivElement | null)[]>([]);
  const focusIndexRef = useRef(0);
  const rafRef = useRef(0);

  /* Infinite scroll / personalization state (refs so fetches stay reentrant). */
  const loadedIdsRef = useRef<Set<string>>(new Set());
  const nextTokenRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const exhaustedRef = useRef(false);
  const cycleRef = useRef(1);
  const recentQueriesRef = useRef<string[]>([]);
  const watchedRef = useRef<ShortsWatchSignal[]>([]);
  const baseQueryRef = useRef(DEFAULT_QUERY);
  const queryRef = useRef(DEFAULT_QUERY);

  useEffect(() => {
    shortsRef.current = shorts;
  }, [shorts]);

  useEffect(() => {
    focusIndexRef.current = focusIndex;
  }, [focusIndex]);

  /* Track which Shorts the user actually focused (real watching behavior —
     the only personalization signal we have today). Drives refresh direction. */
  useEffect(() => {
    const s = shortsRef.current[focusIndex];
    if (!s || status !== "ready") return;
    watchedRef.current = [
      ...watchedRef.current.filter((w) => w.title !== s.title),
      { title: s.title, channel: s.channel },
    ].slice(-8);
  }, [focusIndex, status]);

  /* React to desktop/tablet breakpoint changes. */
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* Auto-dismiss transient geo/location status messages. */
  useEffect(() => {
    if (!geoMsg) return;
    const t = window.setTimeout(() => setGeoMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [geoMsg]);

  /* Auto-dismiss transient infinite-scroll status messages. */
  useEffect(() => {
    if (!moreMsg) return;
    const t = window.setTimeout(() => setMoreMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [moreMsg]);

  /* ── Request a batch (supersede guards live in the callers). ── */
  type BatchOutcome =
    | { kind: "ok"; shorts: YouTubeShort[]; nextPageToken: string | null }
    | { kind: "error"; status: "rate-limit" | "api" | "network"; retryAfterSec?: number };

  const requestBatch = useCallback(
    async (q: string, opts: { sp?: string | null; fresh?: boolean } = {}): Promise<BatchOutcome> => {
      const params = new URLSearchParams({ q, num: String(BATCH_SIZE) });
      if (opts.sp) params.set("sp", opts.sp);
      if (opts.fresh) params.set("fresh", "1");
      try {
        const res = await fetch(`/api/youtube/shorts?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          return {
            kind: "error",
            status: "rate-limit",
            retryAfterSec: typeof data?.retryAfterSec === "number" ? data.retryAfterSec : 30,
          };
        }
        if (res.status === 401) return { kind: "error", status: "api" };
        if (!res.ok) return { kind: "error", status: "api" };
        const shorts = Array.isArray(data?.shorts) ? (data.shorts as YouTubeShort[]) : [];
        const nextPageToken = typeof data?.nextPageToken === "string" ? data.nextPageToken : null;
        return { kind: "ok", shorts, nextPageToken };
      } catch {
        return { kind: "error", status: "network" };
      }
    },
    []
  );

  /* ── First page: initial mount, a new search, or refresh.
     Fresh loads bypass the cache, mark the old batch seen, keep only
     never-seen Shorts, and rotate the query until something new arrives. ── */
  const loadFirst = useCallback(
    async (baseQuery: string, fresh: boolean) => {
      const seq = ++reqSeqRef.current;

      setStatus("loading");
      setShorts([]);
      setEmptyNote(null);
      setLoadingMore(false);
      setMoreMsg(null);
      loadingMoreRef.current = false;
      exhaustedRef.current = false;
      nextTokenRef.current = null;
      baseQueryRef.current = baseQuery;
      queryRef.current = baseQuery;
      recentQueriesRef.current = [];
      cycleRef.current += 1;
      loadedIdsRef.current = new Set();

      if (fresh) seen.add(shortsRef.current.map((s) => s.id));

      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const q =
          attempt === 0
            ? sanitizeQuery(baseQuery) || DEFAULT_QUERY
            : buildFreshQuery({
                base: baseQuery,
                cycle: cycleRef.current + attempt,
                watched: watchedRef.current,
                recentQueries: recentQueriesRef.current,
              });
        recentQueriesRef.current = [...recentQueriesRef.current, q].slice(-20);

        const res = await requestBatch(q, { fresh });
        if (seq !== reqSeqRef.current) return;

        if (res.kind === "error") {
          if (res.status === "rate-limit") {
            setStatus("rate-limit");
            setRetryAfter(res.retryAfterSec ?? 30);
          } else if (res.status === "network") {
            setStatus("network");
          } else {
            setStatus("api");
          }
          return;
        }

        const freshShorts = res.shorts.filter((s) => !seen.has(s.id));
        if (freshShorts.length === 0) continue; // all seen → rotate query

        seen.add(freshShorts.map((s) => s.id));
        loadedIdsRef.current = new Set(freshShorts.map((s) => s.id));
        queryRef.current = q;
        nextTokenRef.current = res.nextPageToken;
        setQuery(baseQuery);
        setShorts(freshShorts);
        setFeedId((n) => n + 1);
        setStatus("ready");
        return;
      }
      setEmptyNote("You’ve seen everything on this topic so far. Try a different search.");
      setStatus("empty");
    },
    [requestBatch]
  );

  /* Initial mount: load the default feed. */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFirst(DEFAULT_QUERY, false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFirst]);

  /* User-triggered loads always behave like a refresh. */
  const startSearch = useCallback(
    (q: string) => {
      void loadFirst(q, true);
    },
    [loadFirst]
  );

  /* ── Infinite scroll: append the next batch before the feed ends.
     First attempt follows the current query's page token; once that channel
     is exhausted or yields repeats, rotate to a fresh recommended query.
     A request lock + cooldowns stop us from hammering the shared budget. ── */
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (exhaustedRef.current) return;
    const now = Date.now();
    if (now < cooldownUntilRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    const finish = (msg: string | null) => {
      loadingMoreRef.current = false;
      setLoadingMore(false);
      setMoreMsg(msg);
    };

    const maxAttempts = 3;
    let attempt = 0;
    while (attempt < maxAttempts) {
      const useToken = attempt === 0 && nextTokenRef.current;
      const q = useToken
        ? queryRef.current
        : buildFreshQuery({
            base: baseQueryRef.current,
            cycle: cycleRef.current + attempt + 1,
            watched: watchedRef.current,
            recentQueries: recentQueriesRef.current,
          });
      if (!useToken) recentQueriesRef.current = [...recentQueriesRef.current, q].slice(-20);

      const res = await requestBatch(q, { sp: useToken ? nextTokenRef.current : null, fresh: !useToken });

      if (res.kind === "error") {
        if (res.status === "rate-limit") {
          const wait = res.retryAfterSec ?? 30;
          cooldownUntilRef.current = Date.now() + wait * 1000;
          finish(`Rate limit reached — retrying in ${wait}s.`);
        } else {
          cooldownUntilRef.current = Date.now() + 8000;
          finish("Couldn’t load more Shorts right now — we’ll retry as you scroll.");
        }
        return;
      }

      nextTokenRef.current = res.nextPageToken;
      queryRef.current = q; // any token now belongs to this query
      const fresh = res.shorts.filter((s) => !seen.has(s.id));
      if (fresh.length > 0) {
        seen.add(fresh.map((s) => s.id));
        for (const s of fresh) loadedIdsRef.current.add(s.id);
        const current = new Set(shortsRef.current.map((s) => s.id));
        const toAppend = fresh.filter((s) => !current.has(s.id));
        setShorts((prev) => [...prev, ...toAppend]);
        finish(null);
        return;
      }
      nextTokenRef.current = null; // token channel ran dry → rotate next attempt
      attempt += 1;
    }

    exhaustedRef.current = true;
    cooldownUntilRef.current = Date.now() + 20000;
    finish("You’re all caught up — keep scrolling and we’ll find more.");
  }, [requestBatch]);

  /* Fire infinite scroll as the focus approaches the end (scroll + keyboard). */
  const maybeLoadMore = useCallback(() => {
    if (status !== "ready") return;
    if (focusIndexRef.current < shortsRef.current.length - LOAD_MORE_THRESHOLD) return;
    if (exhaustedRef.current && Date.now() < cooldownUntilRef.current) return;
    exhaustedRef.current = false;
    void loadMore();
  }, [status, loadMore]);

  useEffect(() => {
    const timer = window.setTimeout(() => maybeLoadMore(), 0);
    return () => window.clearTimeout(timer);
  }, [focusIndex, maybeLoadMore]);

  /* ── Navigation (both feeds: scroll to a card) ── */
  const centerCard = useCallback((i: number) => {
    const node = cardElRefs.current[i];
    if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
    setFocusIndex(i);
  }, []);

  const goScroll = useCallback(
    (dir: 1 | -1) => {
      const total = shortsRef.current.length;
      const next = Math.min(Math.max(focusIndexRef.current + dir, 0), total - 1);
      if (next === focusIndexRef.current) return;
      centerCard(next);
    },
    [centerCard]
  );

  const navigate = goScroll;

  useEffect(() => {
    if (navRef) {
      navRef.current = { next: () => navigate(1), prev: () => navigate(-1) };
    }
    return () => {
      if (navRef) navRef.current = null;
    };
  }, [navRef, navigate]);

  /* ── Desktop scroll: track the centered card so it keeps autoplaying ── */
  const handleDesktopScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      const center = el.scrollTop + el.clientHeight / 2;
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < cardElRefs.current.length; i++) {
        const node = cardElRefs.current[i];
        if (!node) continue;
        const dist = Math.abs(node.offsetTop + node.offsetHeight / 2 - center);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      setFocusIndex(best);
      maybeLoadMore();
    });
  }, [maybeLoadMore]);

  /* Reset the feed to the top whenever a fresh first page arrives. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || status !== "ready") return;
    el.scrollTop = 0;
    const raf = window.requestAnimationFrame(() => setFocusIndex(0));
    return () => window.cancelAnimationFrame(raf);
  }, [status, feedId]);

  /* ── Keyboard (arrow up/down) ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        navigate(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  /* ── Handlers ── */
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchBox.trim() || DEFAULT_QUERY;
    setQuery(q);
    startSearch(q);
  };

  const handleRefresh = () => {
    void loadFirst(query, true);
  };

  const retry = () => {
    void loadFirst(query, true);
  };

  /* ── Location-aware search ("Near me") — same flow as the Jobs page ── */
  const detectLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoMsg("Location isn’t supported in this browser.");
      return;
    }
    setGeoMsg("Finding Shorts near you…");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(
            `/api/discover/location?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
          );
          const data = await res.json().catch(() => ({}));
          const label = (data as { location?: { label?: string } }).location?.label;
          if (res.ok && label) {
            const city = label.split(",")[0].trim();
            setGeoMsg(city ? `Shorts near ${city}` : null);
            setQuery(city || "trending shorts");
            setSearchBox(city || "trending shorts");
            startSearch(`${city} shorts`);
          } else {
            setGeoMsg("Couldn’t determine your location right now.");
          }
        } catch {
          setGeoMsg("Couldn’t determine your location right now.");
        }
      },
      () => setGeoMsg("Location permission was denied."),
      { timeout: 10000, maximumAge: 300000 }
    );
  }, [startSearch]);

  const formProps = {
    searchBox,
    onSearchBoxChange: setSearchBox,
    status,
    onSubmit: handleSearchSubmit,
    onRefresh: handleRefresh,
    onLocate: detectLocation,
  };

  return (
    <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col overflow-hidden bg-black text-white lg:top-[136px]">
      {isDesktop ? (
        /* ══════════════ DESKTOP: fixed search bar + scrollable video feed ══════════════ */
        <>
          {/* Fixed top controls — above the feed, never overlap the video */}
          <div className="z-20 shrink-0 border-b border-white/5 bg-black/60 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
              <ShortsSelector isPremium={isPremium} onSwitchToOrbit={onSwitchToOrbit} />
              <ShortSearchForm {...formProps} />
            </div>
            {geoMsg && (
              <p className="px-4 pb-2.5 text-center text-xs font-medium text-white/70">{geoMsg}</p>
            )}
          </div>

          {/* Scrollable feed */}
          <div
            ref={scrollRef}
            onScroll={handleDesktopScroll}
            className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain scroll-smooth"
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-8 sm:px-6">
              {status === "loading" && (
                <div className="flex w-full flex-col items-center gap-4 pt-10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]">
                    <Loader2 size={22} className="animate-spin text-amber-200/70" />
                  </div>
                  <div className="aspect-[9/16] h-[52vh] w-auto max-w-full animate-pulse rounded-[2rem] bg-white/[0.06] ring-1 ring-white/10" />
                </div>
              )}

              {(status === "empty" || status === "network" || status === "api" || status === "rate-limit") && (
                <div className="flex w-full justify-center pt-10">
                  {status === "empty" && (
                    <FeedStateCard
                      icon={<AlertTriangle size={26} />}
                      title="No Shorts found"
                      message={emptyNote ?? `We couldn’t find any Shorts for “${query}”. Try a different search.`}
                      actionLabel="Try again"
                      onAction={retry}
                    />
                  )}
                  {status === "network" && (
                    <FeedStateCard
                      icon={<WifiOff size={26} />}
                      title="Network error"
                      message="We couldn’t reach the Shorts service. Check your connection and try again."
                      actionLabel="Try again"
                      onAction={retry}
                    />
                  )}
                  {status === "api" && (
                    <FeedStateCard
                      icon={<AlertTriangle size={26} />}
                      title="Couldn’t load Shorts"
                      message="Something went wrong on our side while fetching Shorts."
                      actionLabel="Try again"
                      onAction={retry}
                    />
                  )}
                  {status === "rate-limit" && (
                    <FeedStateCard
                      icon={<ShieldAlert size={26} />}
                      title="Slow down a little"
                      message={`You’ve reached the Shorts limit for now. Try again in about ${retryAfter} seconds.`}
                      actionLabel="Try again"
                      onAction={retry}
                    />
                  )}
                </div>
              )}

              {status === "ready" &&
                shorts.map((short, i) => (
                  <div
                    key={short.id}
                    ref={(node) => {
                      cardElRefs.current[i] = node;
                    }}
                    className="shrink-0"
                  >
                    <DesktopShortCard
                      short={short}
                      index={i}
                      total={shorts.length}
                      isFocused={i === focusIndex}
                      inWindow={Math.abs(i - focusIndex) <= DESKTOP_IFRAME_WINDOW}
                      onCenter={() => centerCard(i)}
                    />
                  </div>
                ))}
            </div>
          </div>

          {/* Desktop scroll nav chevrons */}
          {status === "ready" && shorts.length > 0 && (
            <div className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3">
              <button
                type="button"
                onClick={() => goScroll(-1)}
                disabled={focusIndex <= 0}
                aria-label="Previous Short"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/60 active:scale-95 disabled:opacity-30"
              >
                <ChevronUp size={20} />
              </button>
              <button
                type="button"
                onClick={() => goScroll(1)}
                disabled={focusIndex >= shorts.length - 1}
                aria-label="Next Short"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/60 active:scale-95 disabled:opacity-30"
              >
                <ChevronDown size={20} />
              </button>
            </div>
          )}
        </>
      ) : (
        /* ══════════════ MOBILE: fixed header above the video + snap-scroll feed ══════════════ */
        <>
          {/* Fixed header — flow layout above the player, never overlapped by it */}
          <div
            className="z-20 shrink-0 border-b border-white/5 bg-black/70 px-3 pb-2.5 backdrop-blur-md"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col items-stretch gap-2">
              <div className="flex justify-center">
<ShortsSelector isPremium={isPremium} onSwitchToOrbit={onSwitchToOrbit} />
              </div>
              <ShortSearchForm {...formProps} />
              {geoMsg && <p className="text-center text-xs font-medium text-white/70">{geoMsg}</p>}
            </div>
          </div>

          {/* Snap-scroll video feed — one Short per viewport, videos keep playing */}
          <div
            ref={scrollRef}
            onScroll={handleDesktopScroll}
            className="relative min-h-0 flex-1 snap-y snap-mandatory overflow-x-hidden overflow-y-auto overscroll-contain bg-black"
          >
            {status === "loading" && (
              <div className="flex h-full min-h-full w-full snap-start flex-col items-center justify-center gap-4 px-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]">
                  <Loader2 size={22} className="animate-spin text-amber-200/70" />
                </div>
                <div className="aspect-[9/16] h-[52vh] w-auto max-w-full animate-pulse rounded-2xl bg-white/[0.06] ring-1 ring-white/10" />
              </div>
            )}

            {(status === "empty" ||
              status === "network" ||
              status === "api" ||
              status === "rate-limit") && (
              <div className="flex h-full min-h-full w-full snap-start items-center justify-center px-4">
                {status === "empty" && (
                  <FeedStateCard
                    icon={<AlertTriangle size={26} />}
                    title="No Shorts found"
                    message={emptyNote ?? `We couldn’t find any Shorts for “${query}”. Try a different search.`}
                    actionLabel="Try again"
                    onAction={retry}
                  />
                )}
                {status === "network" && (
                  <FeedStateCard
                    icon={<WifiOff size={26} />}
                    title="Network error"
                    message="We couldn’t reach the Shorts service. Check your connection and try again."
                    actionLabel="Try again"
                    onAction={retry}
                  />
                )}
                {status === "api" && (
                  <FeedStateCard
                    icon={<AlertTriangle size={26} />}
                    title="Couldn’t load Shorts"
                    message="Something went wrong on our side while fetching Shorts."
                    actionLabel="Try again"
                    onAction={retry}
                  />
                )}
                {status === "rate-limit" && (
                  <FeedStateCard
                    icon={<ShieldAlert size={26} />}
                    title="Slow down a little"
                    message={`You’ve reached the Shorts limit for now. Try again in about ${retryAfter} seconds.`}
                    actionLabel="Try again"
                    onAction={retry}
                  />
                )}
              </div>
            )}

            {status === "ready" &&
              shorts.length > 0 &&
              shorts.map((short, i) => (
                <div
                  key={short.id}
                  ref={(node) => {
                    cardElRefs.current[i] = node;
                  }}
                  className="h-full min-h-full w-full shrink-0 snap-start"
                >
                  <MobileShortCard
                    short={short}
                    index={i}
                    total={shorts.length}
                    inWindow={Math.abs(i - focusIndex) <= MOBILE_IFRAME_WINDOW}
                    isFocused={i === focusIndex}
                    onPlay={() => centerCard(i)}
                  />
                </div>
              ))}
          </div>
        </>
      )}

      {/* Infinite-scroll status pill (transient, never blocks interaction) */}
      {status === "ready" && (loadingMore || moreMsg) && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-40 -translate-x-1/2">
          {loadingMore ? (
            <div className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-xs font-medium text-white/85 ring-1 ring-white/15 backdrop-blur">
              <Loader2 size={14} className="animate-spin text-amber-200/80" />
              Loading more Shorts…
            </div>
          ) : (
            moreMsg && (
              <div className="rounded-full bg-black/70 px-4 py-2 text-xs font-medium text-white/85 ring-1 ring-white/15 backdrop-blur">
                {moreMsg}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}