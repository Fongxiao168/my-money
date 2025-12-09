import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@supabase/supabase-js';
import type { Account, Transaction, Category, Settings, Profile } from '../types';
import { supabase } from '../lib/supabase';
import type { Language } from '../lib/i18n';

interface StoreState {
  user: User | null;
  profile: Profile | null;
  paymentRequest: PaymentRequest | null;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  settings: Settings;
  isLoading: boolean;
  language: Language;
  
  setUser: (user: User | null) => void;
  setLanguage: (language: Language) => void;
  fetchData: () => Promise<void>;
  
  addAccount: (account: Account) => Promise<void>;
  updateAccount: (id: string, account: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (id: string, transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  setSettings: (settings: Partial<Settings>) => void;
  resetData: () => void;
}

const defaultCategories: Category[] = [
  { id: '1', name: 'Food & Dining', type: 'expense', color: '#ef4444' },
  { id: '2', name: 'Transportation', type: 'expense', color: '#f97316' },
  { id: '3', name: 'Shopping', type: 'expense', color: '#8b5cf6' },
  { id: '4', name: 'Entertainment', type: 'expense', color: '#ec4899' },
  { id: '5', name: 'Bills & Utilities', type: 'expense', color: '#3b82f6' },
  { id: '6', name: 'Salary', type: 'income', color: '#10b981' },
  { id: '7', name: 'Freelance', type: 'income', color: '#06b6d4' },
  { id: '8', name: 'Investment', type: 'income', color: '#84cc16' },
];

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      paymentRequest: null,
      accounts: [],
      transactions: [],
      categories: defaultCategories,
      settings: {
        currency: 'USD',
        theme: 'dark',
        notifications: true,
      },
      isLoading: false,
      language: 'en',

      setUser: (user) => set({ user }),
      setLanguage: (language) => set({ language }),
      
      fetchData: async () => {
        set({ isLoading: true });
        
        const { user } = get();
        
        // Only fetch if Supabase is configured and user is logged in
        if (!import.meta.env.VITE_SUPABASE_URL || !user) {
          set({ isLoading: false });
          return;
        }

        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profile) set({ profile: profile as any });

        // Fetch latest payment request
        const { data: paymentRequests } = await supabase
          .from('payment_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (paymentRequests && paymentRequests.length > 0) {
            set({ paymentRequest: paymentRequests[0] as any });
        } else {
            set({ paymentRequest: null });
        }

        const { data: accounts } = await supabase.from('accounts').select('*');
        const { data: accounts } = await supabase.from('accounts').select('*');
        const { data: transactions } = await supabase.from('transactions').select('*');
        const { data: categories } = await supabase.from('categories').select('*');

        if (accounts) set({ accounts: accounts as any });
        if (transactions) {
          set({
            transactions: transactions.map((t) => ({
              ...t,
              accountId: t.account_id,
              toAccountId: t.to_account_id,
            })) as any,
          });
        }
        if (categories && categories.length > 0) set({ categories: categories as any });
        
        set({ isLoading: false });
      },

      addAccount: async (account) => {
        const { user } = get();
        if (import.meta.env.VITE_SUPABASE_URL && user) {
          // Remove fields that don't exist in the database
          const { icon, ...dbAccount } = account;
          await supabase.from('accounts').insert({ ...dbAccount, user_id: user.id });
        }
        set((state) => ({ accounts: [...state.accounts, account] }));
      },
      
      updateAccount: async (id, updatedAccount) => {
        if (import.meta.env.VITE_SUPABASE_URL) {
          // Remove fields that don't exist in the database
          const { icon, ...dbAccount } = updatedAccount;
          await supabase.from('accounts').update(dbAccount).eq('id', id);
        }
        set((state) => ({
          accounts: state.accounts.map((acc) => (acc.id === id ? { ...acc, ...updatedAccount } : acc)),
        }));
      },
      
      deleteAccount: async (id) => {
        if (import.meta.env.VITE_SUPABASE_URL) {
          await supabase.from('accounts').delete().eq('id', id);
        }
        set((state) => ({
          accounts: state.accounts.filter((acc) => acc.id !== id),
          transactions: state.transactions.filter((t) => t.accountId !== id && t.toAccountId !== id),
        }));
      },

