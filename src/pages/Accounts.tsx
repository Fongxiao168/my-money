import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { PaymentModal } from '../components/PaymentModal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { formatCurrency } from '../utils/format';
import { Plus, Trash2, Edit2, Wallet, CreditCard, Building2, Banknote, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AccountType, Account } from '../types';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { translations } from '../lib/i18n';

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['cash', 'bank', 'credit', 'investment', 'other']),
  balance: z.number().min(0, 'Balance must be positive'),
  color: z.string().min(1, 'Color is required'),
});

type AccountFormData = z.infer<typeof accountSchema>;

export const Accounts = () => {
  const { accounts, transactions, addAccount, deleteAccount, updateAccount, profile, language } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const validLanguage = (language && translations[language]) ? language : 'en';
  const t = translations[validLanguage].accounts;
  const tCommon = translations[validLanguage].dashboard; // Reusing common terms like Transaction History

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      type: 'bank',
      balance: 0,
      color: '#3b82f6'
    }
  });

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  const onSubmit = (data: AccountFormData) => {
    const action = editingId ? 'update' : 'create';
    
    setConfirmConfig({
      isOpen: true,
      title: `${action === 'create' ? t.createAccount : t.updateAccount}`,
      message: `Are you sure you want to ${action} this account?`, // This message could be translated too but keeping it simple for now or adding generic confirmation
      type: 'info',
      action: () => {
        if (editingId) {
          updateAccount(editingId, data);
          toast.success('Account updated successfully');
        } else {
          addAccount({
            id: crypto.randomUUID(),
            ...data
          });
          toast.success('Account created successfully');
        }
        handleClose();
      }
    });
  };

  const handleEdit = (account: any) => {
    if (!profile?.is_premium) {
      setIsPaymentModalOpen(true);
      return;
    }
    setEditingId(account.id);
    setValue('name', account.name);
    setValue('type', account.type);
    setValue('balance', account.balance);
    setValue('color', account.color);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!profile?.is_premium) {
      setIsPaymentModalOpen(true);
      return;
    }
    setConfirmConfig({
      isOpen: true,
      title: t.deleteAccount,
      message: t.deleteConfirmation,
      type: 'danger',
      action: () => {
        deleteAccount(id);
        toast.success('Account deleted');
      }
    });
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset();
  };

  const getIcon = (type: AccountType) => {
    switch (type) {
      case 'cash': return <Banknote className="w-6 h-6" />;
      case 'bank': return <Building2 className="w-6 h-6" />;
      case 'credit': return <CreditCard className="w-6 h-6" />;
      case 'investment': return <TrendingUp className="w-6 h-6" />; // Need to import TrendingUp
      default: return <Wallet className="w-6 h-6" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{t.title}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={() => {
            if (!profile?.is_premium) {
              setIsPaymentModalOpen(true);
              return;
            }
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/20 w-full md:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          {t.addAccount}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
              <Wallet className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t.noAccounts}</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
              {t.noAccountsDesc}
            </p>
            <button
              onClick={() => {
                if (!profile?.is_premium) {
                  setIsPaymentModalOpen(true);
                  return;
                }
                setIsModalOpen(true);
              }}
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              {t.createFirstAccount}
            </button>
          </div>
        ) : (
          accounts.map((account) => (
            <Card 
              key={account.id} 
              className="group relative overflow-hidden cursor-pointer"
              onClick={(e) => {
                // Prevent opening modal if clicking edit/delete buttons
                if ((e.target as HTMLElement).closest('button')) return;
                setSelectedAccount(account);
              }}
            >
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: account.color }} />
            <CardContent className="pt-6 pl-8">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {getIcon(account.type)}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(account); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(account.id); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{account.name}</h3>
              <p className="text-sm text-slate-500 capitalize mb-4">{account.type}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(account.balance)}</p>
            </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Account History Modal */}
      <Modal
        isOpen={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        title={selectedAccount?.name || tCommon.accountDetails}
      >
        {selectedAccount && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{tCommon.currentBalance}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(selectedAccount.balance)}</p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {getIcon(selectedAccount.type)}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">{tCommon.transactionHistory}</h4>
              <div className="space-y-3">
                {transactions
                  .filter(t => t.accountId === selectedAccount.id || t.toAccountId === selectedAccount.id)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          t.type === 'income' ? 'bg-emerald-100 text-emerald-600' :
                          t.type === 'expense' ? 'bg-rose-100 text-rose-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {t.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> :
                           t.type === 'expense' ? <ArrowDownRight className="w-4 h-4" /> :
                           <ArrowUpRight className="w-4 h-4 rotate-45" />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white text-sm">{t.description}</p>
                          <p className="text-xs text-slate-500">{format(parseISO(t.date), 'MMM dd, yyyy')}</p>
                        </div>
                      </div>
                      <span className={`font-bold text-sm ${
                        t.type === 'income' || (t.type === 'transfer' && t.toAccountId === selectedAccount.id) 
                          ? 'text-emerald-600' 
                          : 'text-rose-600'
                      }`}>
                        {t.type === 'income' || (t.type === 'transfer' && t.toAccountId === selectedAccount.id) ? '+' : '-'}
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                  {transactions.filter(t => t.accountId === selectedAccount.id || t.toAccountId === selectedAccount.id).length === 0 && (
                    <p className="text-center text-slate-500 py-4 text-sm">{tCommon.noTransactions}</p>
                  )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title={editingId ? t.updateAccount : t.createAccount}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.accountName}</label>
            <input
              {...register('name')}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g., Main Checking"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.accountType}</label>
            <select
              {...register('type')}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="cash">{t.cash}</option>
              <option value="bank">{t.bank}</option>
              <option value="credit">{t.credit}</option>
              <option value="investment">{t.investment}</option>
              <option value="other">{t.other}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.initialBalance}</label>
            <input
              type="number"
              step="0.01"
              {...register('balance', { valueAsNumber: true })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            {errors.balance && <p className="text-red-500 text-xs mt-1">{errors.balance.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.color}</label>
            <div className="flex gap-2 flex-wrap">
              {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                    watch('color') === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/20"
            >
              {editingId ? t.update : t.create}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.action}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />
    </div>
  );
};
