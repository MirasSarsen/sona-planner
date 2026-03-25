export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      mood_entries: {
        Row: {
          id: string
          user_id: string
          date: string
          mood: number
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          mood: number
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          mood?: number
          created_at?: string | null
        }
        Relationships: []
      }
      custom_metrics: {
        Row: {
          id: string
          user_id: string
          name: string
          value: number
          unit: string
          color: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          value?: number
          unit?: string
          color?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          value?: number
          unit?: string
          color?: string
          created_at?: string | null
        }
        Relationships: []
      }
      kanban_tasks: {
        Row: {
          assignee: string | null
          created_at: string | null
          description: string | null
          id: string
          position: number
          status: string
          title: string
          user_id: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          position?: number
          status?: string
          title: string
          user_id: string
        }
        Update: {
          assignee?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          position?: number
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          title: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends T extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[T["schema"]]["Tables"] & DatabaseWithoutInternals[T["schema"]]["Views"])
    : never = never
> = T extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[T["schema"]]["Tables"] & DatabaseWithoutInternals[T["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R }
    ? R
    : never
  : never

export type TablesInsert<
  T extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends T extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[T["schema"]]["Tables"]
    : never = never
> = T extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[T["schema"]]["Tables"][TableName] extends { Insert: infer I }
    ? I
    : never
  : T extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][T] extends { Insert: infer I }
    ? I
    : never
  : never

export type TablesUpdate<
  T extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends T extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[T["schema"]]["Tables"]
    : never = never
> = T extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[T["schema"]]["Tables"][TableName] extends { Update: infer U }
    ? U
    : never
  : T extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][T] extends { Update: infer U }
    ? U
    : never
  : never

export type Enums<
  T extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends T extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[T["schema"]]["Enums"]
    : never = never
> = T extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[T["schema"]]["Enums"][EnumName]
  : T extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][T]
  : never

export type CompositeTypes<
  T extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends T extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[T["schema"]]["CompositeTypes"]
    : never = never
> = T extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[T["schema"]]["CompositeTypes"][CompositeTypeName]
  : T extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][T]
  : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
