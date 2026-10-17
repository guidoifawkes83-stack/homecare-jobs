import {
  AGENCY_COMPANIES,
  CARE_SIGNALS,
  CURRENCY_RATES,
  EXCLUSIONS,
  ROLE_SIGNALS,
  SOFTWARE_TAGS,
  TITLE_EXCLUSIONS,
} from "../../scrapers/config";
import type { ProcessedJob, RawJob } from "../../scrapers/types";

const exclusionPatterns = EXCLUSIONS.map((pattern) => new RegExp(pattern, "i"));
const titleExclusionPatterns = TITLE_EXCLUSIONS.map(
  (pattern) => new RegExp(pattern, "i"),
);

export function makeDedupeKey(company: string, title: string): string {
  const normalize = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("en")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .replace(/\s+/g, " ");

  return `${normalize(company)}|${normalize(title)}`;
}

export function getJobMatchResult(
  job: Pick<RawJob, "title" | "description">,
): {
  matched: boolean;
  matchedSignal: string | null;
  rejectionReason: string | null;
} {
  const normalizedTitle = job.title.toLocaleLowerCase();
  const matchedSignal =
    ROLE_SIGNALS.find((signal) =>
      normalizedTitle.includes(signal.toLocaleLowerCase()),
    ) ?? null;
  const matchedCareSignal =
    CARE_SIGNALS.find((signal) =>
      normalizedTitle.includes(signal.toLocaleLowerCase()),
    ) ?? null;

  if (!matchedSignal || !matchedCareSignal) {
    const rejectionReason = !matchedSignal
      ? `Title has none of the required role signals: ${ROLE_SIGNALS.join(", ")}.`
      : `Title has none of the required care signals: ${CARE_SIGNALS.join(", ")}.`;
    return {
      matched: false,
      matchedSignal,
      rejectionReason,
    };
  }

  const searchable = `${job.title} ${job.description}`;
  const exclusion = exclusionPatterns.find((pattern) => pattern.test(searchable));
  if (exclusion) {
    return {
      matched: false,
      matchedSignal,
      rejectionReason: `Matched exclusion rule: ${exclusion.source}`,
    };
  }

  const titleExclusion = titleExclusionPatterns.find((pattern) =>
    pattern.test(job.title),
  );
  if (titleExclusion) {
    return {
      matched: false,
      matchedSignal,
      rejectionReason: `Matched title exclusion rule: ${titleExclusion.source}`,
    };
  }

  return { matched: true, matchedSignal, rejectionReason: null };
}

export function isMatchingJob(job: Pick<RawJob, "title" | "description">) {
  return getJobMatchResult(job).matched;
}

