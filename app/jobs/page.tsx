"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  Banknote,
  Bookmark,
  Briefcase,
  Building2,
  Clock,
  ExternalLink,
  Loader2,
  LocateFixed,
  MapPin,
  RotateCw,
  Search,
  ShieldAlert,
  WifiOff,
  X,
} from "lucide-react";
import { PremiumAmbient } from "@/app/components/premium-ambient";
import { useUserAvatar } from "@/app/hooks/useUserAvatar";
import {
  SAVED_JOBS_KEY,
  isSavedJob,
  persistSavedJobs,
  readSavedJobs,
  toggleSavedJob,
  type SavedJobEntry,
} from "@/app/lib/savedJobs";

type JobCardData = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  thumbnail: string | null;
  via: string;
  employmentType: string;
  experienceLevel: string;
  salary: string;
  postedAt: string;
  applyLink: string | null;
  highlights: string[];
};

type GeoState =
  | "idle"
  | "detecting"
  | "detected"
  | "searched"
  | "denied"
  | "unsupported"
  | "failed";

type JobsErrorKind = "network" | "api" | "rate-limit" | "auth" | null;

type FilterOverrides = Partial<{
  q: string;
  location: string;
  remote: "" | "true" | "false";
  employment_type: string;
  experience_level: string;
  date_posted: string;
  sort_by: string;
}>;

const EMPLOYMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACTOR", label: "Contract" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "INTERN", label: "Internship" },
  { value: "VOLUNTEER", label: "Volunteer" },
];

const EXPERIENCE_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: "ENTRY_LEVEL", label: "Entry Level" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MID_LEVEL", label: "Mid Level" },
  { value: "SENIOR", label: "Senior" },
  { value: "MANAGER", label: "Manager" },
  { value: "EXECUTIVE", label: "Executive" },
];

const REMOTE_OPTIONS: { value: "" | "true" | "false"; label: string }[] = [
  { value: "", label: "Any" },
  { value: "false", label: "On-site" },
  { value: "true", label: "Remote" },
];