      addTransaction: async (transaction) => {
        const { user } = get();
        if (import.meta.env.VITE_SUPABASE_URL && user) {
          // Prepare transaction for database (map camelCase to snake_case and remove extra fields)
          const { accountId, toAccountId, ...rest } = transaction;
          
          await supabase.from('transactions').insert({
            ...rest,
            account_id: accountId,
            to_account_id: toAccountId,
            user_id: user.id
          });
        }

        set((state) => {
          const accounts = [...state.accounts];
          const { accountId, toAccountId, amount, type } = transaction;

          const accountIndex = accounts.findIndex((a) => a.id === accountId);
          if (accountIndex === -1) return state;

          if (type === 'income') {
            accounts[accountIndex].balance += amount;
          } else if (type === 'expense') {
            accounts[accountIndex].balance -= amount;
          } else if (type === 'transfer' && toAccountId) {
            accounts[accountIndex].balance -= amount;
            const toAccountIndex = accounts.findIndex((a) => a.id === toAccountId);
            if (toAccountIndex !== -1) {
              accounts[toAccountIndex].balance += amount;
            }
          }
          
          // Sync balance updates to Supabase
          if (import.meta.env.VITE_SUPABASE_URL) {
             supabase.from('accounts').update({ balance: accounts[accountIndex].balance }).eq('id', accountId);
             if (toAccountId) {
               const toAccount = accounts.find(a => a.id === toAccountId);
               if (toAccount) {
                 supabase.from('accounts').update({ balance: toAccount.balance }).eq('id', toAccountId);
               }
             }
          }

          return {
            accounts,
            transactions: [transaction, ...state.transactions],
          };
        });
      },

      updateTransaction: async (id, updatedTransaction) => {
        if (import.meta.env.VITE_SUPABASE_URL) {
           // Prepare transaction for database
           const { accountId, toAccountId, ...rest } = updatedTransaction;
           
           await supabase.from('transactions').update({
             ...rest,
             account_id: accountId,
             to_account_id: toAccountId
           }).eq('id', id);
        }

        set((state) => {
          const oldTransaction = state.transactions.find((t) => t.id === id);
          if (!oldTransaction) return state;

          let accounts = [...state.accounts];
          
          // Revert logic
          {
            const { accountId, toAccountId, amount, type } = oldTransaction;
            const accountIndex = accounts.findIndex((a) => a.id === accountId);
            if (accountIndex !== -1) {
              if (type === 'income') accounts[accountIndex].balance -= amount;
              else if (type === 'expense') accounts[accountIndex].balance += amount;
              else if (type === 'transfer' && toAccountId) {
                accounts[accountIndex].balance += amount;
                const toAccountIndex = accounts.findIndex((a) => a.id === toAccountId);
                if (toAccountIndex !== -1) accounts[toAccountIndex].balance -= amount;
              }
            }
          }

          // Apply new transaction logic
          {
            const { accountId, toAccountId, amount, type } = updatedTransaction;
            const accountIndex = accounts.findIndex((a) => a.id === accountId);
            if (accountIndex !== -1) {
              if (type === 'income') accounts[accountIndex].balance += amount;
              else if (type === 'expense') accounts[accountIndex].balance -= amount;
              else if (type === 'transfer' && toAccountId) {
                accounts[accountIndex].balance -= amount;
                const toAccountIndex = accounts.findIndex((a) => a.id === toAccountId);
                if (toAccountIndex !== -1) accounts[toAccountIndex].balance += amount;
              }
            }
          }

          return {
            accounts,
            transactions: state.transactions.map((t) => (t.id === id ? updatedTransaction : t)),
          };
        });
      },

      deleteTransaction: async (id) => {
        if (import.meta.env.VITE_SUPABASE_URL) {
          await supabase.from('transactions').delete().eq('id', id);
        }

        set((state) => {
          const transaction = state.transactions.find((t) => t.id === id);
          if (!transaction) return state;

          const accounts = [...state.accounts];
          const { accountId, toAccountId, amount, type } = transaction;
          const accountIndex = accounts.findIndex((a) => a.id === accountId);

          if (accountIndex !== -1) {
            if (type === 'income') accounts[accountIndex].balance -= amount;
            else if (type === 'expense') accounts[accountIndex].balance += amount;
            else if (type === 'transfer' && toAccountId) {
              accounts[accountIndex].balance += amount;
              const toAccountIndex = accounts.findIndex((a) => a.id === toAccountId);
              if (toAccountIndex !== -1) accounts[toAccountIndex].balance -= amount;
            }
          }

          return {
            accounts,
            transactions: state.transactions.filter((t) => t.id !== id),
          };
        });
      },

      addCategory: async (category) => {
        const { user } = get();
        if (import.meta.env.VITE_SUPABASE_URL && user) {
          // Remove fields that don't exist in the database
          const { budget, ...dbCategory } = category;
          await supabase.from('categories').insert({ ...dbCategory, user_id: user.id });
        }
        set((state) => ({ categories: [...state.categories, category] }));
      },
      
      updateCategory: async (id, updatedCategory) => {
        if (import.meta.env.VITE_SUPABASE_URL) {
          // Remove fields that don't exist in the database
          const { budget, ...dbCategory } = updatedCategory;
          await supabase.from('categories').update(dbCategory).eq('id', id);
        }
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...updatedCategory } : c)),
        }));
      },
      
      deleteCategory: async (id) => {
        if (import.meta.env.VITE_SUPABASE_URL) {
          await supabase.from('categories').delete().eq('id', id);
        }
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
      },

      setSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
      
      resetData: () => set({ 
        accounts: [], 
        transactions: [], 
        categories: defaultCategories 
      }),
    }),
    {
      name: 'moneyflow-storage-v5',
    }
  )
);
