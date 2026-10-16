export type DemoJob = {
  id: string;
  title: string;
  company: string;
  source: string;
  pay: string;
  region: string;
  tags: string[];
  score: number;
  posterType: "direct" | "agency" | "unknown";
};

export const demoJobs: DemoJob[] = [
  {
    id: "demo-001",
    title: "Home Care Scheduler",
    company: "Cedar Grove Home Support",
    source: "OnlineJobs.ph",
    pay: "$6–8 / hr",
    region: "Philippines",
    tags: ["WellSky", "Remote"],
    score: 92,
    posterType: "direct",
  },
  {
    id: "demo-002",
    title: "Care Coordination Assistant",
    company: "Harborlight Care",
    source: "Remotive",
    pay: "$1,100 / mo",
    region: "Remote",
    tags: ["AxisCare", "Full-time"],
    score: 86,
    posterType: "direct",
  },
  {
    id: "demo-003",
    title: "Scheduling Coordinator",
    company: "Pearl Talent",
    source: "Workable",
    pay: "$5–7 / hr",
    region: "Philippines",
    tags: ["Remote", "US hours"],
    score: 74,
    posterType: "agency",
  },
  {
    id: "demo-004",
    title: "Home Health Intake Coordinator",
    company: "BrightPath Living",
    source: "We Work Remotely",
    pay: "$1,250 / mo",
    region: "Remote",
    tags: ["ClearCare", "Full-time"],
    score: 81,
    posterType: "direct",
  },
  {
    id: "demo-005",
    title: "Caregiver Staffing Coordinator",
    company: "SuperStaff",
    source: "JobStreet PH",
    pay: "$4–5 / hr",
    region: "Philippines",
    tags: ["Remote", "Night shift"],
    score: 52,
    posterType: "agency",
  },
  {
    id: "demo-006",
    title: "Remote Care Scheduler",
    company: "Kindred Home Services",
    source: "Himalayas",
    pay: "$7 / hr",
    region: "Philippines eligible",
    tags: ["ShiftCare", "Remote"],
    score: 89,
    posterType: "direct",
  },
  {
    id: "demo-007",
    title: "Workforce Scheduling Assistant",
    company: "Helper Heroes",
    source: "Workable",
    pay: "$900–1,100 / mo",
    region: "Philippines",
    tags: ["Connecteam", "Remote"],
    score: 69,
    posterType: "agency",
  },
  {
    id: "demo-008",
    title: "Home Care Operations Coordinator",
    company: "Maple & Main Care",
    source: "Remote OK",
    pay: "$6.50 / hr",
    region: "Remote",
    tags: ["EVV", "Full-time"],
    score: 84,
    posterType: "direct",
  },
  {
    id: "demo-009",
    title: "Intake and Placement Specialist",
    company: "Winning Assistants",
    source: "OnlineJobs.ph",
    pay: "$5 / hr",
    region: "Philippines",
    tags: ["Remote", "US hours"],
    score: 64,
    posterType: "agency",
  },
  {
    id: "demo-010",
    title: "Care Services Scheduling Assistant",
    company: "Silver Fern at Home",
    source: "Working Nomads",
    pay: "$1,300 / mo",
    region: "Remote",
    tags: ["AlayaCare", "Remote"],
    score: 87,
    posterType: "direct",
  },
];

export const sources = [
  "Remotive",
  "Remote OK",
  "We Work Remotely",
  "Himalayas",
  "Working Nomads",
  "OnlineJobs.ph",
  "JobStreet PH",
  "Workable",
];