function parseAmount(value: string): number | null {
  const normalized = value.replace(/,/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function normalizePay(payText: string | null): {
  min: number | null;
  max: number | null;
} {
  if (!payText) return { min: null, max: null };

  const text = payText.replace(/–|—/g, "-");
  const range = text.match(
    /(?:USD|AUD|PHP|₱|\$)\s*([\d,]+(?:\.\d+)?)\s*(?:-|to)\s*(?:(?:USD|AUD|PHP|₱|\$)\s*)?([\d,]+(?:\.\d+)?)/i,
  );
  const single = range
    ? null
    : text.match(/(?:USD|AUD|PHP|₱|\$)\s*([\d,]+(?:\.\d+)?)/i);
  const first = parseAmount(range?.[1] ?? single?.[1] ?? "");
  const second = range ? parseAmount(range[2]) : first;

  if (first === null || second === null) return { min: null, max: null };

  const currency = /\bAUD\b/i.test(text)
    ? "AUD"
    : /\bPHP\b|₱/i.test(text)
      ? "PHP"
      : /\bUSD\b|\$/i.test(text)
        ? "USD"
        : null;

  if (!currency) return { min: null, max: null };

  const monthly = /\b(?:month|monthly|mo\.?)\b/i.test(text);
  const hourly = /\b(?:hour|hourly|hr\.?|\/h)\b/i.test(text);
  if (!monthly && !hourly) return { min: null, max: null };

  const toUsd = (amount: number) =>
    currency === "AUD"
      ? amount * CURRENCY_RATES.usdPerAud
      : currency === "PHP"
        ? amount / CURRENCY_RATES.phpPerUsd
        : amount;
  const toHourly = (amount: number) =>
    toUsd(amount) / (monthly ? CURRENCY_RATES.hoursPerMonth : 1);

  return {
    min: Number(toHourly(Math.min(first, second)).toFixed(2)),
    max: Number(toHourly(Math.max(first, second)).toFixed(2)),
  };
}

function classifyPoster(company: string, description: string): ProcessedJob["poster_type"] {
  const normalizedCompany = company.toLocaleLowerCase();
  if (/\bhunt st\b/i.test(company)) return "direct";
  if (AGENCY_COMPANIES.some((agency) => normalizedCompany.includes(agency.toLocaleLowerCase()))) {
    return "agency";
  }
  if (
    /\bwork directly with (?:the )?(?:owner|care provider)\b|\bwe are (?:a|an) (?:home care|home health|senior care) (?:provider|agency)\b|\bour home care (?:agency|company)\b/i.test(
      `${company}\n${description}`,
    )
  ) {
    return "direct";
  }
  return "unknown";
}

function detectSoftware(description: string): string[] {
  return SOFTWARE_TAGS.filter((software) =>
    new RegExp(`\\b${software.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(description),
  );
}

function philippinesEligible(region: string | null, description: string): boolean {
  return /\b(?:philippines|philippine|worldwide|anywhere|global|apac|asia[- ]pacific)\b/i.test(
    `${region ?? ""}\n${description}`,
  );
}

function scoreJob({
  posterType,
  software,
  pay,
  region,
  description,
  postedAt,
}: {
  posterType: ProcessedJob["poster_type"];
  software: string[];
  pay: ReturnType<typeof normalizePay>;
  region: string | null;
  description: string;
  postedAt: string | null;
}): number {
  let score = 0;
  if (posterType === "direct") score += 30;
  if (posterType === "agency") score -= 30;
  if (software.some((tag) => tag === "WellSky" || tag === "AxisCare")) score += 20;
  if (pay.min !== null && pay.min >= 6) score += 20;
  if (pay.max !== null && pay.max < 5) score -= 20;
  if (philippinesEligible(region, description)) score += 15;

  if (postedAt) {
    const published = Date.parse(postedAt);
    if (Number.isFinite(published) && Date.now() - published <= 7 * 24 * 60 * 60 * 1000) {
      score += 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

export function processJob(job: RawJob): ProcessedJob | null {
  const title = job.title.trim();
  const company = job.company.trim() || "Company not listed";
  if (!title || !job.url || !isMatchingJob({ title, description: job.description })) {
    return null;
  }

  const pay = normalizePay(job.payText);
  const posterType = classifyPoster(company, job.description);
  const software = detectSoftware(job.description);

  return {
    dedupe_key: makeDedupeKey(company, title),
    title,
    company,
    description: job.description,
    pay_text: job.payText,
    pay_usd_hourly_min: pay.min,
    pay_usd_hourly_max: pay.max,
    schedule_text: job.scheduleText,
    poster_type: posterType,
    software,
    region_note: job.regionNote,
    score: scoreJob({
      posterType,
      software,
      pay,
      region: job.regionNote,
      description: job.description,
      postedAt: job.postedAt,
    }),
    posted_at: job.postedAt,
    is_active: true,
    sources: [{ sourceId: job.sourceId, url: job.url }],
  };
}

export function mergeDuplicateJobs(jobs: ProcessedJob[]): ProcessedJob[] {
  const byKey = new Map<string, ProcessedJob>();

  for (const job of jobs) {
    const existing = byKey.get(job.dedupe_key);
    if (!existing) {
      byKey.set(job.dedupe_key, {
        ...job,
        sources: [...job.sources],
      });
      continue;
    }

    const sourceLinks = new Map(
      [...existing.sources, ...job.sources].map((source) => [
        source.sourceId,
        source,
      ]),
    );
    existing.sources = [...sourceLinks.values()];
    if (existing.description.length < job.description.length) {
      existing.description = job.description;
    }
    existing.software = [...new Set([...existing.software, ...job.software])];
    existing.score = Math.max(existing.score, job.score);
    if (!existing.pay_text && job.pay_text) {
      existing.pay_text = job.pay_text;
      existing.pay_usd_hourly_min = job.pay_usd_hourly_min;
      existing.pay_usd_hourly_max = job.pay_usd_hourly_max;
    }
  }

  return [...byKey.values()].sort((left, right) => right.score - left.score);
}
