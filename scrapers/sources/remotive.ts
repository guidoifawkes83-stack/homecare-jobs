import { SOURCES } from "../config";
import { fetchJson, plainText } from "../http";
import type { RawJob } from "../types";

type RemotiveJob = {
  title?: string;
  company_name?: string;
  description?: string;
  salary?: string;
  job_type?: string;
  candidate_required_location?: string;
  publication_date?: string;
  url?: string;
};

type RemotiveResponse = {
  jobs?: RemotiveJob[];
  "00-warning"?: string;
  "0-legal-notice"?: string;
};

export async function scrapeRemotive(): Promise<RawJob[]> {
  const source = SOURCES.find(({ id }) => id === "remotive");
  if (!source?.endpoint) throw new Error("Remotive endpoint is not configured.");

  const response = await fetchJson<RemotiveResponse>(source.endpoint);
  if (response["0-legal-notice"]) {
    console.info("Remotive usage notice received; source links will be attributed.");
  }

  return (response.jobs ?? []).flatMap((job) => {
    if (!job.title || !job.url) return [];
    const sourceUrl = new URL(job.url, source.endpoint).toString();
    return [
      {
        title: job.title,
        company: job.company_name ?? "Company not listed",
        description: plainText(job.description),
        payText: job.salary?.trim() || null,
        scheduleText: job.job_type?.replace(/_/g, " ") ?? null,
        regionNote: job.candidate_required_location?.trim() || null,
        postedAt: job.publication_date ?? null,
        url: sourceUrl,
        source_url: sourceUrl,
        sourceId: "remotive",
      },
    ];
  });
}
