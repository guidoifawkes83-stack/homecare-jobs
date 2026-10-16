import { AppShell } from "@/components/app-shell";
import { sources } from "@/lib/jobs";

const methods: Record<string, string> = {
  Remotive: "Public jobs API",
  "Remote OK": "Public jobs API",
  "We Work Remotely": "RSS feed",
  Himalayas: "Public jobs API",
  "Working Nomads": "Public feed · endpoint to verify",
  "OnlineJobs.ph": "Public listings",
  "JobStreet PH": "Public listings",
  Workable: "Public company boards",
};

export default function SourcesPage() {
  return (
    <AppShell
      description="Source connections and collection history."
      title="Sources & runs"
    >
      <p className="section-intro">
        Your sources are ready to be connected. No collection runs have been
        started in this foundation preview.
      </p>
      <section aria-label="Job sources" className="source-grid">
        {sources.map((source) => (
          <article className="source-card" key={source}>
            <div>
              <div className="source-name">{source}</div>
              <div className="source-method">{methods[source]}</div>
            </div>
            <span className="source-status">
              <span className="status-dot" />
              Not run
            </span>
          </article>
        ))}
      </section>
      <section aria-label="Run history" className="panel run-empty">
        <strong>No runs yet</strong>
        <p>Source run history will appear here after collection is configured.</p>
      </section>
    </AppShell>
  );
}
