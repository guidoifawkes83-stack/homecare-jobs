import { SOURCES } from "../config";
import { fetchJson, plainText } from "../http";
import type { RawJob } from "../types";

type HimalayasJob = {
  title?: string;
  companyName?: string;
  description?: string;
  excerpt?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryPeriod?: string | null;
  currency?: string | null;
  employmentType?: string;
  locationRestrictions?: string[];
  pubDate?: string;
  publishedAt?: string;
  slug?: string;
  url?: string;
  applicationLink?: string;
  guid?: string;
};

type HimalayasResponse = {
  jobs?: HimalayasJob[];
  nextCursor?: string | null;
};

function salaryText(job: HimalayasJob): string | null {
  const { minSalary, maxSalary, currency, salaryPeriod } = job;
  if (minSalary == null && maxSalary == null) return null;

  const low = minSalary ?? maxSalary;
  const high = maxSalary ?? minSalary;
  if (low == null || high == null) return null;
  const formatted = low === high ? `${low}` : `${low}–${high}`;
  return `${currency ?? "USD"} ${formatted} / ${salaryPeriod ?? "year"}`;
}

export async function scrapeHimalayas(): Promise<RawJob[]> {
  const source = SOURCES.find(({ id }) => id === "himalayas");
  if (!source?.endpoint) throw new Error("Himalayas endpoint is not configured.");

  const results: RawJob[] = [];
  let cursor: string | null = null;
  const pageLimit = 3;

  for (let page = 0; page < pageLimit; page += 1) {
    const url = new URL(source.endpoint);
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetchJson<HimalayasResponse>(url.toString());
    if (!Array.isArray(response.jobs)) {
      throw new Error("Himalayas response did not include a jobs list.");
    }

    for (const job of response.jobs) {
      if (!job.title) continue;
      const link =
        job.url ??
        job.applicationLink ??
        (job.slug ? `https://himalayas.app/jobs/${job.slug}` : null) ??
        job.guid;
      if (!link) continue;
      const region = job.locationRestrictions?.join(", ") || null;

      results.push({
        title: job.title,
        company: job.companyName ?? "Company not listed",
        description: plainText(job.description ?? job.excerpt),
        payText: salaryText(job),
        scheduleText: job.employmentType ?? null,
        regionNote: region,
        postedAt: job.pubDate ?? job.publishedAt ?? null,
        url: link,
        sourceId: "himalayas",
      });
    }

    cursor = response.nextCursor ?? null;
    if (!cursor) break;
  }

  return results;
}
