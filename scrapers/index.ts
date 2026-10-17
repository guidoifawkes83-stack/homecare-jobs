import { appendFile, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../src/lib/database.types";
import {
  getJobMatchResult,
  mergeDuplicateJobs,
  processJob,
} from "../src/lib/processing";
import { readLocalRunSnapshot } from "../src/lib/run-storage";
import { SOURCES, WORKABLE_BOARDS, type SourceId } from "./config";
import { SourceBlockedError } from "./http";
import { scrapeHimalayas } from "./sources/himalayas";
import { scrapeRemotive } from "./sources/remotive";
import { scrapeRemoteOk } from "./sources/remoteok";
import { scrapeWeWorkRemotely } from "./sources/weworkremotely";
import { scrapeWorkingNomads } from "./sources/workingnomads";
import { scrapeJobStreet } from "./sources/jobstreet";
import { scrapeOnlineJobs } from "./sources/onlinejobs";
import { scrapeWorkableBoard } from "./sources/workable";
import type {
  JobAuditRecord,
  LocalRunAudit,
  LocalRunSnapshot,
  ProcessedJob,
  RawJob,
  SourceRun,
} from "./types";

loadEnvConfig(process.cwd());

type Scraper = () => Promise<RawJob[]>;

const auditRecords: JobAuditRecord[] = [];

const scrapers: Partial<Record<SourceId, Scraper>> = {
  remotive: scrapeRemotive,
  remoteok: scrapeRemoteOk,
  weworkremotely: scrapeWeWorkRemotely,
  himalayas: scrapeHimalayas,
  workingnomads: scrapeWorkingNomads,
  onlinejobs: scrapeOnlineJobs,
  jobstreet: scrapeJobStreet,
};
for (const board of WORKABLE_BOARDS) {
  scrapers[board.id] = () => scrapeWorkableBoard(board.id);
}

const startedAt = new Date().toISOString();

async function collectSources(): Promise<{
  acceptedBySource: Map<string, ProcessedJob[]>;
  runs: SourceRun[];
}> {
  const acceptedBySource = new Map<string, ProcessedJob[]>();
  const runs: SourceRun[] = [];

  for (const source of SOURCES) {
    const sourceStartedAt = new Date().toISOString();
    if (!source.enabled) {
      runs.push({
        sourceId: source.id,
        status: "disabled",
        startedAt: sourceStartedAt,
        finishedAt: new Date().toISOString(),
        jobsFetched: 0,
        jobsFound: 0,
        jobsNew: 0,
        error: source.note ?? "Source is disabled.",
      });
      continue;
    }

    const scrape = scrapers[source.id];
    if (!scrape) {
      runs.push({
        sourceId: source.id,
        status: "disabled",
        startedAt: sourceStartedAt,
        finishedAt: new Date().toISOString(),
        jobsFetched: 0,
        jobsFound: 0,
        jobsNew: 0,
        error: source.note ?? "No scraper is configured for this source yet.",
      });
      continue;
    }

    try {
      const rawJobs = await scrape();
      for (const job of rawJobs) {
        const result = getJobMatchResult(job);
        auditRecords.push({
          sourceId: source.id,
          title: job.title,
          matched: result.matched,
          matchedSignal: result.matchedSignal,
          rejectionReason: result.rejectionReason,
        });
      }
      const processed = rawJobs.flatMap((job) => {
        const match = processJob(job);
        return match ? [match] : [];
      });
      acceptedBySource.set(source.id, processed);
      runs.push({
        sourceId: source.id,
        status: "ok",
        startedAt: sourceStartedAt,
        finishedAt: new Date().toISOString(),
        jobsFetched: rawJobs.length,
        jobsFound: processed.length,
        jobsNew: 0,
        error: null,
      });
      console.info(
        `[${source.name}] fetched ${rawJobs.length}; matched ${processed.length} job(s).`,
      );
    } catch (error) {
      const blocked = error instanceof SourceBlockedError;
      const message = error instanceof Error ? error.message : String(error);
      runs.push({
        sourceId: source.id,
        status: blocked ? "blocked" : "error",
        startedAt: sourceStartedAt,
        finishedAt: new Date().toISOString(),
        jobsFetched: 0,
        jobsFound: 0,
        jobsNew: 0,
        error: message,
      });
      console.error(`[${source.name}] ${blocked ? "blocked" : "failed"}: ${message}`);
    }
  }

  return { acceptedBySource, runs };
}

function buildRunCounts(
  jobs: ProcessedJob[],
  acceptedBySource: Map<string, ProcessedJob[]>,
  runs: SourceRun[],
  newDedupeKeys: Set<string>,
) {
  const assignedNewKeys = new Set<string>();
  for (const run of runs) {
    const sourceJobs = acceptedBySource.get(run.sourceId) ?? [];
    const sourceKeys = new Set(sourceJobs.map((job) => job.dedupe_key));
    run.jobsFound = sourceJobs.length;
    run.jobsNew = [...sourceKeys].filter((key) => {
      if (!newDedupeKeys.has(key) || assignedNewKeys.has(key)) return false;
      assignedNewKeys.add(key);
      return true;
    }).length;
  }
  console.info(`Collected ${jobs.length} unique matching job(s).`);
}

async function saveLocalSnapshot(snapshot: LocalRunSnapshot) {
  const dataDirectory = path.join(process.cwd(), ".data");
  const target = path.join(dataDirectory, "latest-run.json");
  const temporary = `${target}.tmp`;
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await rename(temporary, target);
  console.info(`Saved local results to ${path.relative(process.cwd(), target)}.`);
}

async function saveRunAudit(audit: LocalRunAudit) {
  const dataDirectory = path.join(process.cwd(), ".data");
  const latestTarget = path.join(dataDirectory, "latest-run-audit.json");
  const latestTemporary = `${latestTarget}.tmp`;
  const historyTarget = path.join(dataDirectory, "run-audit.jsonl");
  const entry = `${JSON.stringify(audit)}\n`;
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(latestTemporary, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  await rename(latestTemporary, latestTarget);
  await appendFile(historyTarget, entry, "utf8");
  console.info(`Saved raw-title audit to ${path.relative(process.cwd(), historyTarget)}.`);
}

function getSupabaseCredentials() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

async function persistSupabase(
  snapshot: LocalRunSnapshot,
  acceptedBySource: Map<string, ProcessedJob[]>,
  runs: SourceRun[],
) {
  const credentials = getSupabaseCredentials();
  if (!credentials) return false;

  const supabase = createClient<Database>(
    credentials.url,
    credentials.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const sourceRows = SOURCES.map((source) => {
    const run = runs.find(({ sourceId }) => sourceId === source.id);
    const isBlocked = run?.status === "blocked" || run?.status === "disabled";
    return {
      id: source.id,
      name: source.name,
      method: source.method,
      enabled: source.enabled,
      last_run_at: run?.finishedAt ?? null,
      last_status: isBlocked ? "blocked" : run?.status === "ok" ? "ok" : run?.status === "error" ? "error" : null,
      last_error: isBlocked ? (run?.error ?? source.note ?? null) : (run?.error ?? null),
    };
  });

  const { error: sourcesError } = await supabase
    .from("sources")
    .upsert(sourceRows, { onConflict: "id" });
  if (sourcesError) throw new Error(`Could not update sources: ${sourcesError.message}`);

  const dedupedJobs = snapshot.jobs;
  const existingKeys = new Set<string>();
  if (dedupedJobs.length) {
    const { data, error } = await supabase
      .from("jobs")
      .select("dedupe_key")
      .in("dedupe_key", dedupedJobs.map(({ dedupe_key }) => dedupe_key));
    if (error) throw new Error(`Could not check existing jobs: ${error.message}`);
    for (const row of data ?? []) existingKeys.add(row.dedupe_key);
  }

  const newDedupeKeys = new Set(
    dedupedJobs
      .map(({ dedupe_key }) => dedupe_key)
      .filter((dedupeKey) => !existingKeys.has(dedupeKey)),
  );
  buildRunCounts(dedupedJobs, acceptedBySource, runs, newDedupeKeys);

  if (dedupedJobs.length) {
    const jobRows = dedupedJobs.map(
      ({
        sources: _sources,
        ...job
      }) => ({ ...job, last_seen_at: snapshot.finishedAt }),
    );
    const { error: jobsError } = await supabase
      .from("jobs")
      .upsert(jobRows, { onConflict: "dedupe_key" });
    if (jobsError) throw new Error(`Could not save jobs: ${jobsError.message}`);

    const { data: savedJobs, error: savedJobsError } = await supabase
      .from("jobs")
      .select("id, dedupe_key")
      .in("dedupe_key", dedupedJobs.map(({ dedupe_key }) => dedupe_key));
    if (savedJobsError) {
      throw new Error(`Could not retrieve saved jobs: ${savedJobsError.message}`);
    }

    const idByKey = new Map(
      (savedJobs ?? []).map(({ id, dedupe_key }) => [dedupe_key, id]),
    );
    const links = dedupedJobs.flatMap((job) =>
      job.sources.flatMap((source) => {
        const jobId = idByKey.get(job.dedupe_key);
        return jobId
          ? [
              {
                job_id: jobId,
                source_id: source.sourceId,
                url: source.url,
                seen_at: snapshot.finishedAt,
              },
            ]
          : [];
      }),
    );
    if (links.length) {
      const { error: linkError } = await supabase
        .from("job_sources")
        .upsert(links, { onConflict: "job_id,source_id" });
      if (linkError) {
        throw new Error(`Could not save source links: ${linkError.message}`);
      }
    }
  }

  if (runs.length) {
    const { error: runsError } = await supabase.from("runs").insert(
      runs.map((run) => ({
        started_at: run.startedAt,
        finished_at: run.finishedAt,
        source_id: run.sourceId,
        status: run.status,
        jobs_found: run.jobsFound,
        jobs_new: run.jobsNew,
        error: run.error,
      })),
    );
    if (runsError) throw new Error(`Could not save run history: ${runsError.message}`);
  }

  const successfulSources = runs.some(({ status }) => status === "ok");
  if (successfulSources) {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { error: inactiveError } = await supabase
      .from("jobs")
      .update({ is_active: false })
      .lt("last_seen_at", cutoff);
    if (inactiveError) {
      throw new Error(`Could not mark stale jobs inactive: ${inactiveError.message}`);
    }
  }

  return true;
}

async function main() {
  const { acceptedBySource, runs } = await collectSources();
  const jobs = mergeDuplicateJobs(
    [...acceptedBySource.values()].flat(),
  );
  const snapshot: LocalRunSnapshot = {
    startedAt,
    finishedAt: new Date().toISOString(),
    jobs,
    runs,
  };
  const audit: LocalRunAudit = {
    startedAt,
    finishedAt: snapshot.finishedAt,
    records: auditRecords,
  };
  snapshot.audit = audit;

  const totalFetched = runs.reduce((total, run) => total + run.jobsFetched, 0);
  const matchedRecords = auditRecords.filter(({ matched }) => matched);
  console.info(`\nTotal fetched: ${totalFetched}`);
  console.info(`Total matched before deduplication: ${matchedRecords.length}`);
  console.info("Matched job titles:");
  for (const record of matchedRecords) {
    const source = SOURCES.find(({ id }) => id === record.sourceId);
    console.info(`- [${source?.name ?? record.sourceId}] ${record.title}`);
  }

  await saveRunAudit(audit);
  const savedToSupabase = await persistSupabase(snapshot, acceptedBySource, runs);
  if (!savedToSupabase) {
    const previousSnapshot = await readLocalRunSnapshot();
    const previouslySeenKeys = new Set(
      previousSnapshot?.jobs.map(({ dedupe_key }) => dedupe_key) ?? [],
    );
    const newDedupeKeys = new Set(
      jobs
        .map(({ dedupe_key }) => dedupe_key)
        .filter((dedupeKey) => !previouslySeenKeys.has(dedupeKey)),
    );
    buildRunCounts(jobs, acceptedBySource, runs, newDedupeKeys);
    snapshot.finishedAt = new Date().toISOString();
    await saveLocalSnapshot(snapshot);
  } else {
    console.info("Saved jobs, source links, and run history to Supabase.");
  }

  console.info("\nSource run summary");
  for (const run of runs) {
    const source = SOURCES.find(({ id }) => id === run.sourceId);
    console.info(
      `- ${source?.name ?? run.sourceId}: ${run.status}, ${run.jobsFound} matched, ${run.jobsNew} new${run.error ? ` — ${run.error}` : ""}`,
    );
  }
  const successfulCount = runs.filter(({ status }) => status === "ok").length;
  if (!successfulCount) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(
    `Scraper run could not be persisted: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
