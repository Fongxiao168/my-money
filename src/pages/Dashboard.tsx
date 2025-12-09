import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import type { Account, PaymentRequest } from '../types';
import { supabase } from '../lib/supabase';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight, Landmark, CreditCard, Banknote, Clock, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, addMonths, parseISO } from 'date-fns';
import { translations } from '../lib/i18n';

export const Dashboard = () => {
  const { accounts, transactions, categories, profile, language } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  
  const validLanguage = (language && translations[language]) ? language : 'en';
  const t = translations[validLanguage].dashboard;

  const [transactionModal, setTransactionModal] = useState<{ isOpen: boolean; type: 'income' | 'expense' | null }>({
    isOpen: false,
    type: null
  });
  const [paymentStatus, setPaymentStatus] = useState<PaymentRequest | null>(null);

  useEffect(() => {
    async function checkPaymentStatus() {
      if (!profile?.id) return;
      
      const { data } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        setPaymentStatus(data);
      }
    }
    checkPaymentStatus();
  }, [profile?.id]);

  // Calculate Total Net Worth
  const totalNetWorth = accounts.reduce((acc, curr) => acc + curr.balance, 0);

  // Calculate Monthly Stats
  const currentMonthStart = startOfMonth(currentDate);
  const currentMonthEnd = endOfMonth(currentDate);

  const monthlyTransactions = transactions.filter(t => 
    isWithinInterval(parseISO(t.date), { start: currentMonthStart, end: currentMonthEnd })
  );

  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const monthlyExpense = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const monthlySavings = monthlyIncome - monthlyExpense;

  const modalTransactions = useMemo(() => {
    if (!transactionModal.type) return [];
    return monthlyTransactions
      .filter(t => t.type === transactionModal.type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [monthlyTransactions, transactionModal.type]);

  // Chart Data: Income vs Expense (Last 6 Months)
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(currentDate, i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthName = format(date, 'MMM');

      const monthTrans = transactions.filter(t => 
        isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
      );

      const inc = monthTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const exp = monthTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

      data.push({ name: monthName, income: inc, expense: exp });
    }
    return data;
  }, [transactions, currentDate]);

  // Chart Data: Spending by Category (This Month)
  const categoryData = useMemo(() => {
    const expenseTrans = monthlyTransactions.filter(t => t.type === 'expense');
    const catMap = new Map<string, number>();

    expenseTrans.forEach(t => {
      const current = catMap.get(t.category) || 0;
      catMap.set(t.category, current + t.amount);
    });

    return Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));
  }, [monthlyTransactions]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="bg-blue-100 dark:bg-blue-900/20 p-6 rounded-full">
          <Wallet className="w-16 h-16 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{t.welcomeTitle}</h2>
          <p className="text-slate-500 dark:text-slate-400">
            {t.welcomeSubtitle}
          </p>
        </div>
        <a 
          href="/accounts" 
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/20"
        >
          <ArrowUpRight className="w-5 h-5" />
          {t.goToAccounts}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Payment Status Banner */}
      {paymentStatus && paymentStatus.status !== 'approved' && (
        <div className={`p-4 rounded-xl border ${
          paymentStatus.status === 'pending' 
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200'
            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {paymentStatus.status === 'pending' ? (
              <Clock className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <div>
              <p className="font-medium">
                {paymentStatus.status === 'pending' 
                  ? t.premiumPending 
                  : t.premiumRejected}
              </p>
              <p className="text-sm opacity-90">
                {paymentStatus.status === 'pending'
                  ? t.premiumPendingDesc
                  : t.premiumRejectedDesc}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{t.dashboardTitle}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t.dashboardSubtitle}</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-full md:w-auto">
          <button 
            onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 w-full md:w-auto text-center min-w-[140px]">
            {format(currentDate, 'MMMM yyyy')}
          </div>
          <button 
            onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl">
          <CardContent className="pt-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <DollarSign className="w-24 h-24" />
            </div>
            <p className="text-slate-400 font-medium mb-1">{t.totalNetWorth}</p>
            <h3 className="text-3xl font-bold mb-4">{formatCurrency(totalNetWorth)}</h3>
            <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-400/10 w-fit px-2 py-1 rounded-lg">
              <TrendingUp className="w-4 h-4" />
              <span>+2.5% {t.fromLastMonth}</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow relative overflow-hidden"
          onClick={() => setTransactionModal({ isOpen: true, type: 'income' })}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <ArrowUpRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">{t.income}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.monthlyIncome}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(monthlyIncome)}</h3>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow relative overflow-hidden"
          onClick={() => setTransactionModal({ isOpen: true, type: 'expense' })}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                <ArrowDownRight className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-full">{t.expense}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.monthlyExpense}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(monthlyExpense)}</h3>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">{t.savings}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.monthlySavings}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(monthlySavings)}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.incomeVsExpense}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] md:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.spendingByCategory}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] md:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Overview */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t.accounts || 'Your Accounts'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <Card 
              key={account.id} 
              className="hover:border-blue-500 transition-colors cursor-pointer group"
              onClick={() => setSelectedAccount(account)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 dark:shadow-none" style={{ backgroundColor: account.color }}>
                      {account.type === 'bank' && <Landmark className="w-6 h-6 text-white" />}
                      {account.type === 'cash' && <Wallet className="w-6 h-6 text-white" />}
                      {account.type === 'credit' && <CreditCard className="w-6 h-6 text-white" />}
                      {account.type === 'investment' && <TrendingUp className="w-6 h-6 text-white" />}
                      {account.type === 'other' && <DollarSign className="w-6 h-6 text-white" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{account.name}</h4>
                      <p className="text-xs text-slate-500 capitalize">{account.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-slate-900 dark:text-white">{formatCurrency(account.balance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Transaction Details Modal */}
      <Modal
        isOpen={transactionModal.isOpen}
        onClose={() => setTransactionModal({ isOpen: false, type: null })}
        title={`${transactionModal.type === 'income' ? t.income : t.expense} ${t.recentTransactions}`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.total} {transactionModal.type === 'income' ? t.income : t.expense}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(transactionModal.type === 'income' ? monthlyIncome : monthlyExpense)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              transactionModal.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              {transactionModal.type === 'income' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
            </div>
          </div>

          <div className="space-y-3">
            {modalTransactions.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                  }`}>
                    {t.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">{t.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{format(parseISO(t.date), 'MMM dd, yyyy')}</span>
                      <span>•</span>
                      <span className="capitalize">{categories.find(c => c.name === t.category)?.name || t.category}</span>
                    </div>
                  </div>
                </div>
                <span className={`font-bold text-sm ${
                  t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
            {modalTransactions.length === 0 && (
              <p className="text-center text-slate-500 py-4 text-sm">{t.noTransactions}</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Account Details Modal */}
      <Modal
        isOpen={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        title={selectedAccount?.name || t.accountDetails}
      >
        {selectedAccount && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t.currentBalance}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(selectedAccount.balance)}</p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: selectedAccount.color }}>
                {selectedAccount.name.charAt(0)}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">{t.transactionHistory}</h4>
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
                    <p className="text-center text-slate-500 py-4 text-sm">{t.noTransactions}</p>
                  )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
