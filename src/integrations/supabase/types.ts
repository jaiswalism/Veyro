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
          due_date: string | null
          client: string
          services: Json | null
          advance: number | null
          user_id: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          client_id: number
          amount: number
          status: "paid" | "unpaid" | "overdue"
          date: string
          due_date?: string | null
          client: string
          services?: Json | null
          advance?: number | null
          user_id?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          client_id?: number
          amount?: number
          status?: "paid" | "unpaid" | "overdue"
          date?: string
          due_date?: string | null
          client?: string
          services?: Json | null
          advance?: number | null
          user_id?: string | null
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
          gst_registered: boolean | null
          logo_url: string | null
          theme_color: string | null
          display_logo: boolean | null 
        }
        Insert: {
          id?: number
          user_id: string
          company_name?: string | null
          phone?: string | null
          address?: string | null
          gst_number?: string | null
          gst_registered?: boolean | null
          logo_url?: string | null
          theme_color?: string | null
          display_logo?: boolean | null 
        }
        Update: {
          id?: number
          user_id?: string
          company_name?: string | null
          phone?: string | null
          address?: string | null
          gst_number?: string | null
          gst_registered?: boolean | null
          logo_url?: string | null
          theme_color?: string | null
          display_logo?: boolean | null 
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