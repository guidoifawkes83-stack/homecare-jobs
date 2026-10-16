import { AppShell } from "@/components/app-shell";
import { hasSupabaseReadCredentials, readLocalRunSnapshot } from "@/lib/run-storage";
import { SOURCES } from "../../../scrapers/config";
import type { Database } from "@/lib/database.types";
import type { SourceRun } from "../../../scrapers/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SourceCardData = {
  id: string;
  name: string;
  method: string;
  enabled: boolean;
  lastStatus: string;
  lastRunAt: string | null;
  jobsFound: number;
  jobsNew: number;
  lastError: string | null;
};

type RunLogData = {
  sourceId: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  jobsFound: number;
  jobsNew: number;
  error: string | null;
};

const statusLabel: Record<string, string> = {
  ok: "OK",
  error: "Error",
  blocked: "Blocked",
  disabled: "Disabled",
  "not run": "Not run",
};

function sourceName(sourceId: string) {
  return SOURCES.find(({ id }) => id === sourceId)?.name ?? sourceId;
}

export default async function SourcesPage() {
  let sourceCards: SourceCardData[] = SOURCES.map((source) => ({
    id: source.id,
    name: source.name,
    method: source.method.toUpperCase(),
    enabled: source.enabled,
    lastStatus: source.enabled ? "not run" : "disabled",
    lastRunAt: null,
    jobsFound: 0,
    jobsNew: 0,
    lastError: source.note ?? null,
  }));
  let runLog: RunLogData[] = [];
  let loadError: string | undefined;
  const hasSupabase = hasSupabaseReadCredentials();

  if (hasSupabase) {
    const supabase = await createClient();
    const [{ data: sourceRows, error: sourcesError }, { data: runRows, error: runsError }] =
      await Promise.all([
        supabase.from("sources").select("*"),
        supabase
          .from("runs")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(30),
      ]);

    if (sourcesError) {
      loadError = `Could not load source status: ${sourcesError.message}`;
    } else if (runsError) {
      loadError = `Could not load run history: ${runsError.message}`;
    }

    const typedSourceRows: Database["public"]["Tables"]["sources"]["Row"][] =
      sourceRows ?? [];
    const typedRunRows: Database["public"]["Tables"]["runs"]["Row"][] =
      runRows ?? [];
    const latestRunBySource = new Map<
      string,
      Database["public"]["Tables"]["runs"]["Row"]
    >();
    for (const run of typedRunRows) {
      if (!latestRunBySource.has(run.source_id ?? "")) {
        latestRunBySource.set(run.source_id ?? "", run);
      }
    }

    sourceCards = SOURCES.map((source) => {
      const row = typedSourceRows.find(({ id }) => id === source.id);
      const latestRun = latestRunBySource.get(source.id);
      return {
        id: source.id,
        name: row?.name ?? source.name,
        method: (row?.method ?? source.method).toUpperCase(),
        enabled: row?.enabled ?? source.enabled,
        lastStatus: row?.last_status ?? (source.enabled ? "not run" : "disabled"),
        lastRunAt: row?.last_run_at ?? null,
        jobsFound: latestRun?.jobs_found ?? 0,
        jobsNew: latestRun?.jobs_new ?? 0,
        lastError: row?.last_error ?? source.note ?? null,
      };
    });
    runLog = typedRunRows.map((run) => ({
      sourceId: run.source_id ?? "unknown",
      status: run.status ?? "unknown",
      startedAt: run.started_at,
      finishedAt: run.finished_at,
      jobsFound: run.jobs_found ?? 0,
      jobsNew: run.jobs_new ?? 0,
      error: run.error,
    }));
  } else {
    try {
      const snapshot = await readLocalRunSnapshot();
      if (snapshot) {
        const latestRunBySource = new Map<string, SourceRun>();
        for (const run of snapshot.runs) latestRunBySource.set(run.sourceId, run);
        sourceCards = sourceCards.map((card) => {
          const run = latestRunBySource.get(card.id);
          return run
            ? {
                ...card,
                lastStatus: run.status,
                lastRunAt: run.finishedAt,
                jobsFound: run.jobsFound,
                jobsNew: run.jobsNew,
                lastError: run.error,
              }
            : card;
        });
        runLog = [...snapshot.runs]
          .reverse()
          .map((run) => ({
            sourceId: run.sourceId,
            status: run.status,
            startedAt: run.startedAt,
            finishedAt: run.finishedAt,
            jobsFound: run.jobsFound,
            jobsNew: run.jobsNew,
            error: run.error,
          }));
      }
    } catch (error) {
      loadError = `Could not read the local scraper results: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  return (
    <AppShell
      dataLabel={hasSupabase ? "Supabase" : "Local results"}
      description="Source connections and collection history."
      title="Sources & runs"
    >
      <p className="section-intro">
        Public API and RSS sources are fetched independently. Remotive results
        are delayed by 24 hours.
      </p>
      {loadError && (
        <p className="error-banner" role="alert">
          {loadError}
        </p>
      )}
      <section aria-label="Job sources" className="source-grid">
        {sourceCards.map((source) => (
          <article className="source-card" key={source.id}>
            <div className="source-card-main">
              <div className="source-name">{source.name}</div>
              <div className="source-method">
                {source.method} · {source.enabled ? "Enabled" : "Disabled"}
              </div>
              <div className="source-metrics">
                {source.jobsFound} found · {source.jobsNew} new
                {source.lastRunAt
                  ? ` · ${new Date(source.lastRunAt).toLocaleString()}`
                  : ""}
              </div>
              {source.lastError && (
                <div className="source-error">{source.lastError}</div>
              )}
            </div>
            <span className={`source-status ${source.lastStatus}`}>
              <span className="status-dot" />
              {statusLabel[source.lastStatus] ?? source.lastStatus}
            </span>
          </article>
        ))}
      </section>
      <section aria-labelledby="run-history-heading" className="panel run-panel">
        <div className="panel-heading">
          <h2 id="run-history-heading">Run history</h2>
          <span className="quiet-label">
            {hasSupabase ? "Latest 30 runs" : "Latest local run"}
          </span>
        </div>
        {runLog.length ? (
          <div className="run-table-scroll">
            <table className="run-table">
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">Started</th>
                  <th scope="col">Status</th>
                  <th scope="col">Found</th>
                  <th scope="col">New</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                {runLog.map((run, index) => (
                  <tr key={`${run.sourceId}-${run.startedAt ?? index}-${index}`}>
                    <td>{sourceName(run.sourceId)}</td>
                    <td>{run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}</td>
                    <td>
                      <span className={`source-status ${run.status}`}>
                        <span className="status-dot" />
                        {statusLabel[run.status] ?? run.status}
                      </span>
                    </td>
                    <td>{run.jobsFound}</td>
                    <td>{run.jobsNew}</td>
                    <td>{run.error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="run-empty">
            <strong>No runs yet</strong>
            <p>Run <code>npm run scrape</code> to fetch public listings and record this run.</p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
