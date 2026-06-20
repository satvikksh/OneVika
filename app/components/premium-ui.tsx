"use client";

import Image from "next/image";
import { Crown } from "lucide-react";
import type { StaticImport } from "next/dist/shared/lib/get-img-props";

type ClassValue = string | null | undefined | false;

function cx(...values: ClassValue[]) {
  return values.filter(Boolean).join(" ");
}

const premiumRingClass =
  "bg-[conic-gradient(from_180deg_at_50%_50%,#fde68a_0deg,#f59e0b_90deg,#f8fafc_180deg,#fbbf24_270deg,#fde68a_360deg)] p-[2px] shadow-[0_0_24px_rgba(251,191,36,0.32)]";

const premiumBadgeClass =
  "inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-gradient-to-r from-amber-300/25 via-yellow-100/15 to-slate-200/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200";

const premiumNameClass =
  "bg-gradient-to-r from-yellow-200 via-amber-300 to-slate-200 bg-clip-text text-transparent";

function getFallbackTextClass(size: number) {
  if (size <= 24) return "text-[10px]";
  if (size <= 32) return "text-xs";
  if (size <= 40) return "text-sm";
  if (size <= 48) return "text-base";
  return "text-lg";
}

export function PremiumBadge({
  className,
  label = "Premium",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span className={cx(premiumBadgeClass, className)}>
      <Crown className="h-3 w-3" />
      {label}
    </span>
  );
}

export function PremiumName({
  name,
  isPremium = false,
  className,
  textClassName,
  showBadge = true,
  badgeClassName,
  badgeLabel,
}: {
  name?: string | null;
  isPremium?: boolean;
  className?: string;
  textClassName?: string;
  showBadge?: boolean;
  badgeClassName?: string;
  badgeLabel?: string;
}) {
  return (
    <span className={cx("inline-flex min-w-0 items-center gap-2", className)}>
      <span
        className={cx(
          "truncate",
          isPremium && premiumNameClass,
          textClassName
        )}
      >
        {name || "Unknown"}
      </span>
      {isPremium && showBadge ? (
        <PremiumBadge className={badgeClassName} label={badgeLabel} />
      ) : null}
    </span>
  );
}

export function PremiumAvatar({
  src,
  alt,
  fallback,
  size = 40,
  isPremium = false,
  className,
  innerClassName,
  imageClassName,
  fallbackClassName,
}: {
  src?: string | StaticImport | null;
  alt: string;
  fallback?: string | null;
  size?: number;
  isPremium?: boolean;
  className?: string;
  innerClassName?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}) {
  const initials = (fallback || alt || "U").trim().charAt(0).toUpperCase() || "U";

  return (
    <div
      className={cx("relative flex-shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <div className={cx("h-full w-full rounded-full", isPremium && premiumRingClass)}>
        <div
          className={cx(
            "flex h-full w-full items-center justify-center overflow-hidden rounded-full",
            isPremium
              ? "bg-gradient-to-br from-stone-950 via-amber-950 to-slate-500 ring-2 ring-amber-50/80"
              : "bg-gradient-to-br from-gray-500 to-gray-800 ring-2 ring-white dark:ring-gray-900",
            innerClassName
          )}
        >
          {src ? (
            <Image
              src={src}
              alt={alt}
              width={size}
              height={size}
              className={cx("h-full w-full object-cover", imageClassName)}
            />
          ) : (
            <span
              className={cx(
                "font-bold text-white",
                getFallbackTextClass(size),
                fallbackClassName
              )}
            >
              {initials}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
