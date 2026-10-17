import { AppShell } from "@/components/app-shell";
import type { TrackerJob } from "@/lib/jobs";
import type { Database } from "@/lib/database.types";
import { hasSupabaseReadCredentials, readLocalRunSnapshot } from "@/lib/run-storage";
import { SOURCES } from "../../scrapers/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const hasSupabase = hasSupabaseReadCredentials();
  let jobs: TrackerJob[] = [];
  let loadError: string | undefined;
  let localRunFinishedAt: string | null = null;

  if (hasSupabase) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jobs")
      .select()
      .eq("is_active", true)
      .order("score", { ascending: false });

    if (error) {
      loadError = `Could not load jobs from Supabase: ${error.message}`;
    } else {
      const rows: Database["public"]["Tables"]["jobs"]["Row"][] = data ?? [];
      if (rows.length) {
        const { data: sourceRows, error: sourceError } = await supabase
          .from("job_sources")
          .select("job_id, source_id, url")
          .in("job_id", rows.map(({ id }) => id));
        if (sourceError) {
          loadError = `Could not load job source links: ${sourceError.message}`;
        } else {
          const linksByJob = new Map<string, TrackerJob["sourceLinks"]>();
          const jobSourceRows: Database["public"]["Tables"]["job_sources"]["Row"][] =
            sourceRows ?? [];
          for (const source of jobSourceRows) {
            const links = linksByJob.get(source.job_id) ?? [];
            links.push({
              sourceId: source.source_id,
              name:
                SOURCES.find(({ id }) => id === source.source_id)?.name ??
                source.source_id,
              url: source.url,
            });
            linksByJob.set(source.job_id, links);
          }

          jobs = rows.map((job) => ({
            id: job.id,
            dedupeKey: job.dedupe_key,
            sourceUrl: job.source_url,
            title: job.title,
            company: job.company ?? "Company not listed",
            description: job.description ?? "",
            sourceLinks: linksByJob.get(job.id) ?? [],
            pay: job.pay_text ?? "Pay not listed",
            region: job.region_note ?? "Location not stated",
            tags: job.software ?? [],
            score: job.score ?? 0,
            posterType: job.poster_type ?? "unknown",
          }));
        }
      }
    }
  } else {
    try {
      const snapshot = await readLocalRunSnapshot();
      localRunFinishedAt = snapshot?.finishedAt ?? null;
      jobs =
        snapshot?.jobs.map((job) => ({
          id: job.dedupe_key,
          dedupeKey: job.dedupe_key,
          sourceUrl: job.source_url,
          title: job.title,
          company: job.company,
          description: job.description,
          sourceLinks: job.sources.map((source) => ({
            ...source,
            name:
              SOURCES.find(({ id }) => id === source.sourceId)?.name ??
              source.sourceId,
          })),
          pay: job.pay_text ?? "Pay not listed",
          region: job.region_note ?? "Location not stated",
          tags: job.software,
          score: job.score,
          posterType: job.poster_type,
        })) ?? [];
    } catch (error) {
      loadError = `Could not read the local scraper results: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  const directCount = jobs.filter((job) => job.posterType === "direct").length;
  const averageScore = Math.round(
    jobs.length
      ? jobs.reduce((total, job) => total + job.score, 0) / jobs.length
      : 0,
  );

  return (
    <AppShell
      description="A focused view of home care scheduling and coordinator roles."
      dataLabel={hasSupabase ? "Supabase" : "Local results"}
      title="Jobs"
    >
      <section aria-label="Job overview" className="summary-grid">
        <article className="summary-card">
          <span className="summary-label">Matching jobs</span>
          <strong className="summary-value">{jobs.length}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Direct employers</span>
          <strong className="summary-value">{directCount}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Average match score</span>
          <strong className="summary-value">
            {averageScore}
            <span className="summary-note">out of 100</span>
          </strong>
        </article>
      </section>

      {loadError && (
        <p className="error-banner" role="alert">
          {loadError}
        </p>
      )}

      <section aria-labelledby="jobs-heading" className="panel">
        <div className="panel-heading">
          <h2 id="jobs-heading">Recent matches</h2>
          <span className="quiet-label">Sorted by match score</span>
        </div>
        <div className="jobs-list">
          {jobs.length === 0 && !loadError ? (
            <p className="empty-state">
              {localRunFinishedAt
                ? `The latest collection finished ${new Date(localRunFinishedAt).toLocaleString()} and found no listings matching the configured keywords and exclusions.`
                : "No live jobs are available yet. Run npm run scrape to collect results."}
            </p>
          ) : jobs.map((job) => (
            <article className="job-row" key={job.id}>
              <div className="job-main">
                <div className="job-title-line">
                  {job.sourceUrl ? (
                    <a
                      className="job-title"
                      href={job.sourceUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {job.title}
                    </a>
                  ) : (
                    <span className="job-title">{job.title}</span>
                  )}
                  <span className={`badge ${job.posterType}`}>
                    {job.posterType === "unknown"
                      ? "Unclassified"
                      : job.posterType === "direct"
                        ? "Direct"
                        : "Agency"}
                  </span>
                  {job.score >= 85 && <span className="badge new">New</span>}
                </div>
                <div className="job-meta">
                  <span>{job.company}</span>
                  <span aria-hidden="true" className="job-meta-dot">
                    ·
                  </span>
                  <span>
                    {job.sourceLinks.length
                      ? job.sourceLinks.map((source, index) => (
                          <span key={`${source.sourceId}-${source.url}`}>
                            {index > 0 && ", "}
                            <a
                              className="source-job-link"
                              href={source.url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {source.name}
                            </a>
                          </span>
                        ))
                      : job.sourceUrl
                        ? (
                            <a
                              className="source-job-link"
                              href={job.sourceUrl}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              View posting
                            </a>
                          )
                        : "Source link unavailable"}
                  </span>
                  <span aria-hidden="true" className="job-meta-dot">
                    ·
                  </span>
                  <span>{job.region}</span>
                </div>
                <div className="job-badges">
                  {job.tags.map((tag) => (
                    <span className="badge" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="job-aside">
                <span className="job-pay">{job.pay}</span>
                <span className="job-score">Match {job.score}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
