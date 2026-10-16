export type JobSourceLink = {
  sourceId: string;
  name: string;
  url: string;
};

export type TrackerJob = {
  id: string;
  dedupeKey: string;
  title: string;
  company: string;
  description: string;
  sourceLinks: JobSourceLink[];
  pay: string;
  region: string;
  tags: string[];
  score: number;
  posterType: "direct" | "agency" | "unknown";
};
