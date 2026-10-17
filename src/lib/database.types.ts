export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          dedupe_key: string;
          source_url: string | null;
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
          source_url?: string | null;
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
          source_url?: string | null;
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
      sources: {
        Row: {
          id: string;
          name: string;
          method: "api" | "rss" | "html";
          enabled: boolean | null;
          last_run_at: string | null;
          last_status: "ok" | "error" | "blocked" | null;
          last_error: string | null;
        };
        Insert: {
          id: string;
          name: string;
          method: "api" | "rss" | "html";
          enabled?: boolean | null;
          last_run_at?: string | null;
          last_status?: "ok" | "error" | "blocked" | null;
          last_error?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          method?: "api" | "rss" | "html";
          enabled?: boolean | null;
          last_run_at?: string | null;
          last_status?: "ok" | "error" | "blocked" | null;
          last_error?: string | null;
        };
        Relationships: [];
      };
      job_sources: {
        Row: {
          job_id: string;
          source_id: string;
          url: string;
          seen_at: string | null;
        };
        Insert: {
          job_id: string;
          source_id: string;
          url: string;
          seen_at?: string | null;
        };
        Update: {
          job_id?: string;
          source_id?: string;
          url?: string;
          seen_at?: string | null;
        };
        Relationships: [];
      };
      runs: {
        Row: {
          id: string;
          started_at: string | null;
          finished_at: string | null;
          source_id: string | null;
          status: string | null;
          jobs_found: number | null;
          jobs_new: number | null;
          error: string | null;
        };
        Insert: {
          id?: string;
          started_at?: string | null;
          finished_at?: string | null;
          source_id?: string | null;
          status?: string | null;
          jobs_found?: number | null;
          jobs_new?: number | null;
          error?: string | null;
        };
        Update: {
          id?: string;
          started_at?: string | null;
          finished_at?: string | null;
          source_id?: string | null;
          status?: string | null;
          jobs_found?: number | null;
          jobs_new?: number | null;
          error?: string | null;
        };
        Relationships: [];
      };
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
