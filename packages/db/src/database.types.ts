// ============================================================
// Liguita — types TypeScript générés pour Supabase
// ============================================================
// Générés via : pnpm --filter @liguita/db db:types
// (supabase gen types typescript --local > src/database.types.ts)
//
// ⚠️ Ce fichier est un squelette manuel aligné sur les migrations
// 0001–0011. Régénérez-le avec la CLI Supabase dès qu'un projet local
// ou hébergé est disponible pour obtenir les types exacts de la base.
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = 'USER' | 'BUSINESS' | 'MODERATOR' | 'ADMIN';

export type LostStatus =
  | 'DECLARED'
  | 'SEARCHING'
  | 'MATCH_FOUND'
  | 'VERIFYING'
  | 'PAID'
  | 'RETURNED'
  | 'CLOSED'
  | 'EXPIRED';

export type ItemStatus =
  | 'FOUND'
  | 'IN_INVENTORY'
  | 'MATCH_POSSIBLE'
  | 'OWNER_IDENTIFIED'
  | 'RETURN_IN_PROGRESS'
  | 'RETURNED'
  | 'ARCHIVED';

export interface Profile {
  id: string;
  phone: string;
  phone_verified: boolean;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country_code: string;
  city_slug: string | null;
  locale: string;
  app_role: AppRole;
  trust_score: number;
  is_samaritan: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LostItem {
  id: string;
  user_id: string;
  category_code: string;
  item_type_code: string;
  title: string;
  description: string | null;
  brand: string | null;
  color: string | null;
  city_slug: string;
  neighborhood_slug: string | null;
  place_label: string;
  occurred_at: string;
  status: LostStatus;
  declared_value_xaf: number | null;
  created_at: string;
  updated_at: string;
}

export interface FoundItem {
  id: string;
  finder_id: string;
  category_code: string;
  item_type_code: string;
  title: string;
  description: string | null;
  brand: string | null;
  color: string | null;
  city_slug: string;
  neighborhood_slug: string | null;
  place_label: string;
  found_at: string;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
  search_vector?: unknown;
}

/**
 * Ligne publiée de `public_found_items` / `search_found_items` (0008).
 * Contrat d'anonymisation : ni `finder_id`, ni description complète,
 * ni coordonnées, ni téléphone.
 */
export interface PublicFoundItem {
  id: string;
  category_code: string;
  item_type_code: string;
  title: string;
  brand: string | null;
  color: string | null;
  city_slug: string;
  neighborhood_slug: string | null;
  place_label: string;
  found_at: string;
  status: ItemStatus;
  created_at: string;
  photo_count: number | null;
  description_preview: string | null;
}

/** Ligne de la RPC `search_found_items` : `PublicFoundItem` + curseur. */
export interface SearchFoundItemsRow extends PublicFoundItem {
  next_cursor_found_at: string | null;
  next_cursor_id: string | null;
}

export interface SearchFoundItemsArgs {
  p_query?: string | null;
  p_category_code?: string | null;
  p_city_slug?: string | null;
  p_neighborhood_slug?: string | null;
  p_item_type_code?: string | null;
  p_cursor_found_at?: string | null;
  p_cursor_id?: string | null;
  p_limit?: number;
}

export interface ItemPhoto {
  id: string;
  item_id: string;
  item_kind: 'LOST' | 'FOUND';
  url: string;
  thumbnail_url: string | null;
  blurhash: string | null;
  is_blurred: boolean;
  sort_order: number;
  created_at: string;
}

export interface ItemStatusHistory {
  id: string;
  item_id: string;
  item_kind: 'LOST' | 'FOUND';
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export type MatchLevel = 'VERY_LIKELY' | 'POSSIBLE' | 'WEAK';

export type MatchStatus =
  | 'NEW'
  | 'SEEN'
  | 'CLAIMED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CONVERTED';

export interface Match {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  score: number;
  level: MatchLevel;
  breakdown: Json;
  algorithm_version: string;
  status: MatchStatus;
  notified_owner_at: string | null;
  notified_finder_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  kind: string;
  channel: string;
  title: string;
  body: string | null;
  payload: Json | null;
  sent_at: string | null;
  read_at: string | null;
  error: string | null;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  label: string | null;
  query: string | null;
  category_code: string | null;
  city_slug: string | null;
  neighborhood_slug: string | null;
  item_type_code: string | null;
  channels: string[];
  is_active: boolean;
  last_run_at: string | null;
  last_notified_at: string | null;
  created_at: string;
}

export type ClaimStatus =
  | 'DRAFT'
  | 'QUESTIONS_SENT'
  | 'ANSWERS_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISPUTED'
  | 'EXPIRED';

export interface Claim {
  id: string;
  match_id: string;
  claimant_id: string;
  status: ClaimStatus;
  score: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  attempt_count: number;
  created_at: string;
  updated_at: string;
}

export interface VerificationQuestion {
  id: string;
  category_id: string;
  code: string;
  prompt_fr: string;
  answer_kind: 'text' | 'number' | 'date' | 'choice';
  choices: string[] | null;
  weight: number;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export interface VerificationAnswerRow {
  id: string;
  claim_id: string;
  question_id: string;
  answer: string | null;
  answer_photo: string | null;
  is_correct: boolean | null;
  points_awarded: number;
  created_at: string;
}

export interface FraudCase {
  id: string;
  subject_user_id: string | null;
  kind: string | null;
  signals: Json;
  risk_score: number;
  status: string;
  assigned_to: string | null;
  resolution: string | null;
  created_at: string;
  closed_at: string | null;
}

export interface FoundItemSecret {
  found_item_id: string;
  answers: Json;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; phone: string };
        Update: Partial<Profile>;
      };
      lost_items: {
        Row: LostItem;
        Insert: Partial<LostItem> & { user_id: string; title: string };
        Update: Partial<LostItem>;
      };
      found_items: {
        Row: FoundItem;
        Insert: Partial<FoundItem> & { finder_id: string; title: string };
        Update: Partial<FoundItem>;
      };
      item_photos: {
        Row: ItemPhoto;
        Insert: Partial<ItemPhoto> & { item_id: string; url: string };
        Update: Partial<ItemPhoto>;
      };
      item_status_history: {
        Row: ItemStatusHistory;
        Insert: Partial<ItemStatusHistory> & { item_id: string; new_status: string };
        Update: Partial<ItemStatusHistory>;
      };
      matches: {
        Row: Match;
        Insert: Partial<Match> & { lost_item_id: string; found_item_id: string; score: number; level: MatchLevel };
        Update: Partial<Match>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & { user_id: string; kind: string; title: string };
        Update: Partial<Notification>;
      };
      saved_searches: {
        Row: SavedSearch;
        Insert: Partial<SavedSearch> & { user_id: string };
        Update: Partial<SavedSearch>;
      };
      claims: {
        Row: Claim;
        Insert: Partial<Claim> & { match_id: string; claimant_id: string };
        Update: Partial<Claim>;
      };
      verification_questions: {
        Row: VerificationQuestion;
        Insert: Partial<VerificationQuestion> & { code: string; prompt_fr: string };
        Update: Partial<VerificationQuestion>;
      };
      verification_answers: {
        Row: VerificationAnswerRow;
        Insert: Partial<VerificationAnswerRow> & { claim_id: string; question_id: string };
        Update: Partial<VerificationAnswerRow>;
      };
      fraud_cases: {
        Row: FraudCase;
        Insert: Partial<FraudCase>;
        Update: Partial<FraudCase>;
      };
      found_item_secrets: {
        Row: FoundItemSecret;
        Insert: FoundItemSecret;
        Update: Partial<FoundItemSecret>;
      };
    };
    Views: {
      public_found_items: {
        Row: PublicFoundItem;
        Insert: never;
        Update: never;
      };
    };
    Functions: {
      search_found_items: {
        Args: SearchFoundItemsArgs;
        Returns: SearchFoundItemsRow[];
      };
      match_candidates_for_found: {
        Args: { p_found_id: string; p_window_days?: number };
        Returns: { lost_item_id: string }[];
      };
      match_candidates_for_lost: {
        Args: { p_lost_id: string; p_window_days?: number };
        Returns: { found_item_id: string }[];
      };
      match_sweep_candidates: {
        Args: { p_window_days?: number; p_limit?: number };
        Returns: { lost_item_id: string; found_item_id: string }[];
      };
      upsert_match: {
        Args: {
          p_lost_item_id: string;
          p_found_item_id: string;
          p_score: number;
          p_level: MatchLevel;
          p_breakdown: Json;
        };
        Returns: string;
      };
      run_saved_search_alerts: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: {
      app_role: AppRole;
      lost_status: LostStatus;
      item_status: ItemStatus;
      match_level: MatchLevel;
      match_status: MatchStatus;
      claim_status: ClaimStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
