import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getJobMatchResult,
  makeDedupeKey,
  mergeDuplicateJobs,
  normalizePay,
  processJob,
} from "../../src/lib/processing";
import type { ProcessedJob, RawJob } from "../types";

function rawJob(overrides: Partial<RawJob> = {}): RawJob {
  return {
    title: "Home Care Scheduler",
    company: "Harbor Home Care",
    description: "We are a home care provider. Coordinate schedules using WellSky. Philippines applicants welcome.",
    payText: "$6–8 USD / hour",
    scheduleText: "Full time",
    regionNote: "Philippines eligible",
    postedAt: new Date().toISOString(),
    url: "https://example.com/job/1",
    source_url: "https://example.com/job/1",
    sourceId: "remotive",
    ...overrides,
  };
}

function processedJob(
  sourceId: ProcessedJob["sources"][number]["sourceId"],
  url: string,
): ProcessedJob {
  const job = processJob(rawJob({ sourceId, url }));
  assert.ok(job);
  return job;
}

test("dedupe key ignores punctuation, accents, and repeated whitespace", () => {
  assert.equal(
    makeDedupeKey("Hárbor  Home-Care, Inc.", "Home Care Scheduler!"),
    "harbor home care inc|home care scheduler",
  );
});

test("a role signal and care signal must both occur in the title", () => {
  for (const title of [
    "Homecare Scheduler",
    "Senior Care Coordinator",
    "Healthcare Rostering Lead",
    "Patient Intake Specialist",
    "In-home Dispatch Manager",
    "Aged Care Scheduler",
  ]) {
    const result = getJobMatchResult({ title, description: "A role." });
    assert.equal(result.matched, true, title);
  }
});

test("unrelated coordinator and scheduler roles do not match care roles", () => {
  for (const title of [
    "Night Scheduler",
    "Operations Coordinator",
    "Renewables Project Scheduler",
    "Marketing Coordinator",
    "Travel Coordinator",
    "Principal Product Manager Strategic Initiatives",
    "Clinical Coordination Manager",
    "Regional Finance Manager (Serbia)",
    "CDQI Audit Specialist",
    "Regional Rostering Lead",
    "Intake Specialist",
    "Dispatch Manager",
  ]) {
    const result = getJobMatchResult({ title, description: "A role in healthcare." });
    assert.equal(result.matched, false, title);
  }
});

test("description signals cannot qualify a title, and exclusions are reported", () => {
  assert.equal(
    getJobMatchResult({
      title: "Night Scheduler",
      description: "A senior care organization that needs a scheduler.",
    }).rejectionReason,
    "Title has none of the required care signals: home care, homecare, caregiver, senior care, elderly care, client care, patient, healthcare, in-home, aged care.",
  );
  assert.match(
    getJobMatchResult({
      title: "Home Care Scheduler",
      description: "Applicants must reside in the United States.",
    }).rejectionReason ?? "",
    /Matched exclusion rule/,
  );
  assert.equal(
    getJobMatchResult({ title: "Caregiver", description: "" }).matched,
    false,
  );
  assert.equal(
    getJobMatchResult({ title: "Caregiver", description: "" }).matchedSignal,
    "caregiver",
  );
});

test("rejects titles with no job-signal substring", () => {
  assert.equal(
    processJob(rawJob({ title: "Customer Support Specialist", description: "Answer customer calls." })),
    null,
  );
});

test("excludes clinical, hands-on caregiver, sales-only, and US-residency roles", () => {
  assert.equal(
    processJob(rawJob({ title: "RN Home Care Scheduler", description: "RN license required." })),
    null,
  );
  assert.equal(
    processJob(rawJob({ title: "Caregiver Scheduler", description: "Provide hands-on care." })),
    null,
  );
  assert.equal(
    processJob(rawJob({ title: "Home Care Scheduler - Sales Representative" })),
    null,
  );
  assert.equal(
    processJob(rawJob({ description: "Applicants must reside in the United States." })),
    null,
  );
});

test("normalizes USD hourly, USD monthly, AUD monthly, and PHP hourly pay", () => {
  assert.deepEqual(normalizePay("$6–8 USD / hour"), { min: 6, max: 8 });
  assert.deepEqual(normalizePay("USD 1,038–1,384 per month"), { min: 6, max: 8 });
  assert.deepEqual(normalizePay("AUD 1,506 monthly"), {
    min: 6.01,
    max: 6.01,
  });
  assert.deepEqual(normalizePay("PHP 378 per hour"), {
    min: 6,
    max: 6,
  });
  assert.deepEqual(normalizePay("Competitive salary"), {
    min: null,
    max: null,
  });
});

test("scores direct, software, pay, location, and recent roles", () => {
  const job = processJob(rawJob());
  assert.ok(job);
  assert.equal(job.poster_type, "direct");
  assert.equal(job.software.includes("WellSky"), true);
  assert.equal(job.score, 95);
});

test("copies each raw posting URL into the persisted source_url field", () => {
  const job = processJob(
    rawJob({
      url: "https://jobs.example.com/original",
      source_url: "https://jobs.example.com/original",
    }),
  );
  assert.ok(job);
  assert.equal(job.source_url, "https://jobs.example.com/original");
});

test("merges cross-source duplicates and retains each attribution link", () => {
  const merged = mergeDuplicateJobs([
    processedJob("remotive", "https://remotive.com/job/1"),
    processedJob("himalayas", "https://himalayas.app/jobs/1"),
  ]);
  assert.equal(merged.length, 1);
  assert.deepEqual(
    merged[0].sources.map(({ sourceId }) => sourceId).sort(),
    ["himalayas", "remotive"],
  );
});
