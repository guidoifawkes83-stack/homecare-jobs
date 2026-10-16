type TableDefinition<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

type SourceRow = {
  id: string;
  name: string;
  method: "api" | "rss" | "html";
  enabled: boolean | null;
  last_run_at: string | null;
  last_status: "ok" | "error" | "blocked" | null;
  last_error: string | null;
};

type SourceInsert = {
  id: string;
  name: string;
  method: "api" | "rss" | "html";
  enabled?: boolean | null;
  last_run_at?: string | null;
  last_status?: "ok" | "error" | "blocked" | null;
  last_error?: string | null;
};

type JobSourceRow = {
  job_id: string;
  source_id: string;
  url: string;
  seen_at: string | null;
};

type JobSourceInsert = {
  job_id: string;
  source_id: string;
  url: string;
  seen_at?: string | null;
};

type RunRow = {
  id: string;
  started_at: string | null;
  finished_at: string | null;
  source_id: string | null;
  status: string | null;
  jobs_found: number | null;
  jobs_new: number | null;
  error: string | null;
};

type RunInsert = {
  id?: string;
  started_at?: string | null;
  finished_at?: string | null;
  source_id?: string | null;
  status?: string | null;
  jobs_found?: number | null;
  jobs_new?: number | null;
  error?: string | null;
};

export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          dedupe_key: string;
          title: string;
          company: string | null;
          description: string | null;
          pay_text: string | null;
          pay_usd_hourly_min: number | null;
          pay_usd_hourly_max: number | null;
          schedule_text: string | null;
          poster_type: "direct" | "agency" | "unknown" | null;
          software: string[] | null;
          region_note: string | null;
          score: number | null;
          first_seen_at: string | null;
          last_seen_at: string | null;
          posted_at: string | null;
          is_active: boolean | null;
          status:
            | "new"
            | "saved"
            | "applied"
            | "interviewing"
            | "rejected"
            | "ignored"
            | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          dedupe_key: string;
          title: string;
          company?: string | null;
          description?: string | null;
          pay_text?: string | null;
          pay_usd_hourly_min?: number | null;
          pay_usd_hourly_max?: number | null;
          schedule_text?: string | null;
          poster_type?: "direct" | "agency" | "unknown" | null;
          software?: string[] | null;
          region_note?: string | null;
          score?: number | null;
          first_seen_at?: string | null;
          last_seen_at?: string | null;
          posted_at?: string | null;
          is_active?: boolean | null;
          status?:
            | "new"
            | "saved"
            | "applied"
            | "interviewing"
            | "rejected"
            | "ignored"
            | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          dedupe_key?: string;
          title?: string;
          company?: string | null;
          description?: string | null;
          pay_text?: string | null;
          pay_usd_hourly_min?: number | null;
          pay_usd_hourly_max?: number | null;
          schedule_text?: string | null;
          poster_type?: "direct" | "agency" | "unknown" | null;
          software?: string[] | null;
          region_note?: string | null;
          score?: number | null;
          first_seen_at?: string | null;
          last_seen_at?: string | null;
          posted_at?: string | null;
          is_active?: boolean | null;
          status?:
            | "new"
            | "saved"
            | "applied"
            | "interviewing"
            | "rejected"
            | "ignored"
            | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      sources: TableDefinition<SourceRow, SourceInsert>;
      job_sources: TableDefinition<JobSourceRow, JobSourceInsert>;
      runs: TableDefinition<RunRow, RunInsert>;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
