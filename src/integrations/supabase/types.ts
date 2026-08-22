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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ai_caption_settings: {
        Row: {
          caption_length: string
          created_at: string
          cta: string | null
          enabled: boolean
          extra_instructions: string | null
          hashtag_count: number
          id: string
          tone: string
          updated_at: string
          use_emoji: boolean
          user_id: string
        }
        Insert: {
          caption_length?: string
          created_at?: string
          cta?: string | null
          enabled?: boolean
          extra_instructions?: string | null
          hashtag_count?: number
          id?: string
          tone?: string
          updated_at?: string
          use_emoji?: boolean
          user_id: string
        }
        Update: {
          caption_length?: string
          created_at?: string
          cta?: string | null
          enabled?: boolean
          extra_instructions?: string | null
          hashtag_count?: number
          id?: string
          tone?: string
          updated_at?: string
          use_emoji?: boolean
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_name: string | null
          author_profile_pic: string | null
          comment_text: string
          created_at: string
          id: string
          is_hidden: boolean
          platform: string
          platform_comment_id: string
          post_id: string
          replied: boolean
          reply_text: string | null
          synced_at: string
          user_id: string
        }
        Insert: {
          author_name?: string | null
          author_profile_pic?: string | null
          comment_text: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          platform: string
          platform_comment_id: string
          post_id: string
          replied?: boolean
          reply_text?: string | null
          synced_at?: string
          user_id: string
        }
        Update: {
          author_name?: string | null
          author_profile_pic?: string | null
          comment_text?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          platform?: string
          platform_comment_id?: string
          post_id?: string
          replied?: boolean
          reply_text?: string | null
          synced_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connected_accounts: {
        Row: {
          access_token: string | null
          connected_at: string | null
          created_at: string
          id: string
          instagram_account_id: string | null
          is_connected: boolean
          page_id: string | null
          platform: string
          platform_username: string | null
          refresh_token: string | null
          token_expires_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          instagram_account_id?: string | null
          is_connected?: boolean
          page_id?: string | null
          platform: string
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          instagram_account_id?: string | null
          is_connected?: boolean
          page_id?: string | null
          platform?: string
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          created_at: string
          description: string | null
          error_message: string | null
          id: string
          media_type: string | null
          media_urls: string[] | null
          platforms: string[]
          scheduled_date: string
          status: string
          title: string
          user_id: string
          video_file_url: string
          video_id: string | null
          video_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          media_type?: string | null
          media_urls?: string[] | null
          platforms: string[]
          scheduled_date: string
          status?: string
          title: string
          user_id: string
          video_file_url: string
          video_id?: string | null
          video_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          media_type?: string | null
          media_urls?: string[] | null
          platforms?: string[]
          scheduled_date?: string
          status?: string
          title?: string
          user_id?: string
          video_file_url?: string
          video_id?: string | null
          video_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_stats: {
        Row: {
          comments: number
          id: string
          likes: number
          platform: string
          shares: number
          updated_at: string
          video_id: string
          views: number
        }
        Insert: {
          comments?: number
          id?: string
          likes?: number
          platform: string
          shares?: number
          updated_at?: string
          video_id: string
          views?: number
        }
        Update: {
          comments?: number
          id?: string
          likes?: number
          platform?: string
          shares?: number
          updated_at?: string
          video_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_stats_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string
          description: string | null
          duration: number | null
          file_url: string
          id: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number | null
          file_url: string
          id?: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number | null
          file_url?: string
          id?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