/* ============================
   JOB CARD
============================ */
function JobCard({
  job,
  saved,
  onToggleSave,
  isPremium,
}: {
  job: JobCardData;
  saved: boolean;
  onToggleSave: (jobId: string) => void;
  isPremium: boolean;
}) {
  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-all duration-300 hover:-translate-y-0.5 sm:p-5 ${
        isPremium ? "premium-card" : "hover:border-white/20"
      }`}
    >
      <div className="flex items-start gap-3.5">
        {job.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={job.thumbnail}
            alt={job.company}
            loading="lazy"
            className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] text-sm font-bold text-amber-200/90 ring-1 ring-white/10">
            {job.company ? job.company.slice(0, 2).toUpperCase() : <Briefcase size={18} />}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-white">
              {job.title}
            </h3>
            <button
              type="button"
              onClick={() => onToggleSave(job.id)}
              aria-label={saved ? "Remove from saved jobs" : "Save job"}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition active:scale-90 ${
                saved
                  ? "bg-amber-400/15 text-amber-300 ring-amber-300/30"
                  : "bg-white/[0.05] text-white/40 ring-white/10 hover:text-white/70 hover:ring-white/20"
              }`}
            >
              <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {job.company && (
              <span className="inline-flex items-center gap-1 font-medium text-white/80">
                <Building2 size={13} />
                {job.company}
              </span>
            )}
            {job.via && <span className="text-xs text-white/35">via {job.via}</span>}
          </div>

          {(job.salary || job.employmentType || job.experienceLevel) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {job.salary && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300/90 ring-1 ring-emerald-400/20">
                  <Banknote size={11} />
                  {job.salary}
                </span>
              )}
              {job.employmentType && (
                <span className="inline-flex items-center rounded-full bg-cyan-400/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300/90 ring-1 ring-cyan-400/20">
                  {job.employmentType}
                </span>
              )}
              {job.experienceLevel && (
                <span className="inline-flex items-center rounded-full bg-violet-400/10 px-2 py-0.5 text-[11px] font-medium text-violet-300/90 ring-1 ring-violet-400/20">
                  {job.experienceLevel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
        {job.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} />
            {job.location}
          </span>
        )}
        {job.postedAt && (
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {job.postedAt}
          </span>
        )}
      </div>

      {job.description && (
        <p className="line-clamp-2 text-sm leading-relaxed text-white/50">{job.description}</p>
      )}

      {job.highlights.length > 0 && (
        <ul className="flex flex-col gap-1">
          {job.highlights.slice(0, 3).map((line, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-white/45">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-200/60" />
              <span className="line-clamp-1">{line}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center gap-2 pt-1">
        {job.applyLink ? (
          <a
            href={job.applyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgba(168,85,247,0.5)] transition hover:opacity-90 active:scale-95"
          >
            Apply
            <ExternalLink size={14} />
          </a>
        ) : (
          <span className="rounded-xl bg-white/[0.06] px-4 py-2 text-xs text-white/35">
            Apply on source
          </span>
        )}
      </div>
    </article>
  );
}

/* ============================
   SKELETON
============================ */
function JobSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.07]" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-20 animate-pulse rounded-full bg-white/[0.07]" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-white/[0.07]" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-white/[0.07]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.07]" />
      </div>
      <div className="h-9 w-24 animate-pulse rounded-xl bg-white/[0.07]" />
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
export default function JobsPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const { isPremium } = useUserAvatar();

  const [query, setQuery] = useState("");
  const [locationText, setLocationText] = useState("");
  const [remote, setRemote] = useState<"" | "true" | "false">("");
  const [employmentType, setEmploymentType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [datePosted, setDatePosted] = useState("");
  const [sortBy, setSortBy] = useState("relevance");

  const [jobs, setJobs] = useState<JobCardData[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [jobsError, setJobsError] = useState<JobsErrorKind>(null);
  const [retryAfter, setRetryAfter] = useState(30);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searchedLocation, setSearchedLocation] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [locationResolveFailed, setLocationResolveFailed] = useState(false);

  const [savedJobs, setSavedJobs] = useState<SavedJobEntry[]>([]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);

  const runSearch = useCallback(
    async (
      opts: { start?: string; append?: boolean; overrides?: FilterOverrides } = {}
    ) => {
      const { start, append = false, overrides } = opts;

      const q = overrides?.q !== undefined ? overrides.q : query;
      const loc = overrides?.location !== undefined ? overrides.location : locationText;
      const remoteV = overrides?.remote !== undefined ? overrides.remote : remote;
      const empV = overrides?.employment_type !== undefined ? overrides.employment_type : employmentType;
      const expV = overrides?.experience_level !== undefined ? overrides.experience_level : experienceLevel;
      const dateV = overrides?.date_posted !== undefined ? overrides.date_posted : datePosted;
      const sortV = overrides?.sort_by !== undefined ? overrides.sort_by : sortBy;

      const trimmedQ = q.trim();
      const trimmedLoc = loc.trim();
      if (!trimmedQ && !start) return;

      const seq = ++requestSeqRef.current;
      if (start) setLoadingMore(true);
      else setJobsLoading(true);
      setJobsError(null);

      const params = new URLSearchParams();
      if (trimmedQ) params.set("q", trimmedQ);
      if (trimmedLoc) params.set("location", trimmedLoc);
      if (remoteV) params.set("remote", remoteV);
      if (empV) params.set("employment_type", empV);
      if (expV) params.set("experience_level", expV);
      if (dateV) params.set("date_posted", dateV);
      if (sortV) params.set("sort_by", sortV);
      if (start) params.set("next_page_token", start);

      try {
        const res = await fetch(`/api/jobs?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (seq !== requestSeqRef.current) return;

        if (res.status === 429) {
          setJobsError("rate-limit");
          setRetryAfter(typeof data?.retryAfterSec === "number" ? data.retryAfterSec : 30);
          return;
        }
        if (res.status === 401) {
          setJobsError("auth");
          return;
        }
        if (!res.ok) {
          setJobsError("api");
          return;
        }

        const incoming: JobCardData[] = Array.isArray(data?.jobs) ? data.jobs : [];
        setJobs((prev) => (append ? [...prev, ...incoming] : incoming));
        setHasMore(Boolean(data?.hasMore));
        setNextPageToken(typeof data?.nextPageToken === "string" ? data.nextPageToken : null);

        if (!append) {
          setSearchedQuery(trimmedQ);
          setSearchedLocation(
            typeof data?.location === "string" && data.location ? data.location : trimmedLoc
          );
          setGeoState("searched");
        }
      } catch {
        if (seq !== requestSeqRef.current) return;
        setJobsError("network");
      } finally {
        if (seq === requestSeqRef.current) {
          setJobsLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [query, locationText, remote, employmentType, experienceLevel, datePosted, sortBy]
  );

  const runSearchRef = useRef(runSearch);
  useEffect(() => {
    runSearchRef.current = runSearch;
  }, [runSearch]);

  /* ── Location detection ── */
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
            const label: string = data.location.label;
            const city = label.split(",")[0].trim();
            setLocationText(label);
            setGeoState("detected");
            if (city) {
              setQuery(city);
              runSearchRef.current({ overrides: { q: city, location: label } });
            }
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
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") {
      void detectLocation();
    }
  }, [authStatus, detectLocation]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  /* ── Saved jobs (localStorage) ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSavedJobs(readSavedJobs());
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVED_JOBS_KEY) setSavedJobs(readSavedJobs());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleToggleSave = (jobId: string) => {
    const next = toggleSavedJob(savedJobs, jobId);
    setSavedJobs(next);
    persistSavedJobs(next);
  };

  /* ── Inputs ── */
  const handleQueryChange = (v: string) => {
    setQuery(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const trimmed = v.trim();
    if (!trimmed) return;
    searchTimerRef.current = setTimeout(() => {
      runSearchRef.current({ overrides: { q: trimmed } });
    }, 550);
  };

  const handleLocationChange = (v: string) => {
    setLocationText(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const trimmed = v.trim();
    if (!trimmed) return;
    searchTimerRef.current = setTimeout(() => {
      runSearchRef.current({ overrides: { location: trimmed } });
    }, 550);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    runSearchRef.current();
  };

  const applyFilters = (patch: FilterOverrides) => {
    if (patch.remote !== undefined) setRemote(patch.remote);
    if (patch.employment_type !== undefined) setEmploymentType(patch.employment_type);
    if (patch.experience_level !== undefined) setExperienceLevel(patch.experience_level);
    if (patch.date_posted !== undefined) setDatePosted(patch.date_posted);
    if (patch.sort_by !== undefined) setSortBy(patch.sort_by);
    runSearchRef.current({ overrides: patch });
  };

  const hasActiveFilters =
    Boolean(remote) ||
    Boolean(employmentType) ||
    Boolean(experienceLevel) ||
    Boolean(datePosted) ||
    sortBy !== "relevance";

  const handleClearFilters = () => {
    applyFilters({
      remote: "",
      employment_type: "",
      experience_level: "",
      date_posted: "",
      sort_by: "relevance",
    });
  };

  const handleLoadMore = () => {
    if (!nextPageToken || loadingMore) return;
    runSearchRef.current({ start: nextPageToken, append: true });
  };

  const handleRefresh = () => {
    runSearchRef.current();
  };

  const retryJobs = () => {
    runSearchRef.current();
  };

  const isDetecting = geoState === "idle" || geoState === "detecting";
  const locationBlocked =
    geoState === "denied" || geoState === "unsupported" || (geoState === "failed" && !locationText);
  const hasRunSearch = Boolean(searchedQuery);
  const emptyResults = !jobsLoading && !jobsError && hasRunSearch && jobs.length === 0;

  /* ── Loading / unauth gates ── */
  if (authStatus === "loading") {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#020617,#050505)] px-4 py-10 text-white">
        <PremiumAmbient />
        <div className="relative z-10 flex flex-col items-center justify-center gap-3 py-24">
          <Loader2 className="h-6 w-6 animate-spin text-amber-200/70" />
          <p className="text-sm text-white/50">Loading Jobs…</p>
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
            title="Sign in to browse Jobs"
            message="You need an OrbitByte account to search for jobs and save openings."
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

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6">
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
              <Briefcase size={18} />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Jobs</h1>
              <p className="text-sm text-white/45">
                Open roles near you, personalised by your location.
              </p>
            </div>
          </div>
        </header>

        {/* ── Current location + search ── */}
        <section
          className={`rounded-2xl border p-4 sm:p-5 ${
            isPremium
              ? "border-amber-300/25 bg-amber-300/[0.06] shadow-[0_10px_36px_-18px_rgba(184,134,11,0.4)]"
              : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/20">
                <MapPin size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  {geoState === "detecting"
                    ? "Detecting location"
                    : geoState === "detected"
                      ? "Jobs near you"
                      : "Search area"}
                </p>
                <p className="mt-0.5 truncate text-lg font-bold tracking-tight text-white sm:text-xl">
                  {geoState === "detecting" ? "Locating you…" : locationText || "Where do you want to work?"}
                </p>
                {(geoState === "detected" || geoState === "searched") && locationText && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/40">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-emerald-300/90">
                      <LocateFixed size={11} />
                      {geoState === "detected" ? "Auto-detected" : "Your selection"}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Search form */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Role, skill, or company — e.g. software engineer"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/20"
                />
              </div>
              <div className="relative sm:w-56">
                <MapPin
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  placeholder="City, e.g. Bhopal"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-24 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/20"
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
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgba(168,85,247,0.5)] transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                disabled={jobsLoading}
              >
                <Search size={15} />
                Search
              </button>
            </form>
          </div>

          {/* Location status hints */}
          {geoState === "detecting" && (
            <p className="mt-3 flex items-center gap-2 text-xs text-white/45">
              <Loader2 size={13} className="animate-spin text-amber-200/70" />
              Using your browser location to find open roles nearby…
            </p>
          )}

          {geoState === "denied" && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-400/10 px-3 py-2.5 text-xs text-amber-100/90 ring-1 ring-amber-300/20">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
              <span>
                Location permission was denied. Allow location access in your browser to auto-detect
                your city, or type a location above.
              </span>
            </div>
          )}

          {geoState === "unsupported" && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-400/10 px-3 py-2.5 text-xs text-amber-100/90 ring-1 ring-amber-300/20">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
              <span>Location detection is not supported on this device. Search for a location above.</span>
            </div>
          )}

          {(locationResolveFailed || (geoState === "failed" && !locationText)) && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-400/10 px-3 py-2.5 text-xs text-rose-100/90 ring-1 ring-rose-300/20">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-300" />
              <span>We couldn’t resolve your coordinates. Search for a location above instead.</span>
            </div>
          )}
        </section>

        {/* ── Filters ── */}
        <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Filters
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/60 transition hover:bg-white/[0.08] active:scale-95"
              >
                <X size={12} />
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-6">
            <div className="col-span-2 flex flex-col gap-1">
              <span className="text-xs text-white/40">Remote</span>
              <div className="flex rounded-xl border border-white/10 bg-black/40 p-1">
                {REMOTE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => applyFilters({ remote: opt.value })}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                      remote === opt.value
                        ? "bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/30"
                        : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {([
              {
                label: "Employment type",
                value: employmentType,
                options: EMPLOYMENT_TYPE_OPTIONS,
                key: "employment_type",
              },
              {
                label: "Experience",
                value: experienceLevel,
                options: EXPERIENCE_LEVEL_OPTIONS,
                key: "experience_level",
              },
            ] as const).map((cfg) => (
              <div key={cfg.key} className="flex flex-col gap-1">
                <span className="text-xs text-white/40">{cfg.label}</span>
                <select
                  value={cfg.value}
                  onChange={(e) => applyFilters({ [cfg.key]: e.target.value } as FilterOverrides)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-white outline-none transition focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/20 [&>option]:bg-gray-900"
                >
                  <option value="">Any</option>
                  {cfg.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div className="flex flex-col gap-1">
              <span className="text-xs text-white/40">Date posted</span>
              <select
                value={datePosted}
                onChange={(e) => applyFilters({ date_posted: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-white outline-none transition focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/20 [&>option]:bg-gray-900"
              >
                <option value="">Any time</option>
                <option value="today">Past day</option>
                <option value="3days">Past 3 days</option>
                <option value="week">Past week</option>
                <option value="month">Past month</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-white/40">Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => applyFilters({ sort_by: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-white outline-none transition focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/20 [&>option]:bg-gray-900"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Most recent</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── Results ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-amber-200/80 ring-1 ring-white/10">
                <Briefcase size={15} />
              </span>
              <h2 className="text-lg font-bold tracking-tight">Open Roles</h2>
              {hasRunSearch && !isDetecting && (
                <span className="hidden truncate text-sm text-white/40 sm:inline">
                  for{" "}
                  <span className="font-semibold text-white/70">
                    {searchedQuery}
                    {searchedLocation && (
                      <>
                        {" "}
                        in <span className="text-white/70">{searchedLocation}</span>
                      </>
                    )}
                  </span>
                </span>
              )}
            </div>

            {hasRunSearch && !jobsLoading && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={jobsLoading || loadingMore}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-50"
              >
                <RotateCw size={13} />
                Refresh
              </button>
            )}
          </div>

          {jobs.length > 0 && !jobsLoading && (
            <p className="-mt-1 text-xs text-white/35">
              Showing {jobs.length} job{jobs.length === 1 ? "" : "s"}
              {hasMore ? " · use “Load more” for additional openings" : ""}
            </p>
          )}

          {/* Loading skeletons */}
          {jobsLoading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <JobSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Errors */}
          {!jobsLoading && jobsError === "network" && (
            <StateCard
              icon={<WifiOff size={26} />}
              title="Network error"
              message="We couldn’t reach the jobs service. Check your connection and try again."
              actionLabel="Try again"
              onAction={retryJobs}
            />
          )}

          {!jobsLoading && jobsError === "api" && (
            <StateCard
              icon={<AlertTriangle size={26} />}
              title="Couldn’t load jobs"
              message="Something went wrong on our side while searching for these jobs."
              actionLabel="Try again"
              onAction={retryJobs}
            />
          )}

          {!jobsLoading && jobsError === "rate-limit" && (
            <StateCard
              icon={<ShieldAlert size={26} />}
              title="Slow down a little"
              message={`You’ve reached the jobs limit for now. Try again in about ${retryAfter} seconds.`}
              actionLabel="Try again"
              onAction={retryJobs}
            />
          )}

          {!jobsLoading && jobsError === "auth" && (
            <StateCard
              icon={<ShieldAlert size={26} />}
              title="Session expired"
              message="Please sign in again to keep browsing jobs."
              actionLabel="Go to login"
              onAction={() => router.push("/login")}
            />
          )}

          {/* Prompt before first search */}
          {!jobsLoading && !jobsError && !hasRunSearch && (
            <StateCard
              icon={<Search size={26} />}
              title="Find your next role"
              message="Search by role, skill, or company — and add a location to see nearby openings."
            />
          )}

          {/* Empty */}
          {!jobsLoading && !jobsError && emptyResults && (
            <StateCard
              icon={<Briefcase size={26} />}
              title="No jobs found"
              message={`We couldn’t find any openings for “${searchedQuery}”${searchedLocation ? ` in ${searchedLocation}` : ""}. Try a different search or remove some filters.`}
            />
          )}

          {/* Job grid */}
          {!jobsLoading && !jobsError && jobs.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  saved={isSavedJob(savedJobs, job.id)}
                  onToggleSave={handleToggleSave}
                  isPremium={isPremium}
                />
              ))}
            </div>
          )}

          {/* Load more */}
          {!jobsLoading && !jobsError && hasMore && jobs.length > 0 && (
            <div className="flex justify-center pb-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-6 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/20 active:scale-95 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load more"
                )}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}