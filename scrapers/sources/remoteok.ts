import { SOURCES } from "../config";
import { fetchJson, plainText } from "../http";
import type { RawJob } from "../types";

type RemoteOkJob = {
  position?: string;
  company?: string;
  description?: string;
  tags?: string[];
  location?: string;
  date?: string;
  salary_min?: number;
  salary_max?: number;
  url?: string;
  apply_url?: string;
  slug?: string;
};

export async function scrapeRemoteOk(): Promise<RawJob[]> {
  const source = SOURCES.find(({ id }) => id === "remoteok");
  if (!source?.endpoint) throw new Error("Remote OK endpoint is not configured.");

  const jobs = await fetchJson<RemoteOkJob[]>(source.endpoint);
  if (!Array.isArray(jobs)) {
    throw new Error("Remote OK response was not a job list.");
  }

  return jobs.flatMap((job) => {
    if (!job.position) return [];
    const url =
      job.url ??
      (job.slug ? `https://remoteok.com/remote-jobs/${job.slug}` : null);
    if (!url) return [];

    const salary =
      job.salary_min || job.salary_max
        ? `$${job.salary_min || job.salary_max}–$${job.salary_max || job.salary_min} USD`
        : null;
    const tags = (job.tags ?? []).join(", ");

    return [
      {
        title: job.position,
        company: job.company ?? "Company not listed",
        description: [plainText(job.description), tags].filter(Boolean).join("\n"),
        payText: salary,
        scheduleText: null,
        regionNote: job.location?.trim() || null,
        postedAt: job.date ?? null,
        url,
        sourceId: "remoteok",
      },
    ];
  });
}
