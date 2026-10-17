import { WORKABLE_BOARDS } from "../config";
import type { WorkableBoard } from "../config";
import { getJobMatchResult } from "../../src/lib/processing";
import { fetchText, plainText } from "../http";
import type { RawJob } from "../types";

type WorkableListing = {
  title: string;
  location: string | null;
  schedule: string | null;
  pay: string | null;
  postedAt: string | null;
  detailsUrl: string;
};

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function parseWorkableListings(markdown: string): WorkableListing[] {
  const listings: WorkableListing[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trimStart().startsWith("|") || !line.includes("[View](")) continue;
    const [title, , location, schedule, pay, postedAt, details = ""] =
      tableCells(line);
    const detailsUrl = details.match(/\[View\]\((https:\/\/[^)]+)\)/)?.[1];
    if (!title || !detailsUrl) continue;
    listings.push({
      title: plainText(title.replace(/\\([\\|])/g, "$1")),
      location: location && location !== "—" ? location : null,
      schedule: schedule && schedule !== "—" ? schedule : null,
      pay: pay && pay !== "—" ? pay : null,
      postedAt: postedAt && postedAt !== "—" ? postedAt : null,
      detailsUrl,
    });
  }
  return listings;
}

function detailDescription(markdown: string): string {
  const section = markdown.match(/## Description\s*([\s\S]*?)(?=\n## |\s*---\s*$|$)/i)?.[1];
  return plainText(
    (section ?? "")
      .replace(/!\[[^\]]*]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
      .replace(/^\s{0,3}[-*]\s+/gm, "")
      .replace(/^\s{0,3}#{1,6}\s+/gm, ""),
  );
}

function searchUrl(board: WorkableBoard, query?: string): string {
  const url = new URL(`https://apply.workable.com/${board.slug}/jobs.md`);
  if (query) url.searchParams.set("query", query);
  return url.toString();
}

function toRawJob(board: WorkableBoard, listing: WorkableListing): RawJob {
  return {
    title: listing.title,
    company: board.name,
    description: "",
    payText: listing.pay,
    scheduleText: listing.schedule,
    regionNote: listing.location,
    postedAt: listing.postedAt,
    url: listing.detailsUrl.replace(/\.md$/i, ""),
    sourceId: board.id,
  };
}

export async function scrapeWorkableBoard(boardId: string): Promise<RawJob[]> {
  const board = WORKABLE_BOARDS.find(({ id }) => id === boardId);
  if (!board) throw new Error(`No Workable board configured for ${boardId}.`);

  const firstPage = await fetchText(searchUrl(board), "text/markdown,text/plain");
  const pages = [firstPage];
  if (/use the search endpoint to filter results/i.test(firstPage)) {
    for (const query of board.searchQueries) {
      pages.push(
        await fetchText(searchUrl(board, query), "text/markdown,text/plain"),
      );
    }
  }

  const listingsByUrl = new Map<string, WorkableListing>();
  for (const page of pages) {
    for (const listing of parseWorkableListings(page)) {
      listingsByUrl.set(listing.detailsUrl, listing);
    }
  }

  const jobs: RawJob[] = [];
  for (const listing of listingsByUrl.values()) {
    const job = toRawJob(board, listing);
    if (!getJobMatchResult({ title: job.title, description: "" }).matched) {
      jobs.push(job);
      continue;
    }

    try {
      const detail = await fetchText(listing.detailsUrl, "text/markdown,text/plain");
      job.description = detailDescription(detail);
    } catch (error) {
      console.warn(
        `[${board.name}] Could not load details for "${job.title}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    jobs.push(job);
  }
  return jobs;
}
