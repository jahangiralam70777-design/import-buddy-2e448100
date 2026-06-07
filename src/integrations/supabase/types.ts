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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          created_at: string
          device: string | null
          element_id: string | null
          element_label: string | null
          element_role: string | null
          event_type: string
          id: string
          metadata: Json
          module: string | null
          page_path: string | null
          page_url: string | null
          referrer: string | null
          target_id: string | null
          target_kind: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device?: string | null
          element_id?: string | null
          element_label?: string | null
          element_role?: string | null
          event_type: string
          id?: string
          metadata?: Json
          module?: string | null
          page_path?: string | null
          page_url?: string | null
          referrer?: string | null
          target_id?: string | null
          target_kind?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device?: string | null
          element_id?: string | null
          element_label?: string | null
          element_role?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          module?: string | null
          page_path?: string | null
          page_url?: string | null
          referrer?: string | null
          target_id?: string | null
          target_kind?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      attempt_answers: {
        Row: {
          attempt_id: string
          chosen_option: Database["public"]["Enums"]["mcq_option"] | null
          id: string
          is_correct: boolean
          mcq_id: string
          time_spent_ms: number
        }
        Insert: {
          attempt_id: string
          chosen_option?: Database["public"]["Enums"]["mcq_option"] | null
          id?: string
          is_correct?: boolean
          mcq_id: string
          time_spent_ms?: number
        }
        Update: {
          attempt_id?: string
          chosen_option?: Database["public"]["Enums"]["mcq_option"] | null
          id?: string
          is_correct?: boolean
          mcq_id?: string
          time_spent_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_mcq_id_fkey"
            columns: ["mcq_id"]
            isOneToOne: false
            referencedRelation: "mcqs"
            referencedColumns: ["id"]
          },
        ]
      }
      avatars: {
        Row: {
          created_at: string
          id: string
          public_url: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          public_url?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          public_url?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          subject_id: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          subject_id: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          snapshot: Json
          target_key: string
          target_kind: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          snapshot?: Json
          target_key: string
          target_kind: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          snapshot?: Json
          target_key?: string
          target_kind?: string
        }
        Relationships: []
      }
      exam_attempts: {
        Row: {
          attempt_number: number
          chapter_id: string | null
          completed_at: string | null
          correct_count: number
          created_at: string
          duration_seconds: number
          id: string
          kind: string
          level: string | null
          meta: Json
          quiz_id: string | null
          score: number
          started_at: string
          status: string
          subject_id: string | null
          title: string | null
          total_count: number
          user_id: string
        }
        Insert: {
          attempt_number?: number
          chapter_id?: string | null
          completed_at?: string | null
          correct_count?: number
          created_at?: string
          duration_seconds?: number
          id?: string
          kind?: string
          level?: string | null
          meta?: Json
          quiz_id?: string | null
          score?: number
          started_at?: string
          status?: string
          subject_id?: string | null
          title?: string | null
          total_count?: number
          user_id: string
        }
        Update: {
          attempt_number?: number
          chapter_id?: string | null
          completed_at?: string | null
          correct_count?: number
          created_at?: string
          duration_seconds?: number
          id?: string
          kind?: string
          level?: string | null
          meta?: Json
          quiz_id?: string | null
          score?: number
          started_at?: string
          status?: string
          subject_id?: string | null
          title?: string | null
          total_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_card_visibility: {
        Row: {
          hidden_chapter_ids: string[]
          hidden_levels: string[]
          hidden_subject_ids: string[]
          id: number
          section_hidden: boolean
          updated_at: string
        }
        Insert: {
          hidden_chapter_ids?: string[]
          hidden_levels?: string[]
          hidden_subject_ids?: string[]
          id?: number
          section_hidden?: boolean
          updated_at?: string
        }
        Update: {
          hidden_chapter_ids?: string[]
          hidden_levels?: string[]
          hidden_subject_ids?: string[]
          id?: number
          section_hidden?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      flash_cards: {
        Row: {
          back: string
          card_type: string
          chapter_id: string | null
          created_at: string
          created_by: string | null
          formula: string | null
          front: string
          id: string
          image_url: string | null
          is_hidden: boolean
          level: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          subject_id: string | null
          tags: string[]
          updated_at: string
          view_count: number
        }
        Insert: {
          back: string
          card_type?: string
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          formula?: string | null
          front: string
          id?: string
          image_url?: string | null
          is_hidden?: boolean
          level?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string | null
          tags?: string[]
          updated_at?: string
          view_count?: number
        }
        Update: {
          back?: string
          card_type?: string
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          formula?: string | null
          front?: string
          id?: string
          image_url?: string | null
          is_hidden?: boolean
          level?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string | null
          tags?: string[]
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "flash_cards_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_cards_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_sections: {
        Row: {
          created_at: string
          draft_content: Json
          id: string
          position: number
          published_at: string | null
          published_content: Json
          section_key: string
          updated_at: string
          updated_by: string | null
          visible: boolean
        }
        Insert: {
          created_at?: string
          draft_content?: Json
          id?: string
          position?: number
          published_at?: string | null
          published_content?: Json
          section_key: string
          updated_at?: string
          updated_by?: string | null
          visible?: boolean
        }
        Update: {
          created_at?: string
          draft_content?: Json
          id?: string
          position?: number
          published_at?: string | null
          published_content?: Json
          section_key?: string
          updated_at?: string
          updated_by?: string | null
          visible?: boolean
        }
        Relationships: []
      }
      levels: {
        Row: {
          code: string
          color: string | null
          description: string | null
          icon: string | null
          name: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          code: string
          color?: string | null
          description?: string | null
          icon?: string | null
          name: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string | null
          description?: string | null
          icon?: string | null
          name?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: []
      }
      mcq_bookmarks: {
        Row: {
          chapter_id: string | null
          created_at: string
          id: string
          level: string | null
          mcq_id: string
          subject_id: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          level?: string | null
          mcq_id: string
          subject_id?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          level?: string | null
          mcq_id?: string
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcq_bookmarks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_bookmarks_mcq_id_fkey"
            columns: ["mcq_id"]
            isOneToOne: false
            referencedRelation: "mcqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_bookmarks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_delete_audit: {
        Row: {
          admin_id: string | null
          admin_name: string | null
          chapter_id: string | null
          created_at: string
          deleted_count: number
          id: string
          level: string | null
          mcq_ids: string[]
          scope: string
          subject_id: string | null
        }
        Insert: {
          admin_id?: string | null
          admin_name?: string | null
          chapter_id?: string | null
          created_at?: string
          deleted_count?: number
          id?: string
          level?: string | null
          mcq_ids?: string[]
          scope?: string
          subject_id?: string | null
        }
        Update: {
          admin_id?: string | null
          admin_name?: string | null
          chapter_id?: string | null
          created_at?: string
          deleted_count?: number
          id?: string
          level?: string | null
          mcq_ids?: string[]
          scope?: string
          subject_id?: string | null
        }
        Relationships: []
      }
      mcq_wrong_questions: {
        Row: {
          chapter_id: string | null
          correct_option: Database["public"]["Enums"]["mcq_option"] | null
          created_at: string
          id: string
          last_chosen_option: Database["public"]["Enums"]["mcq_option"] | null
          last_wrong_at: string
          level: string | null
          mastered: boolean
          mcq_id: string
          retry_count: number
          subject_id: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          correct_option?: Database["public"]["Enums"]["mcq_option"] | null
          created_at?: string
          id?: string
          last_chosen_option?: Database["public"]["Enums"]["mcq_option"] | null
          last_wrong_at?: string
          level?: string | null
          mastered?: boolean
          mcq_id: string
          retry_count?: number
          subject_id?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          correct_option?: Database["public"]["Enums"]["mcq_option"] | null
          created_at?: string
          id?: string
          last_chosen_option?: Database["public"]["Enums"]["mcq_option"] | null
          last_wrong_at?: string
          level?: string | null
          mastered?: boolean
          mcq_id?: string
          retry_count?: number
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcq_wrong_questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_wrong_questions_mcq_id_fkey"
            columns: ["mcq_id"]
            isOneToOne: false
            referencedRelation: "mcqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_wrong_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      mcqs: {
        Row: {
          chapter_id: string
          correct_option: Database["public"]["Enums"]["mcq_option"]
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          status: Database["public"]["Enums"]["content_status"]
          tags: string[]
          updated_at: string
        }
        Insert: {
          chapter_id: string
          correct_option: Database["public"]["Enums"]["mcq_option"]
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          chapter_id?: string
          correct_option?: Database["public"]["Enums"]["mcq_option"]
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcqs_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string | null
          bucket: string
          created_at: string
          file_name: string
          height: number | null
          id: string
          mime_type: string
          path: string
          size_bytes: number
          tags: string[]
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          bucket: string
          created_at?: string
          file_name: string
          height?: number | null
          id?: string
          mime_type: string
          path: string
          size_bytes?: number
          tags?: string[]
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          bucket?: string
          created_at?: string
          file_name?: string
          height?: number | null
          id?: string
          mime_type?: string
          path?: string
          size_bytes?: number
          tags?: string[]
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      module_visibility: {
        Row: {
          hidden: boolean
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          hidden?: boolean
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          hidden?: boolean
          key?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          created_at: string
          notification_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          notification_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: string
          audience_level: string | null
          audience_role: string | null
          audience_subject_id: string | null
          audience_user_ids: string[]
          body: string
          created_at: string
          created_by: string | null
          delivered_count: number
          id: string
          link: string | null
          open_count: number
          priority: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          audience?: string
          audience_level?: string | null
          audience_role?: string | null
          audience_subject_id?: string | null
          audience_user_ids?: string[]
          body?: string
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          id?: string
          link?: string | null
          open_count?: number
          priority?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          audience?: string
          audience_level?: string | null
          audience_role?: string | null
          audience_subject_id?: string | null
          audience_user_ids?: string[]
          body?: string
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          id?: string
          link?: string | null
          open_count?: number
          priority?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          id: string
          last_login_at: string | null
          level: string | null
          referral_source: string | null
          status: string
          total_login_count: number
          total_usage_seconds: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          id: string
          last_login_at?: string | null
          level?: string | null
          referral_source?: string | null
          status?: string
          total_login_count?: number
          total_usage_seconds?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          id?: string
          last_login_at?: string | null
          level?: string | null
          referral_source?: string | null
          status?: string
          total_login_count?: number
          total_usage_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      question_bank_resources: {
        Row: {
          body: string | null
          chapter_id: string | null
          created_at: string
          created_by: string | null
          download_count: number
          file_name: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          is_hidden: boolean
          kind: string
          level: string
          question_count: number
          resource_type: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          subject_id: string | null
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          body?: string | null
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          download_count?: number
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_hidden?: boolean
          kind?: string
          level?: string
          question_count?: number
          resource_type?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string | null
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          body?: string | null
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          download_count?: number
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_hidden?: boolean
          kind?: string
          level?: string
          question_count?: number
          resource_type?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string | null
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_resources_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank_visibility: {
        Row: {
          hidden_chapter_ids: string[]
          hidden_levels: string[]
          hidden_subject_ids: string[]
          id: number
          section_hidden: boolean
          updated_at: string
        }
        Insert: {
          hidden_chapter_ids?: string[]
          hidden_levels?: string[]
          hidden_subject_ids?: string[]
          id?: number
          section_hidden?: boolean
          updated_at?: string
        }
        Update: {
          hidden_chapter_ids?: string[]
          hidden_levels?: string[]
          hidden_subject_ids?: string[]
          id?: number
          section_hidden?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          id: string
          mcq_id: string
          position: number
          quiz_id: string
        }
        Insert: {
          id?: string
          mcq_id: string
          position?: number
          quiz_id: string
        }
        Update: {
          id?: string
          mcq_id?: string
          position?: number
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_mcq_id_fkey"
            columns: ["mcq_id"]
            isOneToOne: false
            referencedRelation: "mcqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          answers: Json
          chapter_id: string | null
          correct_count: number | null
          created_at: string
          duration_seconds: number
          id: string
          level: string | null
          mcq_ids: string[]
          question_count: number
          score: number | null
          started_at: string | null
          status: string
          subject_id: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
          wrong_count: number | null
        }
        Insert: {
          answers?: Json
          chapter_id?: string | null
          correct_count?: number | null
          created_at?: string
          duration_seconds?: number
          id?: string
          level?: string | null
          mcq_ids?: string[]
          question_count?: number
          score?: number | null
          started_at?: string | null
          status?: string
          subject_id?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          wrong_count?: number | null
        }
        Update: {
          answers?: Json
          chapter_id?: string | null
          correct_count?: number | null
          created_at?: string
          duration_seconds?: number
          id?: string
          level?: string | null
          mcq_ids?: string[]
          question_count?: number
          score?: number | null
          started_at?: string | null
          status?: string
          subject_id?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          wrong_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          chapter_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          duration_seconds: number
          ends_at: string | null
          id: string
          is_public: boolean
          kind: string
          level: string
          negative_marking: number
          passing_marks: number
          randomize_options: boolean
          randomize_questions: boolean
          starts_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          subject_id: string | null
          title: string
          total_questions: number
          updated_at: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          duration_seconds?: number
          ends_at?: string | null
          id?: string
          is_public?: boolean
          kind?: string
          level?: string
          negative_marking?: number
          passing_marks?: number
          randomize_options?: boolean
          randomize_questions?: boolean
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string | null
          title: string
          total_questions?: number
          updated_at?: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          duration_seconds?: number
          ends_at?: string | null
          id?: string
          is_public?: boolean
          kind?: string
          level?: string
          negative_marking?: number
          passing_marks?: number
          randomize_options?: boolean
          randomize_questions?: boolean
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string | null
          title?: string
          total_questions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      short_notes: {
        Row: {
          body: string | null
          chapter_id: string | null
          created_at: string
          created_by: string | null
          download_count: number
          file_name: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          is_hidden: boolean
          kind: string
          level: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          subject_id: string | null
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          body?: string | null
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          download_count?: number
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_hidden?: boolean
          kind?: string
          level?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string | null
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          body?: string | null
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          download_count?: number
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_hidden?: boolean
          kind?: string
          level?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string | null
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "short_notes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      short_notes_visibility: {
        Row: {
          hidden_chapter_ids: string[]
          hidden_levels: string[]
          hidden_subject_ids: string[]
          id: number
          section_hidden: boolean
          updated_at: string
        }
        Insert: {
          hidden_chapter_ids?: string[]
          hidden_levels?: string[]
          hidden_subject_ids?: string[]
          id?: number
          section_hidden?: boolean
          updated_at?: string
        }
        Update: {
          hidden_chapter_ids?: string[]
          hidden_levels?: string[]
          hidden_subject_ids?: string[]
          id?: number
          section_hidden?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          draft_value: Json
          id: string
          key: string
          published_at: string | null
          published_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          draft_value?: Json
          id?: string
          key: string
          published_at?: string | null
          published_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          draft_value?: Json
          id?: string
          key?: string
          published_at?: string | null
          published_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color: string | null
          description: string | null
          icon: string | null
          id: string
          level: string
          name: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          level?: string
          name: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          level?: string
          name?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_level_fkey"
            columns: ["level"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["code"]
          },
        ]
      }
      user_login_events: {
        Row: {
          browser: string | null
          created_at: string
          device: string | null
          duration_seconds: number | null
          id: string
          ip: string | null
          login_at: string
          logout_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device?: string | null
          duration_seconds?: number | null
          id?: string
          ip?: string | null
          login_at?: string
          logout_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device?: string | null
          duration_seconds?: number | null
          id?: string
          ip?: string | null
          login_at?: string
          logout_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          active_session_id: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          active_session_id: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          active_session_id?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      video_class_visibility: {
        Row: {
          hidden_chapter_ids: string[]
          hidden_levels: string[]
          hidden_subject_ids: string[]
          id: number
          section_hidden: boolean
          updated_at: string
        }
        Insert: {
          hidden_chapter_ids?: string[]
          hidden_levels?: string[]
          hidden_subject_ids?: string[]
          id?: number
          section_hidden?: boolean
          updated_at?: string
        }
        Update: {
          hidden_chapter_ids?: string[]
          hidden_levels?: string[]
          hidden_subject_ids?: string[]
          id?: number
          section_hidden?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      video_classes: {
        Row: {
          chapter_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number
          id: string
          instructor: string | null
          is_featured: boolean
          is_hidden: boolean
          kind: string
          level: string
          playlist_key: string | null
          position: number
          scheduled_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          subject_id: string | null
          tags: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
          view_count: number
          youtube_playlist_id: string | null
          youtube_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number
          id?: string
          instructor?: string | null
          is_featured?: boolean
          is_hidden?: boolean
          kind?: string
          level?: string
          playlist_key?: string | null
          position?: number
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          view_count?: number
          youtube_playlist_id?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number
          id?: string
          instructor?: string | null
          is_featured?: boolean
          is_hidden?: boolean
          kind?: string
          level?: string
          playlist_key?: string | null
          position?: number
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          view_count?: number
          youtube_playlist_id?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_classes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_classes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_activity_overview: {
        Args: { _range_hours?: number }
        Returns: Json
      }
      admin_activity_timeseries: {
        Args: { _bucket_minutes?: number; _range_hours?: number }
        Returns: {
          bucket: string
          event_count: number
          event_type: string
        }[]
      }
      admin_get_db_size: { Args: never; Returns: number }
      admin_get_table_sizes: {
        Args: never
        Returns: {
          row_estimate: number
          size_bytes: number
          table_name: string
        }[]
      }
      admin_hard_delete_user: { Args: { _id: string }; Returns: undefined }
      admin_restore_user: { Args: { _id: string }; Returns: undefined }
      admin_soft_delete_user: { Args: { _id: string }; Returns: undefined }
      admin_top_buttons: {
        Args: { _limit?: number; _range_hours?: number }
        Returns: {
          click_count: number
          element_id: string
          element_label: string
          page_path: string
        }[]
      }
      admin_top_modules: {
        Args: { _limit?: number; _range_hours?: number }
        Returns: {
          event_count: number
          module: string
          unique_users: number
        }[]
      }
      admin_top_pages: {
        Args: { _limit?: number; _range_hours?: number }
        Returns: {
          page_path: string
          unique_users: number
          view_count: number
        }[]
      }
      admin_top_users: {
        Args: { _limit?: number; _order?: string }
        Returns: {
          display_name: string
          last_login_at: string
          total_login_count: number
          total_usage_seconds: number
          user_id: string
        }[]
      }
      admin_user_activity: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          created_at: string
          element_label: string
          event_type: string
          id: string
          metadata: Json
          module: string
          page_path: string
          user_id: string
        }[]
      }
      admin_user_analytics: { Args: never; Returns: Json }
      claim_user_session: {
        Args: { _session_id: string; _user_agent?: string }
        Returns: {
          active_session_id: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "student"
      content_status: "draft" | "published" | "archived"
      difficulty_level: "easy" | "medium" | "hard"
      mcq_option: "A" | "B" | "C" | "D"
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
      app_role: ["admin", "moderator", "user", "student"],
      content_status: ["draft", "published", "archived"],
      difficulty_level: ["easy", "medium", "hard"],
      mcq_option: ["A", "B", "C", "D"],
    },
  },
} as const
