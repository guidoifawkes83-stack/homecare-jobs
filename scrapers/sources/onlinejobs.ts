import { load } from "cheerio";
import { getJobMatchResult } from "../../src/lib/processing";
import { SOURCES } from "../config";
import { fetchText, plainText } from "../http";
import type { RawJob } from "../types";

const SEARCH_TERMS = [
  "home care scheduler",
  "homecare scheduler",
  "caregiver scheduler",
  "scheduling coordinator",
  "rostering coordinator",
  "care coordinator",
  "intake coordinator",
];

function parseDate(text: string): string | null {
  const match = text.match(/\b(?:\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?|\w+\s+\d{1,2},?\s+\d{4})\b/);
  if (!match) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(match[0])
    ? `${match[0].replace(/\s+/, "T")}Z`
    : match[0];
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapListing(card: ReturnType<ReturnType<typeof load>>): RawJob | null {
  const heading = card.find("h4").first();
  const title = heading.clone().children().remove().end().text().trim();
  const href =
    card.parents("a[href*='/jobseekers/job/']").first().attr("href") ??
    card.find("a[href*='/jobseekers/job/']").first().attr("href");
  if (!title || !href) return null;

  const jobUrl = new URL(href, "https://www.onlinejobs.ph").toString();
  const dateText =
    card.find("[data-temp]").first().attr("data-temp-2") ??
    card.find("[data-temp]").first().attr("data-temp") ??
    card.find("em").first().text();
  const payText = card.find("dd").first().text().trim() || null;
  const scheduleText = heading.find("span").first().text().trim() || null;
  const company =
    card.find(".company-name, .employer-name, [data-company]").first().text().trim() ||
    "Company not listed";

  return {
    title,
    company,
    description: plainText(card.find(".desc").first().text()),
    payText,
    scheduleText,
    regionNote: null,
    postedAt: parseDate(dateText),
    url: jobUrl,
    source_url: jobUrl,
    sourceId: "onlinejobs",
  };
}

async function enrichListing(job: RawJob): Promise<RawJob> {
  if (!getJobMatchResult({ title: job.title, description: "" }).matched) return job;

  const html = await fetchText(job.url, "text/html,application/xhtml+xml");
  const $ = load(html);
  const detail = $(
    ".job-description, #job-description, .job-details, .jobdesc, main",
  ).first();
  const description = plainText(
    (detail.length ? detail : $("body")).text(),
  );
  const dateUpdated = $("body")
    .text()
    .match(/\bDate Updated\s*:?\s*([^\r\n]+)/i)?.[1];

  return {
    ...job,
    description: description || job.description,
    postedAt: (dateUpdated && parseDate(dateUpdated)) || job.postedAt,
  };
}

export function parseOnlineJobsListings(html: string): RawJob[] {
  const $ = load(html);
  const jobs: RawJob[] = [];
  $(".jobpost-cat-box").each((_index, element) => {
    const job = mapListing($(element));
    if (job) jobs.push(job);
  });
  return jobs;
}

export async function scrapeOnlineJobs(): Promise<RawJob[]> {
  const source = SOURCES.find(({ id }) => id === "onlinejobs");
  if (!source?.endpoint) {
    throw new Error("OnlineJobs.ph search endpoint is not configured.");
  }

  const byUrl = new Map<string, RawJob>();
  for (const term of SEARCH_TERMS) {
    const searchUrl = new URL(source.endpoint);
    searchUrl.searchParams.set("jobkeyword", term);
    const html = await fetchText(searchUrl.toString(), "text/html,application/xhtml+xml");
    for (const job of parseOnlineJobsListings(html)) {
      byUrl.set(job.url, job);
    }
  }

  const results: RawJob[] = [];
  for (const job of byUrl.values()) {
    try {
      results.push(await enrichListing(job));
    } catch (error) {
      console.warn(
        `[OnlineJobs.ph] Could not load details for "${job.title}": ${error instanceof Error ? error.message : String(error)}`,
      );
      results.push(job);
    }
  }
  return results;
}
