import { XMLParser } from "fast-xml-parser";
import { SOURCES } from "../config";
import { fetchText, plainText } from "../http";
import type { RawJob } from "../types";

const FEEDS = [
  "https://weworkremotely.com/remote-jobs.rss",
  "https://weworkremotely.com/categories/remote-customer-support-jobs.rss",
  "https://weworkremotely.com/categories/all-other-remote-jobs.rss",
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: true,
  trimValues: true,
});

function asList<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function mapItem(item: unknown): RawJob | null {
  const entry = record(item);
  const fullTitle = plainText(stringValue(entry.title));
  const link = stringValue(entry.link).trim();
  if (!fullTitle || !link) return null;
  const sourceUrl = new URL(link, "https://weworkremotely.com").toString();

  const colon = fullTitle.indexOf(":");
  const company = colon > 0 ? fullTitle.slice(0, colon).trim() : "Company not listed";
  const title = colon > 0 ? fullTitle.slice(colon + 1).trim() : fullTitle;
  const description = plainText(
    entry.description ?? entry["content:encoded"] ?? entry.summary,
  );
  const dateText = stringValue(entry.pubDate ?? entry["dc:date"]);
  const postedAt = dateText ? new Date(dateText).toISOString() : null;

  return {
    title,
    company,
    description,
    payText: null,
    scheduleText: null,
    regionNote: null,
    postedAt,
    url: sourceUrl,
    source_url: sourceUrl,
    sourceId: "weworkremotely",
  };
}

export async function scrapeWeWorkRemotely(): Promise<RawJob[]> {
  if (!SOURCES.some(({ id, enabled }) => id === "weworkremotely" && enabled)) {
    throw new Error("We Work Remotely is disabled in source configuration.");
  }

  const results: RawJob[] = [];
  const feedErrors: string[] = [];

  for (const feed of FEEDS) {
    try {
      const xml = await fetchText(feed, "application/rss+xml, application/xml, text/xml");
      const parsed = record(parser.parse(xml));
      const channel = record(record(parsed.rss).channel);
      for (const item of asList(channel.item)) {
        const job = mapItem(item);
        if (job) results.push(job);
      }
    } catch (error) {
      feedErrors.push(`${feed}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (feedErrors.length === FEEDS.length) {
    throw new Error(`All We Work Remotely feeds failed. ${feedErrors.join(" | ")}`);
  }
  if (feedErrors.length) {
    console.warn(`Some We Work Remotely feeds failed: ${feedErrors.join(" | ")}`);
  }

  return results;
}
