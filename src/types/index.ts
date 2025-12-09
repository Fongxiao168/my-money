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
