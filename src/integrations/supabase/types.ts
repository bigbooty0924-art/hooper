export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      core_courses: {
        Row: {
          category: string
          completed: boolean
          course_name: string | null
          grade: string | null
          id: string
          slot: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          completed?: boolean
          course_name?: string | null
          grade?: string | null
          id?: string
          slot: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed?: boolean
          course_name?: string | null
          grade?: string | null
          id?: string
          slot?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      drill_sessions: {
        Row: {
          attempts: number
          created_at: string
          drill_type: string
          id: string
          makes: number
          performed_at: string
          user_id: string
        }
        Insert: {
          attempts: number
          created_at?: string
          drill_type: string
          id?: string
          makes: number
          performed_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          drill_type?: string
          id?: string
          makes?: number
          performed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_links: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          linked_at: string | null
          parent_user_id: string | null
          player_user_id: string
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          linked_at?: string | null
          parent_user_id?: string | null
          player_user_id: string
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          linked_at?: string | null
          parent_user_id?: string | null
          player_user_id?: string
          status?: string
        }
        Relationships: []
      }
      profile_media: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          title: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_media_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "scout_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_profiles: {
        Row: {
          aau_team: string | null
          avatar_url: string | null
          class_year: number | null
          created_at: string
          full_name: string
          head_coach_email: string | null
          head_coach_name: string | null
          head_coach_phone: string | null
          height_inches: number | null
          high_school_team: string | null
          id: string
          is_public: boolean
          jersey_number: string | null
          position: string | null
          slug: string
          updated_at: string
          user_id: string
          weight_lbs: number | null
          wingspan_inches: number | null
        }
        Insert: {
          aau_team?: string | null
          avatar_url?: string | null
          class_year?: number | null
          created_at?: string
          full_name: string
          head_coach_email?: string | null
          head_coach_name?: string | null
          head_coach_phone?: string | null
          height_inches?: number | null
          high_school_team?: string | null
          id?: string
          is_public?: boolean
          jersey_number?: string | null
          position?: string | null
          slug?: string
          updated_at?: string
          user_id: string
          weight_lbs?: number | null
          wingspan_inches?: number | null
        }
        Update: {
          aau_team?: string | null
          avatar_url?: string | null
          class_year?: number | null
          created_at?: string
          full_name?: string
          head_coach_email?: string | null
          head_coach_name?: string | null
          head_coach_phone?: string | null
          height_inches?: number | null
          high_school_team?: string | null
          id?: string
          is_public?: boolean
          jersey_number?: string | null
          position?: string | null
          slug?: string
          updated_at?: string
          user_id?: string
          weight_lbs?: number | null
          wingspan_inches?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_parent_link_code: { Args: never; Returns: string }
      generate_profile_slug: { Args: never; Returns: string }
      is_linked_parent: { Args: { p_player: string }; Returns: boolean }
      redeem_parent_link_code: { Args: { p_code: string }; Returns: string }
      scout_profile_shooting_stats: {
        Args: { p_slug: string }
        Returns: {
          ft_attempts: number
          ft_makes: number
          ft_pct: number
          sessions_logged: number
          three_attempts: number
          three_makes: number
          three_pct: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
