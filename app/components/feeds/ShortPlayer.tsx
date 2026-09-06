"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Volume2 } from "lucide-react";

/* Minimal typings for the subset of the YouTube IFrame API we use. */
type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (v: number) => void;
  getPlayerState: () => number;
  destroy: () => void;
};

type YouTubePlayerEvent = { target: YouTubePlayer; data?: number };

type YouTubePlayerNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: YouTubePlayerEvent) => void;
        onStateChange?: (e: YouTubePlayerEvent) => void;
        onError?: (e: YouTubePlayerEvent) => void;
      };
    }
  ) => YouTubePlayer;
  PlayerState: { PLAYING: number; PAUSED: number; CUED: number };
};

declare global {
  interface Window {
    YT?: YouTubePlayerNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<YouTubePlayerNamespace> | null = null;

function loadYouTubeIframeApi(): Promise<YouTubePlayerNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube IFrame API is not available on the server."));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube IFrame API did not initialize."));
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      ytApiPromise = null;
      reject(new Error("Failed to load the YouTube IFrame API."));
    };
    document.head.appendChild(script);
  });

  return ytApiPromise;
}

/**
 * Doc-driven, sound-on embed. The player is NEVER force-muted: if the browser
 * blocks autoplay-with-sound, a clear "Tap to play with sound" interaction is
 * shown instead of silently starting muted. Native mute/volume controls are
 * left enabled (controls: 1), so users keep manual audio control.
 *
 * - `active` — when true the video should be playing right now (focused card);
 *   otherwise it stays cued/paused.
 */
export default function ShortPlayer({
  videoId,
  title,
  active = true,
}: {
  videoId: string;
  title: string;
  active?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const activeRef = useRef(active);
  const checkRef = useRef(0);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    let discarded = false;
    let player: YouTubePlayer | null = null;

    const checkNeedsTap = (yt: YouTubePlayerNamespace, p: YouTubePlayer) => {
      if (checkRef.current) window.clearTimeout(checkRef.current);
      checkRef.current = window.setTimeout(() => {
        checkRef.current = 0;
        let state = -1;
        try {
          state = p.getPlayerState();
        } catch {
          /* player is gone — ignore */
        }
        if (state !== yt.PlayerState.PLAYING && playerRef.current === p) {
          setNeedsTap(true);
        }
      }, 1200);
    };

    void loadYouTubeIframeApi()
      .then((yt) => {
        if (discarded || !containerRef.current) return;
        player = new yt.Player(containerRef.current, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: activeRef.current ? 1 : 0,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            controls: 1,
            disablekb: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              player = e.target;
              playerRef.current = e.target;
              setNeedsTap(false);
              if (activeRef.current) {
                try {
                  e.target.playVideo();
                } catch {
                  /* ignore */
                }
                checkNeedsTap(yt, e.target);
              }
            },
            onStateChange: (e) => {
              if (e.data === yt.PlayerState.PLAYING) {
                if (checkRef.current) {
                  window.clearTimeout(checkRef.current);
                  checkRef.current = 0;
                }
                setNeedsTap(false);
              }
            },
            onError: () => {
              setNeedsTap(false);
            },
          },
        });
      })
      .catch(() => {
        /* If the IFrame API fails to load we simply show a static frame. */
      });

    return () => {
      discarded = true;
      if (checkRef.current) {
        window.clearTimeout(checkRef.current);
        checkRef.current = 0;
      }
      if (player) {
        try {
          player.destroy();
        } catch {
          /* ignore */
        }
        player = null;
        playerRef.current = null;
      }
    };
  }, [videoId]);

  /* Play/pause when this card becomes (or stops being) the focused one. */
  useEffect(() => {
    activeRef.current = active;
    const p = playerRef.current;
    if (!p) return;
    if (checkRef.current) {
      window.clearTimeout(checkRef.current);
      checkRef.current = 0;
    }
    if (active) {
      try {
        p.playVideo();
      } catch {
        /* ignore */
      }
      void loadYouTubeIframeApi().then((yt) => {
        if (!activeRef.current) return;
        let state = -1;
        try {
          state = p.getPlayerState();
        } catch {
          /* ignore */
        }
        if (state !== yt.PlayerState.PLAYING) {
          checkRef.current = window.setTimeout(() => {
            checkRef.current = 0;
            let state2 = -1;
            try {
              state2 = p.getPlayerState();
            } catch {
              /* ignore */
            }
            if (state2 !== yt.PlayerState.PLAYING && playerRef.current === p) {
              setNeedsTap(true);
            }
          }, 1200);
        }
      });
    } else {
      try {
        p.pauseVideo();
      } catch {
        /* ignore */
      }
    }
  }, [active]);

  const handleTapToPlay = () => {
    const p = playerRef.current;
    if (!p) return;
    setNeedsTap(false);
    try {
      p.unMute();
      p.playVideo();
    } catch {
      /* ignore */
    }
    if (checkRef.current) {
      window.clearTimeout(checkRef.current);
      checkRef.current = 0;
    }
    void loadYouTubeIframeApi().then((yt) => {
      if (!activeRef.current) return;
      checkRef.current = window.setTimeout(() => {
        checkRef.current = 0;
        let state = -1;
        try {
          state = p.getPlayerState();
        } catch {
          /* ignore */
        }
        if (state !== yt.PlayerState.PLAYING && playerRef.current === p) {
          setNeedsTap(true);
        }
      }, 1200);
    });
  };

  return (
    <div className="relative h-full w-full">
      {/* The IFrame API replaces this container with its own player iframe. */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Autoplay-with-sound was blocked — offer an explicit play/unmute tap. */}
      {needsTap && (
        <button
          type="button"
          onClick={handleTapToPlay}
          aria-label={`Play "${title}" with sound`}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 bg-black/25 transition"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-2xl ring-1 ring-white/40 transition active:scale-110">
            <Play size={24} className="ml-0.5 fill-black text-black" />
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/20 backdrop-blur">
            <Volume2 size={12} />
            Tap to play with sound
          </span>
        </button>
      )}
    </div>
  );
}