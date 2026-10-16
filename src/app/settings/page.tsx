import { AppShell } from "@/components/app-shell";
import { EXCLUSIONS, KEYWORDS, TITLE_EXCLUSIONS } from "../../../scrapers/config";

export default function SettingsPage() {
  return (
    <AppShell
      description="Your search preferences and matching setup."
      title="Settings"
    >
      <p className="section-intro">
        These Phase 2 matching rules are shared by all active scrapers.
      </p>
      <div className="settings-grid">
        <section aria-labelledby="keywords-heading" className="settings-card">
          <h2 id="keywords-heading">Search keywords</h2>
          <p>Role phrases used to find home care scheduling jobs.</p>
          <div className="settings-values">
            {KEYWORDS.map((search) => (
              <span className="badge" key={search}>
                {search}
              </span>
            ))}
          </div>
        </section>
        <section aria-labelledby="exclusions-heading" className="settings-card">
          <h2 id="exclusions-heading">Excluded roles and requirements</h2>
          <p>
            Listings matching these patterns are left out before they appear in
            the tracker.
          </p>
          <div className="settings-values">
            {[...EXCLUSIONS, ...TITLE_EXCLUSIONS].map((pattern) => (
              <span className="badge" key={pattern}>
                {pattern.replaceAll("\\b", "").replaceAll("(?:", "(")}
              </span>
            ))}
          </div>
        </section>
        <section aria-labelledby="filters-heading" className="settings-card">
          <h2 id="filters-heading">Matching preferences</h2>
          <p>Filters that will help focus results on suitable roles.</p>
          <div className="settings-values">
            <span className="badge">Philippines eligible</span>
            <span className="badge">Home care roles</span>
            <span className="badge">Remote</span>
          </div>
        </section>
        <section aria-labelledby="indeed-heading" className="settings-card">
          <h2 id="indeed-heading">Search on Indeed</h2>
          <p>Open prefilled searches on ph.Indeed.com. Indeed is not scraped.</p>
          {KEYWORDS.slice(0, 3).map((search) => (
            <a
              className="indeed-link"
              href={`https://ph.indeed.com/jobs?q=${encodeURIComponent(search)}`}
              key={search}
              rel="noreferrer"
              target="_blank"
            >
              {search}
              <span aria-hidden="true"> ↗</span>
            </a>
          ))}
        </section>
        <section aria-labelledby="security-heading" className="settings-card">
          <h2 id="security-heading">Account access</h2>
          <p>
            This workspace is private. Sign-in is restricted to the configured
            owner email.
          </p>
          <span className="badge direct">Private workspace</span>
        </section>
      </div>
    </AppShell>
  );
}
