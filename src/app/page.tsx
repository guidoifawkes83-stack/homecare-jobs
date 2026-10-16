import { AppShell } from "@/components/app-shell";
import { demoJobs } from "@/lib/jobs";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export default async function JobsPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const demoMode = !supabaseUrl || !supabaseAnonKey;
  let jobs = [...demoJobs].sort((left, right) => right.score - left.score);
  let loadError: string | undefined;

  if (!demoMode) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jobs")
      .select()
      .eq("is_active", true)
      .order("score", { ascending: false });

    if (error) {
      loadError = `Could not load jobs from Supabase: ${error.message}`;
      jobs = [];
    } else {
      const rows: Database["public"]["Tables"]["jobs"]["Row"][] = data ?? [];
      jobs = rows.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company ?? "Company not listed",
        source: "Saved in tracker",
        pay: job.pay_text ?? "Pay not listed",
        region: job.region_note ?? "Location not stated",
        tags: job.software ?? [],
        score: job.score ?? 0,
        posterType: job.poster_type ?? "unknown",
      }));
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
      demoMode={demoMode}
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
            <p className="empty-state">No jobs yet. Add the demo seed data to check the dashboard.</p>
          ) : jobs.map((job) => (
            <article className="job-row" key={job.id}>
              <div className="job-main">
                <div className="job-title-line">
                  <span className="job-title">{job.title}</span>
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
                  <span>{job.source}</span>
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
