import type { SourceId } from "./config";

export type RawJob = {
  title: string;
  company: string;
  description: string;
  payText: string | null;
  scheduleText: string | null;
  regionNote: string | null;
  postedAt: string | null;
  url: string;
  source_url: string;
  sourceId: SourceId;
};

export type ProcessedJob = {
  dedupe_key: string;
  source_url: string;
  title: string;
  company: string;
  description: string;
  pay_text: string | null;
  pay_usd_hourly_min: number | null;
  pay_usd_hourly_max: number | null;
  schedule_text: string | null;
  poster_type: "direct" | "agency" | "unknown";
  software: string[];
  region_note: string | null;
  score: number;
  posted_at: string | null;
  is_active: boolean;
  sources: Array<{ sourceId: SourceId; url: string }>;
};

export type SourceRun = {
  sourceId: SourceId;
  status: "ok" | "error" | "blocked" | "disabled";
  startedAt: string;
  finishedAt: string;
  jobsFetched: number;
  jobsFound: number;
  jobsNew: number;
  error: string | null;
};

export type JobAuditRecord = {
  sourceId: SourceId;
  title: string;
  matched: boolean;
  matchedSignal: string | null;
  rejectionReason: string | null;
};

export type LocalRunAudit = {
  startedAt: string;
  finishedAt: string;
  records: JobAuditRecord[];
};

export type LocalRunSnapshot = {
  startedAt: string;
  finishedAt: string;
  jobs: ProcessedJob[];
  runs: SourceRun[];
  audit?: LocalRunAudit;
};
