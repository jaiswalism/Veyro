export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bills: {
        Row: {
          id: number
          created_at: string
          client_id: number
          amount: number
          status: "paid" | "unpaid" | "overdue"
          date: string
          client: string
          services: Json | null
          template_id: number | null
        }
        Insert: {
          id?: number
          created_at?: string
          client_id: number
          amount: number
          status: "paid" | "unpaid" | "overdue"
          date: string
          client: string
          services?: Json | null
          template_id?: number | null
        }
        Update: {
          id?: number
          created_at?: string
          client_id?: number
          amount?: number
          status?: "paid" | "unpaid" | "overdue"
          date?: string
          client?: string
          services?: Json | null
          template_id?: number | null
        }
      }
      clients: {
        Row: {
          id: number
          created_at: string
          name: string
          company: string | null
          contact: string | null
          email: string | null
          gst: string | null
          address: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          name: string
          company?: string | null
          contact?: string | null
          email?: string | null
          gst?: string | null
          address?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          name?: string
          company?: string | null
          contact?: string | null
          email?: string | null
          gst?: string | null
          address?: string | null
        }
      }
      payments: {
        Row: {
          id: number
          created_at: string
          bill_id: number
          amount: number
          payment_date: string
          payment_mode: string | null
          transaction_id: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          bill_id: number
          amount: number
          payment_date: string
          payment_mode?: string | null
          transaction_id?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          bill_id?: number
          amount?: number
          payment_date?: string
          payment_mode?: string | null
          transaction_id?: string | null
        }
      }
      profiles: {
        Row: {
          id: number
          user_id: string
          company_name: string | null
          phone: string | null
          address: string | null
          gst_number: string | null
        }
        Insert: {
          id?: number
          user_id: string
          company_name?: string | null
          phone?: string | null
          address?: string | null
          gst_number?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          company_name?: string | null
          phone?: string | null
          address?: string | null
          gst_number?: string | null
        }
      }
      bill_templates: {
        Row: {
          id: number
          name: string
          user_id: string | null
        }
        Insert: {
          id?: number
          name: string
          user_id?: string | null
        }
        Update: {
          id?: number
          name?: string
          user_id?: string | null
        }
      }
      template_fields: {
        Row: {
          id: number
          template_id: number
          field_name: string
          field_type: string
        }
        Insert: {
          id?: number
          template_id: number
          field_name: string
          field_type?: string
        }
        Update: {
          id?: number
          template_id?: number
          field_name?: string
          field_type?: string
        }
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