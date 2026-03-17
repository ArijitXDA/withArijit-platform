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
      activity_logs: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string | null
          employee_id: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_roles: {
        Row: {
          assigned_by: string | null
          can_assign_admins: boolean
          can_impersonate: boolean
          created_at: string | null
          email: string
          employee_id: string
          id: string
          is_active: boolean
          roles: number[]
          tier: string
          updated_at: string | null
          vertical: string | null
        }
        Insert: {
          assigned_by?: string | null
          can_assign_admins?: boolean
          can_impersonate?: boolean
          created_at?: string | null
          email: string
          employee_id: string
          id?: string
          is_active?: boolean
          roles?: number[]
          tier: string
          updated_at?: string | null
          vertical?: string | null
        }
        Update: {
          assigned_by?: string | null
          can_assign_admins?: boolean
          can_impersonate?: boolean
          created_at?: string | null
          email?: string
          employee_id?: string
          id?: string
          is_active?: boolean
          roles?: number[]
          tier?: string
          updated_at?: string | null
          vertical?: string | null
        }
        Relationships: []
      }
      advisory_data: {
        Row: {
          advisor_email: string
          assigned_aum: number | null
          assigned_leads: number | null
          aum_growth_mtm_pct: number | null
          created_at: string | null
          current_aum_mtm: number | null
          data_date: string
          employee_id: string | null
          fd_inflow_mtd: number | null
          fd_inflow_ytd: number | null
          gross_lumpsum_inflow_mtd: number | null
          gross_lumpsum_inflow_ytd: number | null
          id: string
          msci_inflow_mtd: number | null
          msci_inflow_ytd: number | null
          net_inflow_mtd: number | null
          net_inflow_ytd: number | null
          new_sip_inflow_mtd: number | null
          new_sip_inflow_ytd: number | null
          team: string | null
          total_outflow_mtd: number | null
          total_outflow_ytd: number | null
          total_sip_book: number | null
          total_sip_inflow_mtd: number | null
          total_sip_inflow_ytd: number | null
          ytd_net_aum_growth_pct: number | null
        }
        Insert: {
          advisor_email: string
          assigned_aum?: number | null
          assigned_leads?: number | null
          aum_growth_mtm_pct?: number | null
          created_at?: string | null
          current_aum_mtm?: number | null
          data_date: string
          employee_id?: string | null
          fd_inflow_mtd?: number | null
          fd_inflow_ytd?: number | null
          gross_lumpsum_inflow_mtd?: number | null
          gross_lumpsum_inflow_ytd?: number | null
          id?: string
          msci_inflow_mtd?: number | null
          msci_inflow_ytd?: number | null
          net_inflow_mtd?: number | null
          net_inflow_ytd?: number | null
          new_sip_inflow_mtd?: number | null
          new_sip_inflow_ytd?: number | null
          team?: string | null
          total_outflow_mtd?: number | null
          total_outflow_ytd?: number | null
          total_sip_book?: number | null
          total_sip_inflow_mtd?: number | null
          total_sip_inflow_ytd?: number | null
          ytd_net_aum_growth_pct?: number | null
        }
        Update: {
          advisor_email?: string
          assigned_aum?: number | null
          assigned_leads?: number | null
          aum_growth_mtm_pct?: number | null
          created_at?: string | null
          current_aum_mtm?: number | null
          data_date?: string
          employee_id?: string | null
          fd_inflow_mtd?: number | null
          fd_inflow_ytd?: number | null
          gross_lumpsum_inflow_mtd?: number | null
          gross_lumpsum_inflow_ytd?: number | null
          id?: string
          msci_inflow_mtd?: number | null
          msci_inflow_ytd?: number | null
          net_inflow_mtd?: number | null
          net_inflow_ytd?: number | null
          new_sip_inflow_mtd?: number | null
          new_sip_inflow_ytd?: number | null
          team?: string | null
          total_outflow_mtd?: number | null
          total_outflow_ytd?: number | null
          total_sip_book?: number | null
          total_sip_inflow_mtd?: number | null
          total_sip_inflow_ytd?: number | null
          ytd_net_aum_growth_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "advisory_data_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_access: {
        Row: {
          access_description: string
          allowed_tables: string[] | null
          can_query_database: boolean
          column_filters: Json | null
          denied_tables: string[] | null
          employee_id: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          no_access_description: string
          override_can_make_recommendations: boolean | null
          override_can_proactively_surface_insights: boolean | null
          persona_id: string | null
          query_db_config: Json
          row_scope: Json | null
          show_widget_on_dashboard: boolean | null
          updated_at: string | null
          widget_greeting: string | null
        }
        Insert: {
          access_description: string
          allowed_tables?: string[] | null
          can_query_database?: boolean
          column_filters?: Json | null
          denied_tables?: string[] | null
          employee_id?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          no_access_description: string
          override_can_make_recommendations?: boolean | null
          override_can_proactively_surface_insights?: boolean | null
          persona_id?: string | null
          query_db_config?: Json
          row_scope?: Json | null
          show_widget_on_dashboard?: boolean | null
          updated_at?: string | null
          widget_greeting?: string | null
        }
        Update: {
          access_description?: string
          allowed_tables?: string[] | null
          can_query_database?: boolean
          column_filters?: Json | null
          denied_tables?: string[] | null
          employee_id?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          no_access_description?: string
          override_can_make_recommendations?: boolean | null
          override_can_proactively_surface_insights?: boolean | null
          persona_id?: string | null
          query_db_config?: Json
          row_scope?: Json | null
          show_widget_on_dashboard?: boolean | null
          updated_at?: string | null
          widget_greeting?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_access_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_access_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "agent_personas"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversations: {
        Row: {
          conversation_summary: string | null
          employee_id: string | null
          id: string
          is_archived: boolean | null
          last_active_at: string | null
          message_count: number | null
          persona_id: string | null
          started_at: string | null
          title: string | null
        }
        Insert: {
          conversation_summary?: string | null
          employee_id?: string | null
          id?: string
          is_archived?: boolean | null
          last_active_at?: string | null
          message_count?: number | null
          persona_id?: string | null
          started_at?: string | null
          title?: string | null
        }
        Update: {
          conversation_summary?: string | null
          employee_id?: string | null
          id?: string
          is_archived?: boolean | null
          last_active_at?: string | null
          message_count?: number | null
          persona_id?: string | null
          started_at?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "agent_personas"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          embedding: string | null
          id: string
          is_active: boolean
          source: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          is_active?: boolean
          source?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          is_active?: boolean
          source?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_memory: {
        Row: {
          confidence: number | null
          created_at: string | null
          embedding: string | null
          employee_id: string | null
          expires_at: string | null
          id: string
          key: string
          memory_type: string
          source: string | null
          value: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          embedding?: string | null
          employee_id?: string | null
          expires_at?: string | null
          id?: string
          key: string
          memory_type: string
          source?: string | null
          value: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          embedding?: string | null
          employee_id?: string | null
          expires_at?: string | null
          id?: string
          key?: string
          memory_type?: string
          source?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          data_sources_used: string[] | null
          employee_id: string | null
          id: string
          is_proactive: boolean | null
          model_used: string | null
          proactive_trigger: string | null
          role: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          data_sources_used?: string[] | null
          employee_id?: string | null
          id?: string
          is_proactive?: boolean | null
          model_used?: string | null
          proactive_trigger?: string | null
          role: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          data_sources_used?: string[] | null
          employee_id?: string | null
          id?: string
          is_proactive?: boolean | null
          model_used?: string | null
          proactive_trigger?: string | null
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_personas: {
        Row: {
          agent_name: string | null
          can_discuss_org_structure: boolean | null
          can_do_forecasting: boolean | null
          can_make_recommendations: boolean | null
          can_proactively_surface_insights: boolean | null
          can_suggest_contest_strategy: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          frequency_penalty: number | null
          id: string
          is_active: boolean | null
          language: string | null
          max_tokens: number | null
          model: string | null
          name: string
          output_format: string | null
          presence_penalty: number | null
          system_prompt_override: string | null
          temperature: number | null
          tone: string | null
          top_p: number | null
          updated_at: string | null
        }
        Insert: {
          agent_name?: string | null
          can_discuss_org_structure?: boolean | null
          can_do_forecasting?: boolean | null
          can_make_recommendations?: boolean | null
          can_proactively_surface_insights?: boolean | null
          can_suggest_contest_strategy?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          frequency_penalty?: number | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          max_tokens?: number | null
          model?: string | null
          name: string
          output_format?: string | null
          presence_penalty?: number | null
          system_prompt_override?: string | null
          temperature?: number | null
          tone?: string | null
          top_p?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_name?: string | null
          can_discuss_org_structure?: boolean | null
          can_do_forecasting?: boolean | null
          can_make_recommendations?: boolean | null
          can_proactively_surface_insights?: boolean | null
          can_suggest_contest_strategy?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          frequency_penalty?: number | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          max_tokens?: number | null
          model?: string | null
          name?: string
          output_format?: string | null
          presence_penalty?: number | null
          system_prompt_override?: string | null
          temperature?: number | null
          tone?: string | null
          top_p?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_personas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_sales_current_month: {
        Row: {
          "AIF+PMS+LAS+DYNAMO (TRAIL)": string | null
          "ALT Total": string | null
          ALTERNATE: string | null
          Arn: string | null
          BM: string | null
          Branch: string | null
          "COB (100%)": string | null
          "COB (50%)": string | null
          "MF Total (COB 100%)": string | null
          "MF Total (COB 50%)": string | null
          "MF+SIF+MSCI": string | null
          "Partner Name": string | null
          RGM: string | null
          RM: string | null
          "RM Emp ID": string | null
          "Total Net Sales (COB 100%)": string | null
          "Total Net Sales (COB 50%)": string | null
          ZM: string | null
          Zone: string | null
        }
        Insert: {
          "AIF+PMS+LAS+DYNAMO (TRAIL)"?: string | null
          "ALT Total"?: string | null
          ALTERNATE?: string | null
          Arn?: string | null
          BM?: string | null
          Branch?: string | null
          "COB (100%)"?: string | null
          "COB (50%)"?: string | null
          "MF Total (COB 100%)"?: string | null
          "MF Total (COB 50%)"?: string | null
          "MF+SIF+MSCI"?: string | null
          "Partner Name"?: string | null
          RGM?: string | null
          RM?: string | null
          "RM Emp ID"?: string | null
          "Total Net Sales (COB 100%)"?: string | null
          "Total Net Sales (COB 50%)"?: string | null
          ZM?: string | null
          Zone?: string | null
        }
        Update: {
          "AIF+PMS+LAS+DYNAMO (TRAIL)"?: string | null
          "ALT Total"?: string | null
          ALTERNATE?: string | null
          Arn?: string | null
          BM?: string | null
          Branch?: string | null
          "COB (100%)"?: string | null
          "COB (50%)"?: string | null
          "MF Total (COB 100%)"?: string | null
          "MF Total (COB 50%)"?: string | null
          "MF+SIF+MSCI"?: string | null
          "Partner Name"?: string | null
          RGM?: string | null
          RM?: string | null
          "RM Emp ID"?: string | null
          "Total Net Sales (COB 100%)"?: string | null
          "Total Net Sales (COB 50%)"?: string | null
          ZM?: string | null
          Zone?: string | null
        }
        Relationships: []
      }
      b2c: {
        Row: {
          advisor: string | null
          "assigned_aum_ao_31stmarch[cr.]": number | null
          assigned_leads: number | null
          "aum_growth_mtm %": number | null
          "current_aum_mtm [cr.]": number | null
          "fd_inflow_mtd[cr.]": string | null
          "fd_inflow_ytd[cr.]": number | null
          "gross_lumpsum_inflow_mtd[cr.]": number | null
          "gross_lumpsum_inflow_ytd[cr.]": number | null
          "msci_inflow_mtd[cr.]": string | null
          "msci_inflow_ytd[cr.]": string | null
          "net_inflow_mtd[cr]": number | null
          "net_inflow_ytd[cr]": number | null
          "new_sip_inflow_mtd[cr.]": number | null
          "new_sip_inflow_ytd[cr.]": number | null
          team: string | null
          "total_outflow_mtd[cr.]": number | null
          "total_outflow_ytd[cr.]": number | null
          "total_sip_book_ao_31stmarch[cr.]": number | null
          "total_sip_inflow_mtd[cr.]": number | null
          "total_sip_inflow_ytd[cr.]": number | null
          "ytd_net_aum_growth %": number | null
        }
        Insert: {
          advisor?: string | null
          "assigned_aum_ao_31stmarch[cr.]"?: number | null
          assigned_leads?: number | null
          "aum_growth_mtm %"?: number | null
          "current_aum_mtm [cr.]"?: number | null
          "fd_inflow_mtd[cr.]"?: string | null
          "fd_inflow_ytd[cr.]"?: number | null
          "gross_lumpsum_inflow_mtd[cr.]"?: number | null
          "gross_lumpsum_inflow_ytd[cr.]"?: number | null
          "msci_inflow_mtd[cr.]"?: string | null
          "msci_inflow_ytd[cr.]"?: string | null
          "net_inflow_mtd[cr]"?: number | null
          "net_inflow_ytd[cr]"?: number | null
          "new_sip_inflow_mtd[cr.]"?: number | null
          "new_sip_inflow_ytd[cr.]"?: number | null
          team?: string | null
          "total_outflow_mtd[cr.]"?: number | null
          "total_outflow_ytd[cr.]"?: number | null
          "total_sip_book_ao_31stmarch[cr.]"?: number | null
          "total_sip_inflow_mtd[cr.]"?: number | null
          "total_sip_inflow_ytd[cr.]"?: number | null
          "ytd_net_aum_growth %"?: number | null
        }
        Update: {
          advisor?: string | null
          "assigned_aum_ao_31stmarch[cr.]"?: number | null
          assigned_leads?: number | null
          "aum_growth_mtm %"?: number | null
          "current_aum_mtm [cr.]"?: number | null
          "fd_inflow_mtd[cr.]"?: string | null
          "fd_inflow_ytd[cr.]"?: number | null
          "gross_lumpsum_inflow_mtd[cr.]"?: number | null
          "gross_lumpsum_inflow_ytd[cr.]"?: number | null
          "msci_inflow_mtd[cr.]"?: string | null
          "msci_inflow_ytd[cr.]"?: string | null
          "net_inflow_mtd[cr]"?: number | null
          "net_inflow_ytd[cr]"?: number | null
          "new_sip_inflow_mtd[cr.]"?: number | null
          "new_sip_inflow_ytd[cr.]"?: number | null
          team?: string | null
          "total_outflow_mtd[cr.]"?: number | null
          "total_outflow_ytd[cr.]"?: number | null
          "total_sip_book_ao_31stmarch[cr.]"?: number | null
          "total_sip_inflow_mtd[cr.]"?: number | null
          "total_sip_inflow_ytd[cr.]"?: number | null
          "ytd_net_aum_growth %"?: number | null
        }
        Relationships: []
      }
      btb_sales_YTD_minus_current_month: {
        Row: {
          "ALT Total": string | null
          Arn: string | null
          BM: string | null
          Branch: string | null
          "COB (50%)": number | null
          "MF Total (COB 100%)": number | null
          "MF Total (COB 50%)": number | null
          "MF+SIF+MSCI": number | null
          "Partner Name": string | null
          RGM: string | null
          RM: string | null
          "RM Emp ID": string | null
          "SUM of AIF+PMS+LAS (TRAIL)": number | null
          "SUM of ALT": string | null
          "SUM of COB (100%)": number | null
          "Total Net Sales (COB 100%)": number | null
          "Total Net Sales (COB 50%)": number | null
          ZM: string | null
          Zone: string | null
        }
        Insert: {
          "ALT Total"?: string | null
          Arn?: string | null
          BM?: string | null
          Branch?: string | null
          "COB (50%)"?: number | null
          "MF Total (COB 100%)"?: number | null
          "MF Total (COB 50%)"?: number | null
          "MF+SIF+MSCI"?: number | null
          "Partner Name"?: string | null
          RGM?: string | null
          RM?: string | null
          "RM Emp ID"?: string | null
          "SUM of AIF+PMS+LAS (TRAIL)"?: number | null
          "SUM of ALT"?: string | null
          "SUM of COB (100%)"?: number | null
          "Total Net Sales (COB 100%)"?: number | null
          "Total Net Sales (COB 50%)"?: number | null
          ZM?: string | null
          Zone?: string | null
        }
        Update: {
          "ALT Total"?: string | null
          Arn?: string | null
          BM?: string | null
          Branch?: string | null
          "COB (50%)"?: number | null
          "MF Total (COB 100%)"?: number | null
          "MF Total (COB 50%)"?: number | null
          "MF+SIF+MSCI"?: number | null
          "Partner Name"?: string | null
          RGM?: string | null
          RM?: string | null
          "RM Emp ID"?: string | null
          "SUM of AIF+PMS+LAS (TRAIL)"?: number | null
          "SUM of ALT"?: string | null
          "SUM of COB (100%)"?: number | null
          "Total Net Sales (COB 100%)"?: number | null
          "Total Net Sales (COB 50%)"?: number | null
          ZM?: string | null
          Zone?: string | null
        }
        Relationships: []
      }
      contest_config: {
        Row: {
          business_units: string[] | null
          contest_name: string
          contest_period_end: string
          contest_period_start: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          ranking_parameter: string | null
          updated_at: string | null
        }
        Insert: {
          business_units?: string[] | null
          contest_name: string
          contest_period_end: string
          contest_period_start: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          ranking_parameter?: string | null
          updated_at?: string | null
        }
        Update: {
          business_units?: string[] | null
          contest_name?: string
          contest_period_end?: string
          contest_period_start?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          ranking_parameter?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contest_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          business_unit: string
          created_at: string | null
          date_joined: string | null
          department: string | null
          employee_number: string
          employment_status: string | null
          exit_date: string | null
          full_name: string
          gender: string | null
          id: string
          is_placeholder: boolean | null
          job_title: string | null
          location: string | null
          mobile_phone: string | null
          reporting_manager_emp_number: string | null
          secondary_job_title: string | null
          sub_department: string | null
          updated_at: string | null
          work_email: string
        }
        Insert: {
          business_unit: string
          created_at?: string | null
          date_joined?: string | null
          department?: string | null
          employee_number: string
          employment_status?: string | null
          exit_date?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_placeholder?: boolean | null
          job_title?: string | null
          location?: string | null
          mobile_phone?: string | null
          reporting_manager_emp_number?: string | null
          secondary_job_title?: string | null
          sub_department?: string | null
          updated_at?: string | null
          work_email: string
        }
        Update: {
          business_unit?: string
          created_at?: string | null
          date_joined?: string | null
          department?: string | null
          employee_number?: string
          employment_status?: string | null
          exit_date?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_placeholder?: boolean | null
          job_title?: string | null
          location?: string | null
          mobile_phone?: string | null
          reporting_manager_emp_number?: string | null
          secondary_job_title?: string | null
          sub_department?: string | null
          updated_at?: string | null
          work_email?: string
        }
        Relationships: []
      }
      gs_overall_aum: {
        Row: {
          aif: number | null
          bonds: number | null
          business_segment: string
          cob_cr: number | null
          eq_aum: number | null
          fixed_deposits: number | null
          id: string
          insurance: number | null
          lumpsum_cr: number | null
          mf_aum: number | null
          mf_aum_cr: number | null
          month: string
          monthly_net_sales: number | null
          mutual_funds: number | null
          net_cr: number | null
          other_products: number | null
          overall_aum: number | null
          overall_other_products: number | null
          overall_trail: number | null
          pms: number | null
          red_cr: number | null
          sif: number | null
          sipinflow_cr: number | null
          structured_product: number | null
          synced_at: string
          trail: number | null
          unlisted_shares: number | null
          upfront: number | null
        }
        Insert: {
          aif?: number | null
          bonds?: number | null
          business_segment: string
          cob_cr?: number | null
          eq_aum?: number | null
          fixed_deposits?: number | null
          id?: string
          insurance?: number | null
          lumpsum_cr?: number | null
          mf_aum?: number | null
          mf_aum_cr?: number | null
          month: string
          monthly_net_sales?: number | null
          mutual_funds?: number | null
          net_cr?: number | null
          other_products?: number | null
          overall_aum?: number | null
          overall_other_products?: number | null
          overall_trail?: number | null
          pms?: number | null
          red_cr?: number | null
          sif?: number | null
          sipinflow_cr?: number | null
          structured_product?: number | null
          synced_at?: string
          trail?: number | null
          unlisted_shares?: number | null
          upfront?: number | null
        }
        Update: {
          aif?: number | null
          bonds?: number | null
          business_segment?: string
          cob_cr?: number | null
          eq_aum?: number | null
          fixed_deposits?: number | null
          id?: string
          insurance?: number | null
          lumpsum_cr?: number | null
          mf_aum?: number | null
          mf_aum_cr?: number | null
          month?: string
          monthly_net_sales?: number | null
          mutual_funds?: number | null
          net_cr?: number | null
          other_products?: number | null
          overall_aum?: number | null
          overall_other_products?: number | null
          overall_trail?: number | null
          pms?: number | null
          red_cr?: number | null
          sif?: number | null
          sipinflow_cr?: number | null
          structured_product?: number | null
          synced_at?: string
          trail?: number | null
          unlisted_shares?: number | null
          upfront?: number | null
        }
        Relationships: []
      }
      gs_overall_sales: {
        Row: {
          accountholders_count: number | null
          arn_rm: string | null
          aum_amount: number | null
          business_segment: string | null
          cob_amount: number | null
          cob_out: number | null
          daywise: string | null
          firsttimeinvestors_count: number | null
          id: string
          lumpsuminflow_amount: number | null
          name: string | null
          redemption_amount: number | null
          reg_users_count: number | null
          sipinflow_amount: number | null
          switch_in_inflow: number | null
          switch_out_inflow: number | null
          synced_at: string
          team_region: string | null
          users_count: number | null
          zone: string | null
        }
        Insert: {
          accountholders_count?: number | null
          arn_rm?: string | null
          aum_amount?: number | null
          business_segment?: string | null
          cob_amount?: number | null
          cob_out?: number | null
          daywise?: string | null
          firsttimeinvestors_count?: number | null
          id?: string
          lumpsuminflow_amount?: number | null
          name?: string | null
          redemption_amount?: number | null
          reg_users_count?: number | null
          sipinflow_amount?: number | null
          switch_in_inflow?: number | null
          switch_out_inflow?: number | null
          synced_at?: string
          team_region?: string | null
          users_count?: number | null
          zone?: string | null
        }
        Update: {
          accountholders_count?: number | null
          arn_rm?: string | null
          aum_amount?: number | null
          business_segment?: string | null
          cob_amount?: number | null
          cob_out?: number | null
          daywise?: string | null
          firsttimeinvestors_count?: number | null
          id?: string
          lumpsuminflow_amount?: number | null
          name?: string | null
          redemption_amount?: number | null
          reg_users_count?: number | null
          sipinflow_amount?: number | null
          switch_in_inflow?: number | null
          switch_out_inflow?: number | null
          synced_at?: string
          team_region?: string | null
          users_count?: number | null
          zone?: string | null
        }
        Relationships: []
      }
      gs_sync_log: {
        Row: {
          error_msg: string | null
          id: string
          rows_synced: number
          rows_total: number
          sheet_tab: string
          status: string
          synced_at: string
        }
        Insert: {
          error_msg?: string | null
          id?: string
          rows_synced?: number
          rows_total?: number
          sheet_tab: string
          status?: string
          synced_at?: string
        }
        Update: {
          error_msg?: string | null
          id?: string
          rows_synced?: number
          rows_total?: number
          sheet_tab?: string
          status?: string
          synced_at?: string
        }
        Relationships: []
      }
      rankings: {
        Row: {
          achievement_pct: number | null
          achievement_value: number | null
          business_unit: string
          calculation_date: string
          created_at: string | null
          employee_id: string | null
          id: string
          parameter_name: string
          period_type: string
          rank_vertical: number
          shortfall: number | null
          target_value: number | null
        }
        Insert: {
          achievement_pct?: number | null
          achievement_value?: number | null
          business_unit: string
          calculation_date: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          parameter_name: string
          period_type: string
          rank_vertical: number
          shortfall?: number | null
          target_value?: number | null
        }
        Update: {
          achievement_pct?: number | null
          achievement_value?: number | null
          business_unit?: string
          calculation_date?: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          parameter_name?: string
          period_type?: string
          rank_vertical?: number
          shortfall?: number | null
          target_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rankings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_history: {
        Row: {
          created_at: string | null
          effective_from: string
          effective_to: string | null
          employee_id: string | null
          id: string
          reporting_manager_emp_number: string
        }
        Insert: {
          created_at?: string | null
          effective_from: string
          effective_to?: string | null
          employee_id?: string | null
          id?: string
          reporting_manager_emp_number: string
        }
        Update: {
          created_at?: string | null
          effective_from?: string
          effective_to?: string | null
          employee_id?: string | null
          id?: string
          reporting_manager_emp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporting_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_data: {
        Row: {
          aif_pms_las_trail: number | null
          alt_total: number | null
          alternate: number | null
          arn: string | null
          bm_name: string | null
          branch: string | null
          business_unit: string | null
          cob_100: number | null
          cob_50: number | null
          created_at: string | null
          data_date: string
          data_period: string
          employee_email: string | null
          employee_id: string | null
          employee_name: string | null
          id: string
          mf_sif_msci: number | null
          mf_total_cob_100: number | null
          mf_total_cob_50: number | null
          partner_name: string | null
          rgm_name: string | null
          rm_name: string | null
          total_net_sales_cob_100: number | null
          total_net_sales_cob_50: number | null
          updated_at: string | null
          zm_name: string | null
          zone: string | null
        }
        Insert: {
          aif_pms_las_trail?: number | null
          alt_total?: number | null
          alternate?: number | null
          arn?: string | null
          bm_name?: string | null
          branch?: string | null
          business_unit?: string | null
          cob_100?: number | null
          cob_50?: number | null
          created_at?: string | null
          data_date: string
          data_period: string
          employee_email?: string | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          mf_sif_msci?: number | null
          mf_total_cob_100?: number | null
          mf_total_cob_50?: number | null
          partner_name?: string | null
          rgm_name?: string | null
          rm_name?: string | null
          total_net_sales_cob_100?: number | null
          total_net_sales_cob_50?: number | null
          updated_at?: string | null
          zm_name?: string | null
          zone?: string | null
        }
        Update: {
          aif_pms_las_trail?: number | null
          alt_total?: number | null
          alternate?: number | null
          arn?: string | null
          bm_name?: string | null
          branch?: string | null
          business_unit?: string | null
          cob_100?: number | null
          cob_50?: number | null
          created_at?: string | null
          data_date?: string
          data_period?: string
          employee_email?: string | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          mf_sif_msci?: number | null
          mf_total_cob_100?: number | null
          mf_total_cob_50?: number | null
          partner_name?: string | null
          rgm_name?: string | null
          rm_name?: string | null
          total_net_sales_cob_100?: number | null
          total_net_sales_cob_50?: number | null
          updated_at?: string | null
          zm_name?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_data_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      targets: {
        Row: {
          business_unit: string
          created_at: string | null
          created_by: string | null
          employee_id: string | null
          id: string
          parameter_name: string
          period_end: string
          period_start: string
          target_type: string
          target_value: number
          updated_at: string | null
        }
        Insert: {
          business_unit: string
          created_at?: string | null
          created_by?: string | null
          employee_id?: string | null
          id?: string
          parameter_name: string
          period_end: string
          period_start: string
          target_type: string
          target_value: number
          updated_at?: string | null
        }
        Update: {
          business_unit?: string
          created_at?: string | null
          created_by?: string | null
          employee_id?: string | null
          id?: string
          parameter_name?: string
          period_end?: string
          period_start?: string
          target_type?: string
          target_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "targets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          employee_id: string | null
          id: string
          is_first_login: boolean | null
          last_login: string | null
          password_hash: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          employee_id?: string | null
          id?: string
          is_first_login?: boolean | null
          last_login?: string | null
          password_hash: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          employee_id?: string | null
          id?: string
          is_first_login?: boolean | null
          last_login?: string | null
          password_hash?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agent_access_view: {
        Row: {
          access_description: string | null
          allowed_tables: string[] | null
          can_query_database: boolean | null
          column_filters: Json | null
          denied_tables: string[] | null
          employee_id: string | null
          granted_at: string | null
          granted_by: string | null
          id: string | null
          is_active: boolean | null
          no_access_description: string | null
          override_can_make_recommendations: boolean | null
          override_can_proactively_surface_insights: boolean | null
          persona_id: string | null
          query_db_config: Json | null
          row_scope: Json | null
          show_widget_on_dashboard: boolean | null
          updated_at: string | null
          widget_greeting: string | null
        }
        Insert: {
          access_description?: string | null
          allowed_tables?: string[] | null
          can_query_database?: boolean | null
          column_filters?: Json | null
          denied_tables?: string[] | null
          employee_id?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string | null
          is_active?: boolean | null
          no_access_description?: string | null
          override_can_make_recommendations?: boolean | null
          override_can_proactively_surface_insights?: boolean | null
          persona_id?: string | null
          query_db_config?: Json | null
          row_scope?: Json | null
          show_widget_on_dashboard?: boolean | null
          updated_at?: string | null
          widget_greeting?: string | null
        }
        Update: {
          access_description?: string | null
          allowed_tables?: string[] | null
          can_query_database?: boolean | null
          column_filters?: Json | null
          denied_tables?: string[] | null
          employee_id?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string | null
          is_active?: boolean | null
          no_access_description?: string | null
          override_can_make_recommendations?: boolean | null
          override_can_proactively_surface_insights?: boolean | null
          persona_id?: string | null
          query_db_config?: Json | null
          row_scope?: Json | null
          show_widget_on_dashboard?: boolean | null
          updated_at?: string | null
          widget_greeting?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_access_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_access_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "agent_personas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      agent_execute_query: { Args: { query_sql: string }; Returns: Json }
      calculate_rankings: {
        Args: { p_business_unit?: string; p_period_type: string }
        Returns: number
      }
      get_agent_access_all: { Args: never; Returns: Json }
      get_agent_access_by_employee: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      get_employee_hierarchy: {
        Args: { emp_id: string }
        Returns: {
          business_unit: string
          employee_id: string
          employee_number: string
          full_name: string
          job_title: string
          level: number
          parent_id: string
        }[]
      }
      get_team_aggregate: {
        Args: { emp_id: string; p_period_type: string }
        Returns: {
          manager_contribution: number
          num_team_members: number
          team_contribution: number
          total_net_sales: number
        }[]
      }
      search_agent_memory: {
        Args: {
          p_employee_id: string
          p_limit?: number
          p_min_similarity?: number
          p_query_embedding: string
        }
        Returns: {
          key: string
          memory_type: string
          similarity: number
          value: string
        }[]
      }
      search_knowledge_base: {
        Args: {
          p_category?: string
          p_limit?: number
          p_min_similarity?: number
          p_query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          source: string
          title: string
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
