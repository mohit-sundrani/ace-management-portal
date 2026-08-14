export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.15";
    };
    public: {
        Tables: {
            budgets: {
                Row: {
                    category_id: string | null;
                    created_at: string;
                    end_date: string;
                    id: string;
                    name: string;
                    notes: string | null;
                    period: Database["public"]["Enums"]["budget_period"];
                    planned_amount: number;
                    start_date: string;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    category_id?: string | null;
                    created_at?: string;
                    end_date: string;
                    id?: string;
                    name: string;
                    notes?: string | null;
                    period?: Database["public"]["Enums"]["budget_period"];
                    planned_amount?: number;
                    start_date: string;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    category_id?: string | null;
                    created_at?: string;
                    end_date?: string;
                    id?: string;
                    name?: string;
                    notes?: string | null;
                    period?: Database["public"]["Enums"]["budget_period"];
                    planned_amount?: number;
                    start_date?: string;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "budgets_category_id_fkey";
                        columns: ["category_id"];
                        isOneToOne: false;
                        referencedRelation: "categories";
                        referencedColumns: ["id"];
                    },
                ];
            };
            calendar_items: {
                Row: {
                    all_day: boolean;
                    created_at: string;
                    description: string | null;
                    end_date: string | null;
                    end_time: string | null;
                    event_id: string | null;
                    id: string;
                    location: string | null;
                    notes: string | null;
                    reminder_at: string | null;
                    start_date: string;
                    start_time: string | null;
                    task_id: string | null;
                    title: string;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    all_day?: boolean;
                    created_at?: string;
                    description?: string | null;
                    end_date?: string | null;
                    end_time?: string | null;
                    event_id?: string | null;
                    id?: string;
                    location?: string | null;
                    notes?: string | null;
                    reminder_at?: string | null;
                    start_date: string;
                    start_time?: string | null;
                    task_id?: string | null;
                    title: string;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    all_day?: boolean;
                    created_at?: string;
                    description?: string | null;
                    end_date?: string | null;
                    end_time?: string | null;
                    event_id?: string | null;
                    id?: string;
                    location?: string | null;
                    notes?: string | null;
                    reminder_at?: string | null;
                    start_date?: string;
                    start_time?: string | null;
                    task_id?: string | null;
                    title?: string;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "calendar_items_event_id_fkey";
                        columns: ["event_id"];
                        isOneToOne: false;
                        referencedRelation: "events";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "calendar_items_task_id_fkey";
                        columns: ["task_id"];
                        isOneToOne: false;
                        referencedRelation: "tasks";
                        referencedColumns: ["id"];
                    },
                ];
            };
            categories: {
                Row: {
                    color: string;
                    created_at: string;
                    id: string;
                    is_archived: boolean;
                    kind: Database["public"]["Enums"]["txn_type"];
                    name: string;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    color?: string;
                    created_at?: string;
                    id?: string;
                    is_archived?: boolean;
                    kind: Database["public"]["Enums"]["txn_type"];
                    name: string;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    color?: string;
                    created_at?: string;
                    id?: string;
                    is_archived?: boolean;
                    kind?: Database["public"]["Enums"]["txn_type"];
                    name?: string;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            event_budget_items: {
                Row: {
                    category_id: string | null;
                    created_at: string;
                    event_id: string;
                    id: string;
                    kind: Database["public"]["Enums"]["txn_type"];
                    label: string;
                    notes: string | null;
                    planned_amount: number;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    category_id?: string | null;
                    created_at?: string;
                    event_id: string;
                    id?: string;
                    kind: Database["public"]["Enums"]["txn_type"];
                    label: string;
                    notes?: string | null;
                    planned_amount?: number;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    category_id?: string | null;
                    created_at?: string;
                    event_id?: string;
                    id?: string;
                    kind?: Database["public"]["Enums"]["txn_type"];
                    label?: string;
                    notes?: string | null;
                    planned_amount?: number;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "event_budget_items_category_id_fkey";
                        columns: ["category_id"];
                        isOneToOne: false;
                        referencedRelation: "categories";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "event_budget_items_event_id_fkey";
                        columns: ["event_id"];
                        isOneToOne: false;
                        referencedRelation: "events";
                        referencedColumns: ["id"];
                    },
                ];
            };
            event_guests: {
                Row: {
                    contact: string | null;
                    created_at: string;
                    event_id: string;
                    id: string;
                    name: string;
                    notes: string | null;
                    party_size: number;
                    rsvp: Database["public"]["Enums"]["rsvp_status"];
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    contact?: string | null;
                    created_at?: string;
                    event_id: string;
                    id?: string;
                    name: string;
                    notes?: string | null;
                    party_size?: number;
                    rsvp?: Database["public"]["Enums"]["rsvp_status"];
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    contact?: string | null;
                    created_at?: string;
                    event_id?: string;
                    id?: string;
                    name?: string;
                    notes?: string | null;
                    party_size?: number;
                    rsvp?: Database["public"]["Enums"]["rsvp_status"];
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "event_guests_event_id_fkey";
                        columns: ["event_id"];
                        isOneToOne: false;
                        referencedRelation: "events";
                        referencedColumns: ["id"];
                    },
                ];
            };
            event_payments: {
                Row: {
                    created_at: string;
                    direction: Database["public"]["Enums"]["txn_type"];
                    due_date: string | null;
                    event_id: string;
                    id: string;
                    label: string;
                    notes: string | null;
                    paid_amount: number;
                    paid_on: string | null;
                    planned_amount: number;
                    status: Database["public"]["Enums"]["payment_status"];
                    updated_at: string;
                    user_id: string;
                    vendor_id: string | null;
                };
                Insert: {
                    created_at?: string;
                    direction?: Database["public"]["Enums"]["txn_type"];
                    due_date?: string | null;
                    event_id: string;
                    id?: string;
                    label: string;
                    notes?: string | null;
                    paid_amount?: number;
                    paid_on?: string | null;
                    planned_amount?: number;
                    status?: Database["public"]["Enums"]["payment_status"];
                    updated_at?: string;
                    user_id: string;
                    vendor_id?: string | null;
                };
                Update: {
                    created_at?: string;
                    direction?: Database["public"]["Enums"]["txn_type"];
                    due_date?: string | null;
                    event_id?: string;
                    id?: string;
                    label?: string;
                    notes?: string | null;
                    paid_amount?: number;
                    paid_on?: string | null;
                    planned_amount?: number;
                    status?: Database["public"]["Enums"]["payment_status"];
                    updated_at?: string;
                    user_id?: string;
                    vendor_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "event_payments_event_id_fkey";
                        columns: ["event_id"];
                        isOneToOne: false;
                        referencedRelation: "events";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "event_payments_vendor_id_fkey";
                        columns: ["vendor_id"];
                        isOneToOne: false;
                        referencedRelation: "event_vendors";
                        referencedColumns: ["id"];
                    },
                ];
            };
            event_vendors: {
                Row: {
                    agreed_amount: number;
                    contact: string | null;
                    created_at: string;
                    event_id: string;
                    id: string;
                    name: string;
                    notes: string | null;
                    paid_amount: number;
                    remaining_amount: number;
                    service: string | null;
                    status: Database["public"]["Enums"]["payment_status"];
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    agreed_amount?: number;
                    contact?: string | null;
                    created_at?: string;
                    event_id: string;
                    id?: string;
                    name: string;
                    notes?: string | null;
                    paid_amount?: number;
                    remaining_amount?: number;
                    service?: string | null;
                    status?: Database["public"]["Enums"]["payment_status"];
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    agreed_amount?: number;
                    contact?: string | null;
                    created_at?: string;
                    event_id?: string;
                    id?: string;
                    name?: string;
                    notes?: string | null;
                    paid_amount?: number;
                    remaining_amount?: number;
                    service?: string | null;
                    status?: Database["public"]["Enums"]["payment_status"];
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "event_vendors_event_id_fkey";
                        columns: ["event_id"];
                        isOneToOne: false;
                        referencedRelation: "events";
                        referencedColumns: ["id"];
                    },
                ];
            };
            events: {
                Row: {
                    created_at: string;
                    description: string | null;
                    end_date: string | null;
                    id: string;
                    location: string | null;
                    name: string;
                    notes: string | null;
                    planned_budget: number;
                    start_date: string;
                    status: Database["public"]["Enums"]["event_status"];
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    description?: string | null;
                    end_date?: string | null;
                    id?: string;
                    location?: string | null;
                    name: string;
                    notes?: string | null;
                    planned_budget?: number;
                    start_date: string;
                    status?: Database["public"]["Enums"]["event_status"];
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    description?: string | null;
                    end_date?: string | null;
                    id?: string;
                    location?: string | null;
                    name?: string;
                    notes?: string | null;
                    planned_budget?: number;
                    start_date?: string;
                    status?: Database["public"]["Enums"]["event_status"];
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            financial_accounts: {
                Row: {
                    created_at: string;
                    currency: string;
                    description: string | null;
                    id: string;
                    is_active: boolean;
                    name: string;
                    opening_balance: number;
                    type: Database["public"]["Enums"]["account_type"];
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    currency?: string;
                    description?: string | null;
                    id?: string;
                    is_active?: boolean;
                    name: string;
                    opening_balance?: number;
                    type?: Database["public"]["Enums"]["account_type"];
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    currency?: string;
                    description?: string | null;
                    id?: string;
                    is_active?: boolean;
                    name?: string;
                    opening_balance?: number;
                    type?: Database["public"]["Enums"]["account_type"];
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            payment_methods: {
                Row: {
                    created_at: string;
                    id: string;
                    is_active: boolean;
                    name: string;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    id?: string;
                    is_active?: boolean;
                    name: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    is_active?: boolean;
                    name?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            profiles: {
                Row: {
                    avatar_url: string | null;
                    created_at: string;
                    currency: string;
                    display_name: string;
                    id: string;
                    updated_at: string;
                };
                Insert: {
                    avatar_url?: string | null;
                    created_at?: string;
                    currency?: string;
                    display_name?: string;
                    id: string;
                    updated_at?: string;
                };
                Update: {
                    avatar_url?: string | null;
                    created_at?: string;
                    currency?: string;
                    display_name?: string;
                    id?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            recurring_transactions: {
                Row: {
                    account_id: string | null;
                    amount: number;
                    category_id: string | null;
                    created_at: string;
                    end_on: string | null;
                    frequency: Database["public"]["Enums"]["recurrence"];
                    id: string;
                    interval_count: number;
                    is_active: boolean;
                    name: string;
                    next_run_on: string;
                    notes: string | null;
                    type: Database["public"]["Enums"]["txn_type"];
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    account_id?: string | null;
                    amount: number;
                    category_id?: string | null;
                    created_at?: string;
                    end_on?: string | null;
                    frequency?: Database["public"]["Enums"]["recurrence"];
                    id?: string;
                    interval_count?: number;
                    is_active?: boolean;
                    name: string;
                    next_run_on: string;
                    notes?: string | null;
                    type: Database["public"]["Enums"]["txn_type"];
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    account_id?: string | null;
                    amount?: number;
                    category_id?: string | null;
                    created_at?: string;
                    end_on?: string | null;
                    frequency?: Database["public"]["Enums"]["recurrence"];
                    id?: string;
                    interval_count?: number;
                    is_active?: boolean;
                    name?: string;
                    next_run_on?: string;
                    notes?: string | null;
                    type?: Database["public"]["Enums"]["txn_type"];
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "recurring_transactions_account_id_fkey";
                        columns: ["account_id"];
                        isOneToOne: false;
                        referencedRelation: "financial_accounts";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "recurring_transactions_category_id_fkey";
                        columns: ["category_id"];
                        isOneToOne: false;
                        referencedRelation: "categories";
                        referencedColumns: ["id"];
                    },
                ];
            };
            tasks: {
                Row: {
                    category: string | null;
                    completed_at: string | null;
                    created_at: string;
                    description: string | null;
                    due_date: string | null;
                    end_time: string | null;
                    event_id: string | null;
                    id: string;
                    notes: string | null;
                    priority: Database["public"]["Enums"]["task_priority"];
                    reminder_at: string | null;
                    scheduled_date: string | null;
                    start_time: string | null;
                    status: Database["public"]["Enums"]["task_status"];
                    title: string;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    category?: string | null;
                    completed_at?: string | null;
                    created_at?: string;
                    description?: string | null;
                    due_date?: string | null;
                    end_time?: string | null;
                    event_id?: string | null;
                    id?: string;
                    notes?: string | null;
                    priority?: Database["public"]["Enums"]["task_priority"];
                    reminder_at?: string | null;
                    scheduled_date?: string | null;
                    start_time?: string | null;
                    status?: Database["public"]["Enums"]["task_status"];
                    title: string;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    category?: string | null;
                    completed_at?: string | null;
                    created_at?: string;
                    description?: string | null;
                    due_date?: string | null;
                    end_time?: string | null;
                    event_id?: string | null;
                    id?: string;
                    notes?: string | null;
                    priority?: Database["public"]["Enums"]["task_priority"];
                    reminder_at?: string | null;
                    scheduled_date?: string | null;
                    start_time?: string | null;
                    status?: Database["public"]["Enums"]["task_status"];
                    title?: string;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "tasks_event_id_fkey";
                        columns: ["event_id"];
                        isOneToOne: false;
                        referencedRelation: "events";
                        referencedColumns: ["id"];
                    },
                ];
            };
            transactions: {
                Row: {
                    account_id: string | null;
                    amount: number;
                    category_id: string | null;
                    created_at: string;
                    description: string;
                    event_id: string | null;
                    id: string;
                    notes: string | null;
                    occurred_at: string | null;
                    occurred_on: string;
                    payment_method_id: string | null;
                    reference: string | null;
                    type: Database["public"]["Enums"]["txn_type"];
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    account_id?: string | null;
                    amount: number;
                    category_id?: string | null;
                    created_at?: string;
                    description?: string;
                    event_id?: string | null;
                    id?: string;
                    notes?: string | null;
                    occurred_at?: string | null;
                    occurred_on?: string;
                    payment_method_id?: string | null;
                    reference?: string | null;
                    type: Database["public"]["Enums"]["txn_type"];
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    account_id?: string | null;
                    amount?: number;
                    category_id?: string | null;
                    created_at?: string;
                    description?: string;
                    event_id?: string | null;
                    id?: string;
                    notes?: string | null;
                    occurred_at?: string | null;
                    occurred_on?: string;
                    payment_method_id?: string | null;
                    reference?: string | null;
                    type?: Database["public"]["Enums"]["txn_type"];
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "transactions_account_id_fkey";
                        columns: ["account_id"];
                        isOneToOne: false;
                        referencedRelation: "financial_accounts";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "transactions_category_id_fkey";
                        columns: ["category_id"];
                        isOneToOne: false;
                        referencedRelation: "categories";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "transactions_event_id_fkey";
                        columns: ["event_id"];
                        isOneToOne: false;
                        referencedRelation: "events";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "transactions_payment_method_id_fkey";
                        columns: ["payment_method_id"];
                        isOneToOne: false;
                        referencedRelation: "payment_methods";
                        referencedColumns: ["id"];
                    },
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            seed_workspace: { Args: { _uid: string }; Returns: undefined };
        };
        Enums: {
            account_type: "cash" | "bank" | "savings" | "wallet" | "credit_card" | "other";
            budget_period: "monthly" | "yearly" | "custom";
            event_status: "planning" | "active" | "completed" | "cancelled";
            payment_status: "unpaid" | "partial" | "paid";
            recurrence: "daily" | "weekly" | "monthly" | "yearly";
            rsvp_status: "invited" | "confirmed" | "declined" | "tentative" | "attended";
            task_priority: "low" | "medium" | "high";
            task_status: "todo" | "ongoing" | "complete";
            txn_type: "income" | "expense";
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
      ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
    EnumName extends (DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
        : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
      ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
        : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
      ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
      : never;

export const Constants = {
    public: {
        Enums: {
            account_type: ["cash", "bank", "savings", "wallet", "credit_card", "other"],
            budget_period: ["monthly", "yearly", "custom"],
            event_status: ["planning", "active", "completed", "cancelled"],
            payment_status: ["unpaid", "partial", "paid"],
            recurrence: ["daily", "weekly", "monthly", "yearly"],
            rsvp_status: ["invited", "confirmed", "declined", "tentative", "attended"],
            task_priority: ["low", "medium", "high"],
            task_status: ["todo", "ongoing", "complete"],
            txn_type: ["income", "expense"],
        },
    },
} as const;
