import { readFile } from "node:fs/promises";
import path from "node:path";
import type { LocalRunSnapshot } from "../../scrapers/types";

export async function readLocalRunSnapshot(): Promise<LocalRunSnapshot | null> {
  const filePath = path.join(process.cwd(), ".data", "latest-run.json");
  try {
    const content = await readFile(filePath, "utf8");
    const snapshot: unknown = JSON.parse(content);

    if (
      snapshot === null ||
      typeof snapshot !== "object" ||
      !("jobs" in snapshot) ||
      !Array.isArray(snapshot.jobs) ||
      !("runs" in snapshot) ||
      !Array.isArray(snapshot.runs)
    ) {
      throw new Error("Local scraper results have an invalid data shape.");
    }

    return snapshot as LocalRunSnapshot;
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

export function hasSupabaseReadCredentials(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
