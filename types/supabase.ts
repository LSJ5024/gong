// Supabase 자동 생성 타입 플레이스홀더
// 실제 프로젝트 연결 후: supabase gen types typescript --local > types/supabase.ts

export type Database = {
  public: {
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          profile_name: string
          education_level: string | null
          major_category: string | null
          major_detail: string | null
          school_name: string | null
          school_region: string | null
          gpa: number | null
          double_major: string | null
          /** AES-256-GCM 암호화된 보훈 여부 (애플리케이션 레이어 복호화 필요) */
          is_veterans_enc: string
          /** AES-256-GCM 암호화된 장애인 여부 (애플리케이션 레이어 복호화 필요) */
          is_disabled_enc: string
          is_local_talent: boolean
          is_non_capital: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          profile_name?: string
          education_level?: string | null
          major_category?: string | null
          major_detail?: string | null
          school_name?: string | null
          school_region?: string | null
          gpa?: number | null
          double_major?: string | null
          is_veterans_enc?: string
          is_disabled_enc?: string
          is_local_talent?: boolean
          is_non_capital?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          profile_name?: string
          education_level?: string | null
          major_category?: string | null
          major_detail?: string | null
          school_name?: string | null
          school_region?: string | null
          gpa?: number | null
          double_major?: string | null
          is_veterans_enc?: string
          is_disabled_enc?: string
          is_local_talent?: boolean
          is_non_capital?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_certificates: {
        Row: {
          id: string
          profile_id: string
          certificate_id: string
          acquired_date: string
          grade: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          certificate_id: string
          acquired_date: string
          grade?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          certificate_id?: string
          acquired_date?: string
          grade?: string | null
        }
        Relationships: []
      }
      user_language_scores: {
        Row: {
          id: string
          profile_id: string
          exam_type: string
          score: number | null
          grade: string | null
          acquired_date: string
          expiry_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          exam_type: string
          score?: number | null
          grade?: string | null
          acquired_date: string
          expiry_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          exam_type?: string
          score?: number | null
          grade?: string | null
          acquired_date?: string
          expiry_date?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          id: string
          name: string
          issuer: string
          category: string
          grade: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          issuer: string
          category: string
          grade?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          issuer?: string
          category?: string
          grade?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      public_enterprises: {
        Row: {
          id: string
          name: string
          type: string
          ministry: string | null
          location: string | null
          website_url: string | null
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          ministry?: string | null
          location?: string | null
          website_url?: string | null
          last_updated?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          ministry?: string | null
          location?: string | null
          website_url?: string | null
          last_updated?: string
        }
        Relationships: []
      }
      bonus_point_rules: {
        Row: {
          id: string
          enterprise_id: string
          category: string
          item_id: string | null
          condition_detail: string
          bonus_point_percentage: number
          source_url: string | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          enterprise_id: string
          category: string
          item_id?: string | null
          condition_detail: string
          bonus_point_percentage: number
          source_url?: string | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          enterprise_id?: string
          category?: string
          item_id?: string | null
          condition_detail?: string
          bonus_point_percentage?: number
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          enterprise_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          enterprise_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          enterprise_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          user_id: string | null
          enterprise_id: string
          rule_id: string | null
          /** incorrect_info | outdated | missing_rule | other */
          report_type: string
          description: string
          /** pending | reviewed | resolved */
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          enterprise_id: string
          rule_id?: string | null
          report_type: string
          description: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          enterprise_id?: string
          rule_id?: string | null
          report_type?: string
          description?: string
          status?: string
        }
        Relationships: []
      }
    }
  }
}
