import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { PaymentModal } from '../components/PaymentModal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { formatCurrency, formatDate } from '../utils/format';
import { Plus, Search, Filter, ArrowUpRight, ArrowDownRight, ArrowRightLeft, Trash2, Edit2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TransactionType } from '../types';
import { toast } from 'sonner';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { cn } from '../lib/utils';
import { translations } from '../lib/i18n';

const transactionSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0.01, 'Amount must be positive'),
  type: z.enum(['income', 'expense', 'transfer']),
  category: z.string().min(1, 'Category is required'),
  accountId: z.string().min(1, 'Account is required'),
  toAccountId: z.string().optional(),
  date: z.string(),
}).refine((data) => {
  if (data.type === 'transfer' && !data.toAccountId) return false;
  if (data.type === 'transfer' && data.accountId === data.toAccountId) return false;
  return true;
}, {
  message: "Transfer requires a different destination account",
  path: ["toAccountId"],
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export const Transactions = () => {
  const { transactions, accounts, categories, addTransaction, updateTransaction, deleteTransaction, profile, language } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const validLanguage = (language && translations[language]) ? language : 'en';
  const t = translations[validLanguage].transactions;
  const tCommon = translations[validLanguage].dashboard; // Reusing common terms
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
  
  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterAccount !== 'all' && t.accountId !== filterAccount && t.toAccountId !== filterAccount) return false;
      return true;
    });
  }, [transactions, filterType, filterCategory, filterAccount]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      category: 'Food & Dining'
    }
  });

  const selectedType = watch('type');

  const onSubmit = (data: TransactionFormData) => {
    // Check for sufficient funds
    if (data.type === 'expense' || data.type === 'transfer') {
      const account = accounts.find(a => a.id === data.accountId);
      if (account) {
        let availableBalance = account.balance;

        if (editingId) {
          const originalTransaction = transactions.find(t => t.id === editingId);
          // If we are editing and the account is the same, we need to add back the original amount
          // to calculate the true available balance before this transaction.
          if (originalTransaction && originalTransaction.accountId === data.accountId) {
             if (originalTransaction.type === 'expense' || originalTransaction.type === 'transfer') {
               availableBalance += originalTransaction.amount;
             } else if (originalTransaction.type === 'income') {
               // If it was income, removing it would decrease balance
               availableBalance -= originalTransaction.amount;
             }
          }
        }

        if (data.amount > availableBalance) {
          toast.error('Insufficient funds in the selected account');
          return;
        }
      }
    }

    const action = editingId ? 'update' : 'add';
    
    setConfirmConfig({
      isOpen: true,
      title: `${action === 'add' ? 'Add' : 'Update'} Transaction`,
      message: `Are you sure you want to ${action} this transaction?`,
      type: 'info',
      action: () => {
        if (editingId) {
          updateTransaction(editingId, { id: editingId, ...data });
          toast.success('Transaction updated');
        } else {
          addTransaction({
            id: crypto.randomUUID(),
            ...data
          });
          toast.success('Transaction added');
        }
        handleClose();
      }
    });
  };
  const handleEdit = (transaction: any) => {
    if (!profile?.is_premium) {
      setIsPaymentModalOpen(true);
      return;
    }
    setEditingId(transaction.id);
    setValue('description', transaction.description);
    setValue('amount', transaction.amount);
    setValue('type', transaction.type);
    setValue('category', transaction.category);
    setValue('accountId', transaction.accountId);
    if (transaction.toAccountId) {
      setValue('toAccountId', transaction.toAccountId);
    }
    setValue('date', transaction.date);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!profile?.is_premium) {
      setIsPaymentModalOpen(true);
      return;
    }
    setConfirmConfig({
      isOpen: true,
      title: t.deleteTransaction,
      message: t.deleteConfirmation,
      type: 'danger',
      action: () => {
        deleteTransaction(id);
        toast.success('Transaction deleted');
      }
    });
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset();
  };

  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(() => [
    columnHelper.accessor('date', {
      header: t.date,
      cell: info => formatDate(info.getValue()),
    }),
    columnHelper.accessor('description', {
      header: t.description,
      cell: info => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 dark:text-white">{info.getValue()}</span>
          <span className="text-xs text-slate-500">{info.row.original.category}</span>
        </div>
      ),
    }),
    columnHelper.accessor('accountId', {
      header: t.account,
      cell: info => {
        const account = accounts.find(a => a.id === info.getValue());
        const toAccount = accounts.find(a => a.id === info.row.original.toAccountId);
        
        if (info.row.original.type === 'transfer' && toAccount) {
          return (
            <div className="flex items-center gap-1 text-sm">
              <span>{account?.name}</span>
              <ArrowRightLeft className="w-3 h-3 text-slate-400" />
              <span>{toAccount.name}</span>
            </div>
          );
        }
        return account?.name;
      },
    }),
    columnHelper.accessor('amount', {
      header: t.amount,
      cell: info => {
        const type = info.row.original.type;
        const color = type === 'income' ? 'text-emerald-600' : type === 'expense' ? 'text-rose-600' : 'text-slate-600';
        const prefix = type === 'income' ? '+' : type === 'expense' ? '-' : '';
        return (
          <span className={`font-bold ${color}`}>
            {prefix}{formatCurrency(info.getValue())}
          </span>
        );
      },
    }),
    columnHelper.accessor('type', {
      header: t.type,
      cell: info => (
        <span className={cn(
          "px-2 py-1 rounded-full text-xs font-medium capitalize",
          info.getValue() === 'income' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
          info.getValue() === 'expense' ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
        )}>
          {info.getValue() === 'income' ? t.income : info.getValue() === 'expense' ? t.expense : t.transfer}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      cell: info => (
        <div className="flex gap-2 justify-end">
          <button onClick={() => handleEdit(info.row.original)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(info.row.original.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    }),
  ], [accounts]);

  const table = useReactTable({
    data: filteredTransactions,
    columns,
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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
          {t.addTransaction}
        </button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={globalFilter ?? ''}
                onChange={e => setGlobalFilter(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                "p-2 border rounded-xl transition-colors",
                isFilterOpen 
                  ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400" 
                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
              )}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {isFilterOpen && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Type</label>
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Category</label>
                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Account</label>
                <select 
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">All Accounts</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-slate-200 dark:border-slate-800">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="p-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="p-8 text-center text-slate-500">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="p-4 text-sm text-slate-700 dark:text-slate-300">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {table.getRowModel().rows.length === 0 ? (
               <div className="text-center p-8 text-slate-500">No transactions found.</div>
            ) : (
               table.getRowModel().rows.map(row => {
                 const transaction = row.original;
                 const account = accounts.find(a => a.id === transaction.accountId);
                 const toAccount = accounts.find(a => a.id === transaction.toAccountId);
                 const isTransfer = transaction.type === 'transfer';
                 
                 return (
                   <div key={row.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                     <div className="flex justify-between items-start">
                       <div>
                         <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{formatDate(transaction.date)}</div>
                         <div className="font-medium text-slate-900 dark:text-white">{transaction.description}</div>
                         <div className="text-xs text-slate-500 mt-0.5">{transaction.category}</div>
                       </div>
                       <div className="text-right">
                         <div className={cn(
                           "font-bold",
                           transaction.type === 'income' ? "text-emerald-600" : 
                           transaction.type === 'expense' ? "text-rose-600" : "text-slate-600"
                         )}>
                           {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                           {formatCurrency(transaction.amount)}
                         </div>
                         <span className={cn(
                            "inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize",
                            transaction.type === 'income' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                            transaction.type === 'expense' ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          )}>
                            {transaction.type}
                          </span>
                       </div>
                     </div>
                     
                     <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                       <div className="text-xs text-slate-500">
                         {isTransfer && toAccount ? (
                           <div className="flex items-center gap-1">
                             <span>{account?.name}</span>
                             <ArrowRightLeft className="w-3 h-3" />
                             <span>{toAccount.name}</span>
                           </div>
                         ) : (
                           <span>{account?.name}</span>
                         )}
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => handleEdit(transaction)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(transaction.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                     </div>
                   </div>
                 );
               })
            )}
          </div>

          <div className="flex items-center justify-between mt-4 px-4">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-4 py-2 text-sm font-medium text-slate-600 disabled:opacity-50 hover:bg-slate-100 rounded-lg"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-4 py-2 text-sm font-medium text-slate-600 disabled:opacity-50 hover:bg-slate-100 rounded-lg"
            >
              Next
            </button>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title={editingId ? t.editTransaction : t.addTransaction}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {['expense', 'income', 'transfer'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setValue('type', type as any)}
                className={cn(
                  "py-2 text-xs sm:text-sm font-medium rounded-lg capitalize transition-all",
                  selectedType === type
                    ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {t[type as keyof typeof t]}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.amount}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.description}</label>
            <input
              {...register('description')}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder={t.whatIsThisFor}
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.date}</label>
              <input
                type="date"
                {...register('date')}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.category}</label>
              <select
                {...register('category')}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                disabled={selectedType === 'transfer'}
              >
                {selectedType === 'transfer' ? (
                  <option value="Transfer">{t.transfer}</option>
                ) : (
                  categories
                    .filter(c => c.type === selectedType)
                    .map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                )}
              </select>
            </div>
          </div>

          {selectedType === 'transfer' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.fromAccount}</label>
                <select
                  {...register('accountId')}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">{t.selectAccount}</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                </select>
                {errors.accountId && <p className="text-red-500 text-xs mt-1">{errors.accountId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.toAccount}</label>
                <select
                  {...register('toAccountId')}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">{t.selectDestinationAccount}</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                </select>
                {errors.toAccountId && <p className="text-red-500 text-xs mt-1">{errors.toAccountId.message}</p>}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.account}</label>
              <select
                {...register('accountId')}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">{t.selectAccount}</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
              </select>
              {errors.accountId && <p className="text-red-500 text-xs mt-1">{errors.accountId.message}</p>}
            </div>
          )}

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
              {editingId ? t.saveChanges : t.addTransaction}
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
