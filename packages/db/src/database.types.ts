// ============================================================
// Liguita — types TypeScript générés pour Supabase
// ============================================================
// Générés via : pnpm --filter @liguita/db db:types
// (supabase gen types typescript --local > src/database.types.ts)
//
// ⚠️ Ce fichier est un squelette manuel aligné sur les migrations
// 0001–0008. Régénérez-le avec la CLI Supabase dès qu'un projet local
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
    };
    Enums: {
      app_role: AppRole;
      lost_status: LostStatus;
      item_status: ItemStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
