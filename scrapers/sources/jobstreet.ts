import { load } from "cheerio";
import { SOURCES } from "../config";
import { fetchText, plainText } from "../http";
import type { RawJob } from "../types";

const SEARCH_TERMS = [
  "home care scheduler",
  "scheduling coordinator",
  "rostering coordinator",
  "care coordinator",
  "patient coordinator",
];

function cardText(
  $: ReturnType<typeof load>,
  card: ReturnType<ReturnType<typeof load>>,
  selectors: string[],
): string {
  for (const selector of selectors) {
    const value = card.find(selector).first().text().trim();
    if (value) return plainText(value);
  }
  return "";
}

export function parseJobStreetResults(html: string, searchUrl: string): RawJob[] {
  const $ = load(html);
  const jobsByUrl = new Map<string, RawJob>();
  const anchors = $("a[data-automation='jobTitle'], a[href*='/job/']");

  anchors.each((_index, element) => {
    const anchor = $(element);
    const title = plainText(anchor.text());
    const href = anchor.attr("href");
    if (!title || !href) return;

    const card =
      anchor.closest("[data-automation='jobCard'], article, li").first();
    if (!card.length) return;

    const url = new URL(href, searchUrl).toString();
    jobsByUrl.set(url, {
      title,
      company:
        cardText($, card, [
          "[data-automation='jobCompany']",
          "[data-automation='advertiser-name']",
          ".job-company",
        ]) || "Company not listed",
      description: cardText($, card, [
        "[data-automation='jobShortDescription']",
        "[data-automation='jobDescription']",
        ".job-description",
      ]),
      payText: cardText($, card, [
        "[data-automation='jobSalary']",
        "[data-automation='salary']",
      ]) || null,
      scheduleText: null,
      regionNote: cardText($, card, [
        "[data-automation='jobCardLocation']",
        "[data-automation='jobLocation']",
      ]) || null,
      postedAt:
        cardText($, card, [
          "[data-automation='jobListingDate']",
          "time",
        ]) || null,
      url,
      sourceId: "jobstreet",
    });
  });

  return [...jobsByUrl.values()];
}

export async function scrapeJobStreet(): Promise<RawJob[]> {
  const source = SOURCES.find(({ id }) => id === "jobstreet");
  if (!source?.endpoint) {
    throw new Error("JobStreet PH search endpoint is not configured.");
  }

  const byUrl = new Map<string, RawJob>();
  for (const term of SEARCH_TERMS) {
    const searchUrl = new URL(source.endpoint);
    searchUrl.searchParams.set("keywords", term);
    const html = await fetchText(searchUrl.toString(), "text/html,application/xhtml+xml");
    for (const job of parseJobStreetResults(html, searchUrl.toString())) {
      byUrl.set(job.url, job);
    }
  }
  return [...byUrl.values()];
}
