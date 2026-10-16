import { SOURCES } from "../config";
import { fetchJson, plainText } from "../http";
import type { RawJob } from "../types";

type WorkingNomadsJob = {
  url?: string;
  title?: string;
  description?: string;
  company_name?: string;
  category_name?: string;
  tags?: string | string[];
  location?: string;
  pub_date?: string;
};

export async function scrapeWorkingNomads(): Promise<RawJob[]> {
  const source = SOURCES.find(({ id }) => id === "workingnomads");
  if (!source?.enabled || !source.endpoint) {
    throw new Error("Working Nomads is disabled or has no public endpoint configured.");
  }

  const jobs = await fetchJson<WorkingNomadsJob[]>(source.endpoint);
  if (!Array.isArray(jobs)) {
    throw new Error("Working Nomads response was not a job list.");
  }

  return jobs.flatMap((job) => {
    if (!job.title || !job.url) return [];
    const tags = Array.isArray(job.tags) ? job.tags.join(", ") : job.tags;

    return [
      {
        title: job.title,
        company: job.company_name ?? "Company not listed",
        description: [plainText(job.description), job.category_name, tags]
          .filter(Boolean)
          .join("\n"),
        payText: null,
        scheduleText: null,
        regionNote: job.location?.trim() || null,
        postedAt: job.pub_date ?? null,
        url: job.url,
        sourceId: "workingnomads",
      },
    ];
  });
}
