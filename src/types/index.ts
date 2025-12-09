export type AccountType = 'cash' | 'bank' | 'credit' | 'investment' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  icon?: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  date: string; // ISO string
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  accountId: string; // Source account for expense/transfer, Destination for income
  toAccountId?: string; // Destination account for transfer
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  budget?: number;
}

export interface Settings {
  currency: string;
  theme: 'dark' | 'light' | 'system';
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role: 'user' | 'admin';
  status?: 'active' | 'banned';
  is_premium?: boolean;
  created_at: string;
}

export interface PaymentRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  receipt_url: string;
  created_at: string;
  profiles?: Profile; // For joining in admin view
}

export interface ChatSession {
  id: string;
  user_id: string;
  status: 'active' | 'ended';
  created_at: string;
  updated_at: string;
  profiles?: Profile; // For admin view to show user details
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string;
  content: string;
  is_admin: boolean;
  created_at: string;
}

export interface ChatSettings {
  id: number;
  welcome_message: string;
  is_enabled: boolean;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'alert';
  is_active: boolean;
  created_by: string;
  created_at: string;
  expires_at?: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_resource: string;
  target_id?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
}

export interface SystemSetting {
  key: string;
  value: any;
  description?: string;
  updated_at: string;
  updated_by?: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  profiles?: Profile;
}
