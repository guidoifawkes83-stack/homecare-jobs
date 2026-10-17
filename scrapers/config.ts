export type SourceId =
  | "remotive"
  | "remoteok"
  | "weworkremotely"
  | "himalayas"
  | "workingnomads"
  | "onlinejobs"
  | "jobstreet"
  | "workable";

export type ScraperSource = {
  id: SourceId;
  name: string;
  method: "api" | "rss" | "html";
  enabled: boolean;
  endpoint?: string;
  note?: string;
};

export const ROLE_SIGNALS = [
  "scheduler",
  "coordinator",
  "caregiver",
  "rostering",
  "intake",
  "dispatch",
];

export const CARE_SIGNALS = [
  "home care",
  "homecare",
  "caregiver",
  "senior care",
  "elderly care",
  "client care",
  "patient",
  "healthcare",
  "in-home",
  "aged care",
];

export const SOFTWARE_TAGS = [
  "WellSky",
  "AxisCare",
  "ClearCare",
  "AlayaCare",
  "CareSmartz360",
  "ShiftCare",
  "Connecteam",
  "EVV",
];

export const EXCLUSIONS = [
  "\\bon[- ]site only\\b",
  "\\bmust reside in (?:the )?(?:us|u\\.s\\.|united states|america)\\b",
  "\\b(?:us|u\\.s\\.|united states)[- ]only residency\\b",
  "\\b(?:registered nurse|\\brn\\b|\\blicensed practical nurse|\\blpn\\b).{0,50}\\b(required|license|licensure|must have)\\b",
  "\\b(required|license|licensure|must have).{0,50}\\b(?:registered nurse|\\brn\\b|\\blicensed practical nurse|\\blpn\\b)\\b",
  "\\b(?:hands[- ]on|direct patient|bedside) care\\b",
];

export const TITLE_EXCLUSIONS = [
  "\\b(?:caregiver|care aide|home health aide|personal care aide)\\b",
  "\\b(?:sales representative|sales executive|account executive|business development representative)\\b",
  "\\bsales[- ]only\\b",
];

export const AGENCY_COMPANIES = [
  "Helper Heroes",
  "Pearl Talent",
  "ClearDesk",
  "SmartScale360",
  "CS-PAC",
  "T-Mate",
  "SuperStaff",
  "Platonics",
  "OLIVIA",
  "Winning Assistants",
];

export const CURRENCY_RATES = {
  phpPerUsd: 63,
  usdPerAud: 0.69,
  hoursPerMonth: 173,
} as const;

export const SOURCES: ScraperSource[] = [
  {
    id: "remotive",
    name: "Remotive",
    method: "api",
    enabled: true,
    endpoint: "https://remotive.com/api/remote-jobs?search=care",
  },
  {
    id: "remoteok",
    name: "Remote OK",
    method: "api",
    enabled: true,
    endpoint: "https://remoteok.com/api",
  },
  {
    id: "weworkremotely",
    name: "We Work Remotely",
    method: "rss",
    enabled: true,
    endpoint: "https://weworkremotely.com/remote-jobs.rss",
  },
  {
    id: "himalayas",
    name: "Himalayas",
    method: "api",
    enabled: true,
    endpoint: "https://himalayas.app/jobs/api?limit=50",
  },
  {
    id: "workingnomads",
    name: "Working Nomads",
    method: "api",
    enabled: true,
    endpoint: "https://www.workingnomads.com/api/exposed_jobs/",
  },
  {
    id: "onlinejobs",
    name: "OnlineJobs.ph",
    method: "html",
    enabled: false,
    note: "Phase 3: public HTML source not enabled yet.",
  },
  {
    id: "jobstreet",
    name: "JobStreet PH",
    method: "html",
    enabled: false,
    note: "Phase 3: public HTML source not enabled yet.",
  },
  {
    id: "workable",
    name: "Workable",
    method: "html",
    enabled: false,
    note: "Phase 3: public HTML source not enabled yet.",
  },
];

export const SOURCE_NAMES = Object.fromEntries(
  SOURCES.map(({ id, name }) => [id, name]),
) as Record<SourceId, string>;
