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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          resource_id: string | null
          resource_name: string | null
          resource_type: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_sessions: {
        Row: {
          admin_id: string
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_fingerprint: string | null
          device_model: string | null
          device_type: string | null
          device_vendor: string | null
          id: string
          ip_address: string | null
          os: string | null
          os_version: string | null
          session_type: string
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          device_model?: string | null
          device_type?: string | null
          device_vendor?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          os_version?: string | null
          session_type: string
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          device_model?: string | null
          device_type?: string | null
          device_vendor?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          os_version?: string | null
          session_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_active: boolean
          telegram_chat_id: string | null
          totp_secret: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          is_active?: boolean
          totp_secret?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_active?: boolean
          totp_secret?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_group_memberships: {
        Row: {
          app_id: string
          group_id: string
        }
        Insert: {
          app_id: string
          group_id: string
        }
        Update: {
          app_id?: string
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_group_memberships_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "compatibility_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          accent_color: string | null
          author: string | null
          category: string | null
          compatible_with: string[] | null
          content_types: string[] | null
          created_at: string
          description: string | null
          discord_url: string | null
          download_count: number | null
          download_url: string | null
          fork_of: string | null
          icon_color: string | null
          icon_url: string | null
          id: string
          last_release_date: string | null
          likes_count: number | null
          metadata: Json | null
          name: string
          og_image_url: string | null
          platforms: string[] | null
          repo_url: string | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string | null
          social_urls: Json | null
          status: string
          tags: string[] | null
          tutorials: Json | null
          updated_at: string
          upstream_url: string | null
          version: string | null
          website_url: string | null
        }
        Insert: {
          accent_color?: string | null
          author?: string | null
          category?: string | null
          compatible_with?: string[] | null
          content_types?: string[] | null
          created_at?: string
          description?: string | null
          discord_url?: string | null
          download_count?: number | null
          download_url?: string | null
          fork_of?: string | null
          icon_color?: string | null
          icon_url?: string | null
          id?: string
          last_release_date?: string | null
          likes_count?: number | null
          metadata?: Json | null
          name: string
          og_image_url?: string | null
          platforms?: string[] | null
          repo_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string | null
          social_urls?: Json | null
          status?: string
          tags?: string[] | null
          tutorials?: Json | null
          updated_at?: string
          upstream_url?: string | null
          version?: string | null
          website_url?: string | null
        }
        Update: {
          accent_color?: string | null
          author?: string | null
          category?: string | null
          compatible_with?: string[] | null
          content_types?: string[] | null
          created_at?: string
          description?: string | null
          discord_url?: string | null
          download_count?: number | null
          download_url?: string | null
          fork_of?: string | null
          icon_color?: string | null
          icon_url?: string | null
          id?: string
          last_release_date?: string | null
          likes_count?: number | null
          metadata?: Json | null
          name?: string
          og_image_url?: string | null
          platforms?: string[] | null
          repo_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string | null
          social_urls?: Json | null
          status?: string
          tags?: string[] | null
          tutorials?: Json | null
          updated_at?: string
          upstream_url?: string | null
          version?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_avatar_url: string | null
          author_id: string | null
          author_name: string | null
          author_role: string | null
          category: string
          content: string
          content_format: string
          created_at: string
          excerpt: string | null
          id: string
          is_pinned: boolean | null
          og_image_url: string | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[] | null
          thumbnail_alt: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          views: number | null
        }
        Insert: {
          author_avatar_url?: string | null
          author_id?: string | null
          author_name?: string | null
          author_role?: string | null
          category: string
          content: string
          content_format?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_pinned?: boolean | null
          og_image_url?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          thumbnail_alt?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          author_avatar_url?: string | null
          author_id?: string | null
          author_name?: string | null
          author_role?: string | null
          category?: string
          content?: string
          content_format?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_pinned?: boolean | null
          og_image_url?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          thumbnail_alt?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      bot_attack_logs: {
        Row: {
          country: string | null
          created_at: string
          headers_dump: Json | null
          id: string
          ip_address: string | null
          reason: string
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          headers_dump?: Json | null
          id?: string
          ip_address?: string | null
          reason: string
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          headers_dump?: Json | null
          id?: string
          ip_address?: string | null
          reason?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      compatibility_groups: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      donation_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          date: string | null
          donor_name: string
          id: string
          is_public: boolean | null
          message: string | null
          payment_method: string | null
          show_amount: boolean | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          date?: string | null
          donor_name: string
          id?: string
          is_public?: boolean | null
          message?: string | null
          payment_method?: string | null
          show_amount?: boolean | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          date?: string | null
          donor_name?: string
          id?: string
          is_public?: boolean | null
          message?: string | null
          payment_method?: string | null
          show_amount?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      extension_group_memberships: {
        Row: {
          extension_id: string
          group_id: string
        }
        Insert: {
          extension_id: string
          group_id: string
        }
        Update: {
          extension_id?: string
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_group_memberships_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "compatibility_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      extensions: {
        Row: {
          moderator_note: string | null
          note_severity: string | null
          accent_color: string | null
          author: string | null
          auto_url: string | null
          category: string | null
          compatible_with: string[] | null
          created_at: string
          description: string | null
          discord_url: string | null
          download_count: number | null
          icon_color: string | null
          icon_url: string | null
          id: string
          info: string | null
          language: string | null
          last_updated: string | null
          likes_count: number | null
          manual_url: string | null
          metadata: Json | null
          name: string
          og_image_url: string | null
          platforms: string[] | null
          region: string | null
          repo_url: string | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string | null
          social_urls: Json | null
          source_url: string | null
          status: string
          tags: string[] | null
          tutorials: Json | null
          types: string[] | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          moderator_note?: string | null
          note_severity?: string | null
          accent_color?: string | null
          author?: string | null
          auto_url?: string | null
          category?: string | null
          compatible_with?: string[] | null
          created_at?: string
          description?: string | null
          discord_url?: string | null
          download_count?: number | null
          icon_color?: string | null
          icon_url?: string | null
          id?: string
          info?: string | null
          language?: string | null
          last_updated?: string | null
          likes_count?: number | null
          manual_url?: string | null
          metadata?: Json | null
          name: string
          og_image_url?: string | null
          platforms?: string[] | null
          region?: string | null
          repo_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string | null
          social_urls?: Json | null
          source_url?: string | null
          status?: string
          tags?: string[] | null
          tutorials?: Json | null
          types?: string[] | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          moderator_note?: string | null
          note_severity?: string | null
          accent_color?: string | null
          author?: string | null
          auto_url?: string | null
          category?: string | null
          compatible_with?: string[] | null
          created_at?: string
          description?: string | null
          discord_url?: string | null
          download_count?: number | null
          icon_color?: string | null
          icon_url?: string | null
          id?: string
          info?: string | null
          language?: string | null
          last_updated?: string | null
          likes_count?: number | null
          manual_url?: string | null
          metadata?: Json | null
          name?: string
          og_image_url?: string | null
          platforms?: string[] | null
          region?: string | null
          repo_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string | null
          social_urls?: Json | null
          source_url?: string | null
          status?: string
          tags?: string[] | null
          tutorials?: Json | null
          types?: string[] | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          content_format: string | null
          created_at: string
          id: string
          legacy_id: string | null
          order_index: number
          question: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          content_format?: string | null
          created_at?: string
          id?: string
          legacy_id?: string | null
          order_index?: number
          question: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          content_format?: string | null
          created_at?: string
          id?: string
          legacy_id?: string | null
          order_index?: number
          question?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          admin_note: string | null
          created_at: string
          feedback_type: string | null
          id: string
          message: string
          page_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_contact: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          feedback_type?: string | null
          id?: string
          message: string
          page_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_contact?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          feedback_type?: string | null
          id?: string
          message?: string
          page_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_contact?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      guides: {
        Row: {
          author: string | null
          author_avatar_url: string | null
          author_name: string | null
          category: string | null
          content: string | null
          content_format: string
          content_html: string | null
          content_mode: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          og_image_url: string | null
          published_at: string | null
          related_apps: string[] | null
          related_extensions: string[] | null
          seo_description: string | null
          seo_title: string | null
          slug: string | null
          status: string
          tags: string[] | null
          template_version: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          author_avatar_url?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          content_format?: string
          content_html?: string | null
          content_mode?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          og_image_url?: string | null
          published_at?: string | null
          related_apps?: string[] | null
          related_extensions?: string[] | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          status?: string
          tags?: string[] | null
          template_version?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          author_avatar_url?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          content_format?: string
          content_html?: string | null
          content_mode?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          og_image_url?: string | null
          published_at?: string | null
          related_apps?: string[] | null
          related_extensions?: string[] | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          status?: string
          tags?: string[] | null
          template_version?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          anonymous_id: string | null
          browser: string | null
          browser_version: string | null
          device_fingerprint: string
          device_model: string | null
          device_type: string | null
          device_vendor: string | null
          fingerprint_method: string | null
          id: string
          ip_address: string | null
          ip_hash: string | null
          item_id: string
          item_type: string
          language: string | null
          liked_at: string
          os: string | null
          os_version: string | null
          referrer: string | null
          screen_resolution: string | null
          timezone: string | null
          user_agent: string | null
          user_agent_hash: string | null
        }
        Insert: {
          anonymous_id?: string | null
          browser?: string | null
          browser_version?: string | null
          device_fingerprint: string
          device_model?: string | null
          device_type?: string | null
          device_vendor?: string | null
          fingerprint_method?: string | null
          id?: string
          ip_address?: string | null
          ip_hash?: string | null
          item_id: string
          item_type?: string
          language?: string | null
          liked_at?: string
          os?: string | null
          os_version?: string | null
          referrer?: string | null
          screen_resolution?: string | null
          timezone?: string | null
          user_agent?: string | null
          user_agent_hash?: string | null
        }
        Update: {
          anonymous_id?: string | null
          browser?: string | null
          browser_version?: string | null
          device_fingerprint?: string
          device_model?: string | null
          device_type?: string | null
          device_vendor?: string | null
          fingerprint_method?: string | null
          id?: string
          ip_address?: string | null
          ip_hash?: string | null
          item_id?: string
          item_type?: string
          language?: string | null
          liked_at?: string
          os?: string | null
          os_version?: string | null
          referrer?: string | null
          screen_resolution?: string | null
          timezone?: string | null
          user_agent?: string | null
          user_agent_hash?: string | null
        }
        Relationships: []
      }
      notices: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          dismissible: boolean
          end_date: string | null
          id: string
          message: string
          priority: number
          start_date: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          dismissible?: boolean
          end_date?: string | null
          id?: string
          message: string
          priority?: number
          start_date?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          dismissible?: boolean
          end_date?: string | null
          id?: string
          message?: string
          priority?: number
          start_date?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_edit_suggestions: {
        Row: {
          admin_note: string | null
          approved_data: Json | null
          created_at: string
          id: string
          original_data_snapshot: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_data: Json
          submitter_contact: string | null
          submitter_name: string | null
          submitter_user_id: string | null
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          approved_data?: Json | null
          created_at?: string
          id?: string
          original_data_snapshot?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_data?: Json
          submitter_contact?: string | null
          submitter_name?: string | null
          submitter_user_id?: string | null
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          approved_data?: Json | null
          created_at?: string
          id?: string
          original_data_snapshot?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_data?: Json
          submitter_contact?: string | null
          submitter_name?: string | null
          submitter_user_id?: string | null
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_note: string | null
          anonymous_id: string | null
          browser: string | null
          created_at: string
          device_fingerprint: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          language: string | null
          message: string | null
          os: string | null
          page_url: string | null
          reason: string
          reporter_contact: string | null
          reporter_name: string | null
          reporter_user_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screen_resolution: string | null
          status: string
          target_id: string | null
          target_type: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          anonymous_id?: string | null
          browser?: string | null
          created_at?: string
          device_fingerprint?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          language?: string | null
          message?: string | null
          os?: string | null
          page_url?: string | null
          reason: string
          reporter_contact?: string | null
          reporter_name?: string | null
          reporter_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screen_resolution?: string | null
          status?: string
          target_id?: string | null
          target_type: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          anonymous_id?: string | null
          browser?: string | null
          created_at?: string
          device_fingerprint?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          language?: string | null
          message?: string | null
          os?: string | null
          page_url?: string | null
          reason?: string
          reporter_contact?: string | null
          reporter_name?: string | null
          reporter_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screen_resolution?: string | null
          status?: string
          target_id?: string | null
          target_type?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          category: string | null
          description: string | null
          is_sensitive: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string | null
          description?: string | null
          is_sensitive?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string | null
          description?: string | null
          is_sensitive?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      submissions: {
        Row: {
          admin_notes: string | null
          author: string | null
          created_at: string
          duplicate_check_results: Json | null
          id: string
          recaptcha_score: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_type: string
          submitted_data: Json
          submitter_contact: string | null
          submitter_email: string | null
          submitter_name: string | null
          submitter_user_id: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          author?: string | null
          created_at?: string
          duplicate_check_results?: Json | null
          id?: string
          recaptcha_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_type: string
          submitted_data?: Json
          submitter_contact?: string | null
          submitter_email?: string | null
          submitter_name?: string | null
          submitter_user_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          author?: string | null
          created_at?: string
          duplicate_check_results?: Json | null
          id?: string
          recaptcha_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_type?: string
          submitted_data?: Json
          submitter_contact?: string | null
          submitter_email?: string | null
          submitter_name?: string | null
          submitter_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      themes: {
        Row: {
          active_from: string | null
          active_to: string | null
          assets: Json | null
          created_at: string
          css_variables: Json | null
          id: string
          is_active: boolean
          is_seasonal: boolean
          name: string
          particle_config: Json | null
          preview_image: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          active_from?: string | null
          active_to?: string | null
          assets?: Json | null
          created_at?: string
          css_variables?: Json | null
          id?: string
          is_active?: boolean
          is_seasonal?: boolean
          name: string
          particle_config?: Json | null
          preview_image?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          active_from?: string | null
          active_to?: string | null
          assets?: Json | null
          created_at?: string
          css_variables?: Json | null
          id?: string
          is_active?: boolean
          is_seasonal?: boolean
          name?: string
          particle_config?: Json | null
          preview_image?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      unauthorized_login_attempts: {
        Row: {
          auth_provider: string
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          created_at: string
          device_fingerprint: string | null
          device_model: string | null
          device_type: string | null
          device_vendor: string | null
          email: string | null
          id: string
          ip_address: string | null
          os: string | null
          os_version: string | null
          user_agent: string | null
        }
        Insert: {
          auth_provider?: string
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_fingerprint?: string | null
          device_model?: string | null
          device_type?: string | null
          device_vendor?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          os_version?: string | null
          user_agent?: string | null
        }
        Update: {
          auth_provider?: string
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_fingerprint?: string | null
          device_model?: string | null
          device_type?: string | null
          device_vendor?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          os_version?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_likes_summary: {
        Row: {
          anonymous_id: string | null
          browser: string | null
          device_type: string | null
          first_like_date: string | null
          item_types_count: number | null
          last_like_date: string | null
          os: string | null
          total_likes: number | null
          unique_ips: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_super_admin: { Args: never; Returns: boolean }
      cleanup_expired_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_rejected: { Args: never; Returns: undefined }
      clear_admin_data: { Args: { target_table: string }; Returns: undefined }
      get_likes_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_blog_view: { Args: { blog_id: string }; Returns: undefined }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      system_has_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin"
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
    Enums: {
      app_role: ["super_admin", "admin"],
    },
  },
} as const
