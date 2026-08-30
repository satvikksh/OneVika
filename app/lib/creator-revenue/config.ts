import {
  METRIC_KEYS,
  CreatorMetricKey,
  isMetricKey,
} from "./constants";
import {
  defaultRevenueConfiguration,
  MetricNormalizationRule,
} from "@/app/models/RevenueConfiguration";

export interface WeightValidationResult {
  ok: boolean;
  total: number;
  errors: string[];
}

export function validateWeights(
  weights: Record<CreatorMetricKey, unknown>
): WeightValidationResult {
  const errors: string[] = [];
  let total = 0;

  for (const key of METRIC_KEYS) {
    const value = weights[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(`Weight '${key}' must be a number`);
      continue;
    }
    if (value < 0) {
      errors.push(`Weight '${key}' cannot be negative`);
    }
    total += value;
  }

  if (Math.abs(total - 100) > 1e-9) {
    errors.push("Total weight must equal exactly 100%");
  }

  const uniqueKeys = new Set(Object.keys(weights).filter(isMetricKey));
  if (uniqueKeys.size !== METRIC_KEYS.length) {
    errors.push("Every metric must have exactly one weight defined");
  }

  return { ok: errors.length === 0, total, errors };
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function validateNormalization(
  normalization: Record<CreatorMetricKey, unknown>
): string[] {
  const errors: string[] = [];

  for (const key of METRIC_KEYS) {
    const rule = normalization[key] as Record<string, unknown> | undefined;
    if (!rule || typeof rule !== "object") {
      errors.push(`Normalization rule '${key}' is missing`);
      continue;
    }
    const weight = asNumber(rule.weight, 0);
    if (weight < 0 || weight > 100) {
      errors.push(`Normalization weight '${key}' must be between 0 and 100`);
    }
    const rateCap = asNumber(rule.rateCap, 1);
    if (rateCap <= 0 || rateCap > 1) {
      errors.push(`Rate cap '${key}' must be between 0 (exclusive) and 1`);
    }
    const curvePower = asNumber(rule.curvePower, 1);
    if (curvePower <= 0 || curvePower > 10) {
      errors.push(`Curve power '${key}' must be between 0 (exclusive) and 10`);
    }
    const minCount = asNumber(rule.minCount, 0);
    if (minCount < 0 || !Number.isInteger(minCount)) {
      errors.push(`Min count '${key}' must be a non-negative integer`);
    }
  }

  return errors;
}

export function validateConfigurationPatch(input: Record<string, unknown>) {
  const errors: string[] = [];
  const normalized: Record<string, unknown> = {};

  if (input.enabled !== undefined) {
    if (typeof input.enabled !== "boolean") {
      errors.push("enabled must be a boolean");
    } else {
      normalized.enabled = input.enabled;
    }
  }

  if (input.weights !== undefined) {
    const res = validateWeights(input.weights as Record<CreatorMetricKey, unknown>);
    errors.push(...res.errors.map((e) => `weights: ${e}`));
    if (res.ok) normalized.weights = input.weights;
  }

  if (input.normalization !== undefined) {
    const normErrors = validateNormalization(
      input.normalization as Record<CreatorMetricKey, unknown>
    );
    errors.push(...normErrors.map((e) => `normalization: ${e}`));
    if (normErrors.length === 0) normalized.normalization = input.normalization;
  }

  if (input.minimumWithdrawalPaise !== undefined) {
    const paise = asNumber(input.minimumWithdrawalPaise, -1);
    if (!Number.isInteger(paise) || paise < 1) {
      errors.push("minimumWithdrawalPaise must be an integer of at least 1");
    } else {
      normalized.minimumWithdrawalPaise = paise;
    }
  }

  if (input.eligibility !== undefined && typeof input.eligibility === "object") {
    normalized.eligibility = input.eligibility;
  }
  if (input.viewQuality !== undefined && typeof input.viewQuality === "object") {
    normalized.viewQuality = input.viewQuality;
  }
  if (input.commentQuality !== undefined && typeof input.commentQuality === "object") {
    normalized.commentQuality = input.commentQuality;
  }
  if (input.pool !== undefined && typeof input.pool === "object") {
    normalized.pool = input.pool;
  }

  return { errors, normalized };
}

export function sanitizeStoredConfig(
  stored: Partial<RevenueConfigurationLike>
): ReturnType<typeof defaultRevenueConfiguration> {
  const base = defaultRevenueConfiguration();
  if (!stored || typeof stored !== "object") return base;

  const weights = Object.fromEntries(
    METRIC_KEYS.map((key) => {
      const value = stored.weights?.[key];
      return [key, typeof value === "number" ? value : base.weights[key]];
    })
  ) as Record<CreatorMetricKey, number>;
  if (!validateWeights(weights).ok) {
    Object.assign(weights, base.weights);
  }

  const normalization = Object.fromEntries(
    METRIC_KEYS.map((key) => {
      const rule = stored.normalization?.[key];
      const fallback = base.normalization[key];
      if (!rule || typeof rule !== "object") return [key, { ...fallback }];
      return [
        key,
        {
          weight:
            typeof rule.weight === "number" ? rule.weight : fallback.weight,
          rateCap:
            typeof rule.rateCap === "number" ? rule.rateCap : fallback.rateCap,
          curvePower:
            typeof rule.curvePower === "number"
              ? rule.curvePower
              : fallback.curvePower,
          minCount:
            typeof rule.minCount === "number" ? rule.minCount : fallback.minCount,
        } satisfies MetricNormalizationRule,
      ];
    })
  ) as Record<CreatorMetricKey, MetricNormalizationRule>;

  return {
    ...base,
    enabled: typeof stored.enabled === "boolean" ? stored.enabled : base.enabled,
    weights,
    normalization,
    viewQuality: mergeObject(base.viewQuality, stored.viewQuality),
    commentQuality: mergeObject(base.commentQuality, stored.commentQuality),
    eligibility: mergeObject(base.eligibility, stored.eligibility),
    pool: mergeObject(base.pool, stored.pool),
    minimumWithdrawalPaise:
      typeof stored.minimumWithdrawalPaise === "number"
        ? stored.minimumWithdrawalPaise
        : base.minimumWithdrawalPaise,
  };
}

function mergeObject<T extends Record<string, unknown>>(fallback: T, value?: Partial<T> | null): T {
  if (!value || typeof value !== "object") return { ...fallback };
  const merged = { ...fallback };
  for (const key of Object.keys(merged) as (keyof T)[]) {
    const incoming = value[key];
    if (incoming !== undefined && incoming !== null) {
      (merged as Record<string, unknown>)[key as string] = incoming;
    }
  }
  return merged;
}

export type RevenueConfigurationLike = {
  enabled?: boolean;
  weights?: Partial<Record<CreatorMetricKey, number>>;
  normalization?: Partial<Record<CreatorMetricKey, Partial<MetricNormalizationRule>>>;
  viewQuality?: Record<string, unknown>;
  commentQuality?: Record<string, unknown>;
  eligibility?: Record<string, unknown>;
  pool?: Record<string, unknown>;
  minimumWithdrawalPaise?: number;
};