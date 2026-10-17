const USER_AGENT =
  "HomeCareJobsTracker/1.0 (personal job search; public job listings)";
const MIN_REQUEST_INTERVAL_MS = 1_000;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_CHARS = 15_000_000;

type RobotsRule = {
  allow: boolean;
  pattern: string;
};

type RobotsPolicy = {
  rules: RobotsRule[];
  crawlDelayMs: number;
};

const robotsCache = new Map<string, RobotsPolicy>();
const nextRequestAt = new Map<string, number>();

export class SourceBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceBlockedError";
  }
}

async function waitForDomain(hostname: string, crawlDelayMs = 0) {
  const waitUntil = Math.max(
    nextRequestAt.get(hostname) ?? 0,
    Date.now(),
  );
  const waitMs = waitUntil - Date.now();
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  nextRequestAt.set(
    hostname,
    Date.now() + Math.max(MIN_REQUEST_INTERVAL_MS, crawlDelayMs),
  );
}

function wildcardRuleMatches(pattern: string, path: string): boolean {
  if (!pattern) return false;
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const expression = new RegExp(
    `^${body
      .split("*")
      .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*")}${anchored ? "$" : ""}`,
  );
  return expression.test(path);
}

function parseRobots(text: string): RobotsPolicy {
  const groups: Array<{ agents: string[]; rules: RobotsRule[]; delay: number }> = [];
  let current: { agents: string[]; rules: RobotsRule[]; delay: number } | null =
    null;
  let hasRules = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0]?.trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === "user-agent") {
      if (!current || hasRules) {
        current = { agents: [], rules: [], delay: 0 };
        groups.push(current);
        hasRules = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      hasRules = true;
      if (value) current.rules.push({ allow: key === "allow", pattern: value });
    } else if (key === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds > 0) {
        current.delay = Math.max(current.delay, seconds * 1_000);
      }
    }
  }

  const specific = groups.filter((group) =>
    group.agents.some((agent) => agent !== "*" && USER_AGENT.toLowerCase().includes(agent)),
  );
  const selected = specific.length
    ? specific
    : groups.filter((group) => group.agents.includes("*"));

  return {
    rules: selected.flatMap((group) => group.rules),
    crawlDelayMs: Math.max(0, ...selected.map((group) => group.delay)),
  };
}

async function getRobotsPolicy(url: URL): Promise<RobotsPolicy> {
  const cached = robotsCache.get(url.origin);
  if (cached) return cached;

  const robotsUrl = new URL("/robots.txt", url.origin);
  await waitForDomain(url.hostname);
  const response = await fetch(robotsUrl, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/plain" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 404 || response.status === 410) {
    const openPolicy = { rules: [], crawlDelayMs: 0 };
    robotsCache.set(url.origin, openPolicy);
    return openPolicy;
  }
  if (!response.ok) {
    throw new SourceBlockedError(
      `Could not verify robots.txt (HTTP ${response.status}); refusing to fetch this source.`,
    );
  }

  const policy = parseRobots(await response.text());
  robotsCache.set(url.origin, policy);
  return policy;
}

async function ensureRobotsAllows(url: URL): Promise<RobotsPolicy> {
  const policy = await getRobotsPolicy(url);
  const requestPath = `${url.pathname}${url.search}`;
  const matching = policy.rules
    .filter((rule) => wildcardRuleMatches(rule.pattern, requestPath))
    .sort((left, right) => right.pattern.length - left.pattern.length);
  const mostSpecific = matching[0];
  if (mostSpecific && !mostSpecific.allow) {
    throw new SourceBlockedError(
      `robots.txt disallows ${url.pathname}; source skipped.`,
    );
  }
  return policy;
}

export async function fetchText(urlText: string, accept: string): Promise<string> {
  const url = new URL(urlText);
  const policy = await ensureRobotsAllows(url);
  await waitForDomain(url.hostname, policy.crawlDelayMs);

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: accept,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 403 || response.status === 429) {
    throw new SourceBlockedError(`Source denied the request (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(`Source returned HTTP ${response.status}.`);
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_CHARS) {
    throw new Error(`Source response is too large (${contentLength} bytes).`);
  }

  const text = await response.text();
  if (text.length > MAX_RESPONSE_CHARS) {
    throw new Error(`Source response exceeds the ${MAX_RESPONSE_CHARS}-character limit.`);
  }
  return text;
}

export async function fetchJson<T>(url: string): Promise<T> {
  const body = await fetchText(url, "application/json");
  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new Error(
      `Source returned invalid JSON: ${error instanceof Error ? error.message : "unknown parse error"}`,
    );
  }
}

export function plainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number(decimal)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, hexadecimal: string) =>
      String.fromCodePoint(Number.parseInt(hexadecimal, 16)),
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
