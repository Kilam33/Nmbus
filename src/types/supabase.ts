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
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          SKU: string | null
          description: string | null
          price: number
          quantity: number
          low_stock_threshold: number
          category_id: string
          supplier_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          SKU?: string | null
          description?: string | null
          price: number
          quantity: number
          low_stock_threshold: number
          category_id: string
          supplier_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          SKU?: string | null
          description?: string | null
          price?: number
          quantity?: number
          low_stock_threshold?: number
          category_id?: string
          supplier_id?: string
          created_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          address: string
          created_at: string
          status: 'active' | 'inactive' | 'on-hold' | 'new'
          reliability_score: number
          avg_lead_time: number
          last_order_date: string | null
          on_time_delivery_rate: number
          contact_person: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          address: string
          created_at?: string
          status?: 'active' | 'inactive' | 'on-hold' | 'new'
          reliability_score?: number
          avg_lead_time?: number
          last_order_date?: string | null
          on_time_delivery_rate?: number
          contact_person?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          address?: string
          created_at?: string
          status?: 'active' | 'inactive' | 'on-hold' | 'new'
          reliability_score?: number
          avg_lead_time?: number
          last_order_date?: string | null
          on_time_delivery_rate?: number
          contact_person?: string
        }
      }
      orders: {
        Row: {
          id: string
          supplier_id: string
          product_id: string
          quantity: number
          status: 'pending' | 'completed' | 'cancelled' | 'processing' | 'shipped'
          created_at: string
          updated_at: string | null
          order_number: string | null
          total: number | null
        }
        Insert: {
          id?: string
          supplier_id: string
          product_id: string
          quantity: number
          status?: 'pending' | 'completed' | 'cancelled' | 'processing' | 'shipped'
          created_at?: string
          updated_at?: string | null
          order_number?: string | null
          total?: number | null
        }
        Update: {
          id?: string
          supplier_id?: string
          product_id?: string
          quantity?: number
          status?: 'pending' | 'completed' | 'cancelled' | 'processing' | 'shipped'
          created_at?: string
          updated_at?: string | null
          order_number?: string | null
          total?: number | null
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