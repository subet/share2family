// This file will be replaced by `supabase gen types typescript` once local Supabase is running.
// For now, these manual types provide basic typing for the Supabase client.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_emoji: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_emoji?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_emoji?: string;
        };
        Relationships: [];
      };
      families: {
        Row: {
          id: string;
          name: string | null;
          invite_code: string | null;
          invite_code_expires_at: string | null;
          max_members: number;
          is_premium: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          invite_code?: string | null;
          invite_code_expires_at?: string | null;
          max_members?: number;
          is_premium?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          invite_code?: string | null;
          invite_code_expires_at?: string | null;
          max_members?: number;
          is_premium?: boolean;
        };
        Relationships: [];
      };
      family_members: {
        Row: {
          family_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          family_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          family_id?: string;
          user_id?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'family_members_family_id_fkey';
            columns: ['family_id'];
            referencedRelation: 'families';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'family_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          emoji: string | null;
          color: string | null;
          position: number;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          emoji?: string | null;
          color?: string | null;
          position?: number;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          name?: string;
          emoji?: string | null;
          color?: string | null;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_family_id_fkey';
            columns: ['family_id'];
            referencedRelation: 'families';
            referencedColumns: ['id'];
          },
        ];
      };
      notes: {
        Row: {
          id: string;
          family_id: string;
          category_id: string | null;
          type: string;
          title: string;
          emoji: string | null;
          position: number;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          family_id: string;
          category_id?: string | null;
          type: string;
          title: string;
          emoji?: string | null;
          position?: number;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          family_id?: string;
          category_id?: string | null;
          title?: string;
          emoji?: string | null;
          position?: number;
          updated_by?: string | null;
          archived_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notes_family_id_fkey';
            columns: ['family_id'];
            referencedRelation: 'families';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notes_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      checklist_items: {
        Row: {
          id: string;
          note_id: string;
          content: string;
          is_completed: boolean;
          position: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          note_id: string;
          content: string;
          is_completed?: boolean;
          position?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          note_id?: string;
          content?: string;
          is_completed?: boolean;
          position?: number;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'checklist_items_note_id_fkey';
            columns: ['note_id'];
            referencedRelation: 'notes';
            referencedColumns: ['id'];
          },
        ];
      };
      item_history: {
        Row: {
          family_id: string;
          user_id: string;
          item_name: string;
          use_count: number;
          last_used: string;
        };
        Insert: {
          family_id: string;
          user_id: string;
          item_name: string;
          use_count?: number;
          last_used?: string;
        };
        Update: {
          family_id?: string;
          user_id?: string;
          item_name?: string;
          use_count?: number;
          last_used?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'item_history_family_id_fkey';
            columns: ['family_id'];
            referencedRelation: 'families';
            referencedColumns: ['id'];
          },
        ];
      };
      note_content: {
        Row: {
          note_id: string;
          body_markdown: string | null;
          updated_at: string;
        };
        Insert: {
          note_id: string;
          body_markdown?: string | null;
          updated_at?: string;
        };
        Update: {
          body_markdown?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      devices: {
        Row: {
          id: string;
          user_id: string;
          device_name: string | null;
          platform: string | null;
          push_token: string | null;
          last_active: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_name?: string | null;
          platform?: string | null;
          push_token?: string | null;
          last_active?: string;
          created_at?: string;
        };
        Update: {
          device_name?: string | null;
          platform?: string | null;
          push_token?: string | null;
          last_active?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_family_with_code: {
        Args: { p_name: string; p_creator_id: string };
        Returns: Json;
      };
      join_family_with_code: {
        Args: { p_code: string; p_user_id: string };
        Returns: Json;
      };
      lookup_invite_code: {
        Args: { code: string };
        Returns: { family_id: string; family_name: string }[];
      };
      seed_default_categories: {
        Args: { p_family_id: string };
        Returns: undefined;
      };
      upsert_item_history: {
        Args: { p_family_id: string; p_user_id: string; p_item_name: string };
        Returns: undefined;
      };
      check_family_can_join: {
        Args: { p_code: string };
        Returns: Json;
      };
      upgrade_family_to_premium: {
        Args: { p_family_id: string };
        Returns: undefined;
      };
      is_family_member: {
        Args: { p_family_id: string };
        Returns: boolean;
      };
      is_family_admin: {
        Args: { p_family_id: string };
        Returns: boolean;
      };
      user_family_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Family = Database['public']['Tables']['families']['Row'];
export type FamilyMember = Database['public']['Tables']['family_members']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Note = Database['public']['Tables']['notes']['Row'];
export type ChecklistItem = Database['public']['Tables']['checklist_items']['Row'];
export type ItemHistory = Database['public']['Tables']['item_history']['Row'];
