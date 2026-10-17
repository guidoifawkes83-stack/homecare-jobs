import assert from "node:assert/strict";
import { test } from "node:test";
import { WORKABLE_BOARDS } from "../config";
import { parseJobStreetResults } from "../sources/jobstreet";
import { parseOnlineJobsListings } from "../sources/onlinejobs";
import { parseWorkableListings } from "../sources/workable";

test("parses public OnlineJobs.ph listing cards without account pages", () => {
  const jobs = parseOnlineJobsListings(`
    <a href="/jobseekers/job/home-care-coordinator-123">
      <div class="jobpost-cat-box">
        <h4>Home Care Coordinator <span>Full Time</span></h4>
        <p data-temp="2026-10-16 01:35:49" data-temp-2="2026-10-15 17:35:49"><em>Posted on 2026-10-16</em></p>
        <dl><dd>$7-$8/hour</dd></dl>
        <div class="desc">Coordinate home care schedules.</div>
      </div>
    </a>
  `);

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, "Home Care Coordinator");
  assert.equal(jobs[0].url, "https://www.onlinejobs.ph/jobseekers/job/home-care-coordinator-123");
  assert.equal(jobs[0].source_url, jobs[0].url);
  assert.equal(jobs[0].payText, "$7-$8/hour");
  assert.match(jobs[0].description, /home care schedules/);
  assert.equal(jobs[0].postedAt, "2026-10-15T17:35:49.000Z");
});

test("parses public JobStreet job cards and absolute listing URLs", () => {
  const jobs = parseJobStreetResults(
    `<article data-automation="jobCard">
      <a data-automation="jobTitle" href="/job/12345678">Home Care Scheduler</a>
      <span data-automation="jobCompany">Example Care</span>
      <span data-automation="jobCardLocation">Philippines (Remote)</span>
      <div data-automation="jobShortDescription">Manage home care schedules.</div>
      <time data-automation="jobListingDate">2d ago</time>
    </article>`,
    "https://ph.jobstreet.com/jobs?keywords=home%20care",
  );

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, "Home Care Scheduler");
  assert.equal(jobs[0].company, "Example Care");
  assert.equal(jobs[0].url, "https://ph.jobstreet.com/job/12345678");
  assert.equal(jobs[0].source_url, jobs[0].url);
  assert.equal(jobs[0].regionNote, "Philippines (Remote)");
});

test("parses public Workable jobs markdown rows and original detail URLs", () => {
  const listings = parseWorkableListings(`# Helper Heroes — All Open Positions

| Title | Department | Location | Type | Salary | Posted | Details |
|-------|-----------|----------|------|--------|--------|---------|
| Home Care Scheduler | Other | Philippines (Remote) | Full-time | — | 2026-02-07 | [View](https://apply.workable.com/helperheroes/jobs/view/DC9514F2A1.md) |
| Bookkeeper | Other | Philippines | — | USD 12,000 | — | [View](https://apply.workable.com/helperheroes/jobs/view/ABC123.md) |
`);

  assert.equal(listings.length, 2);
  assert.deepEqual(listings[0], {
    title: "Home Care Scheduler",
    location: "Philippines (Remote)",
    schedule: "Full-time",
    pay: null,
    postedAt: "2026-02-07",
    detailsUrl:
      "https://apply.workable.com/helperheroes/jobs/view/DC9514F2A1.md",
  });
  assert.equal(listings[1].pay, "USD 12,000");
  assert.equal(listings[1].postedAt, null);
});

test("configures the five Workable company boards as independent sources", () => {
  assert.deepEqual(
    WORKABLE_BOARDS.map(({ slug }) => slug),
    [
      "helperheroes",
      "pearl-talent",
      "superstaff",
      "hunt-st",
      "winning-assistants",
    ],
  );
  assert.equal(new Set(WORKABLE_BOARDS.map(({ id }) => id)).size, 5);
});
