import assert from "node:assert/strict";
import { test } from "node:test";
import { makeDedupeKey, mergeDuplicateJobs, normalizePay, processJob } from "../../src/lib/processing";
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

test("keyword match is case-insensitive and rejects unrelated roles", () => {
  assert.equal(processJob(rawJob({ title: "CARE COORDINATOR" }))?.title, "CARE COORDINATOR");
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
