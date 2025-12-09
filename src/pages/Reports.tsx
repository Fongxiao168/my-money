import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subDays, isSameDay, parseISO } from 'date-fns';
import { translations } from '../lib/i18n';

export const Reports = () => {
  const { transactions, language } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<{ name: string; type: 'income' | 'expense' } | null>(null);

  const validLanguage = (language && translations[language]) ? language : 'en';
  const t = translations[validLanguage].reports;

  // Daily Cash Flow (Last 30 Days)
  const dailyData = React.useMemo(() => {
    const end = new Date();
    const start = subDays(end, 30);
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dayTrans = transactions.filter(t => isSameDay(parseISO(t.date), day));
      const income = dayTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = dayTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      return {
        date: format(day, 'MMM dd'),
        income,
        expense,
        net: income - expense
      };
    });
  }, [transactions]);

  // Category Stats
  const categoryStats = React.useMemo(() => {
    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        const current = incomeMap.get(t.category) || 0;
        incomeMap.set(t.category, current + t.amount);
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        const current = expenseMap.get(t.category) || 0;
        expenseMap.set(t.category, current + t.amount);
        totalExpense += t.amount;
      }
    });

    const income = Array.from(incomeMap.entries())
      .map(([name, value]) => ({ 
        name, 
        value, 
        percentage: totalIncome > 0 ? (value / totalIncome) * 100 : 0 
      }))
      .sort((a, b) => b.value - a.value);

    const expense = Array.from(expenseMap.entries())
      .map(([name, value]) => ({ 
        name, 
        value, 
        percentage: totalExpense > 0 ? (value / totalExpense) * 100 : 0 
      }))
      .sort((a, b) => b.value - a.value);

    return { income, expense, totalIncome, totalExpense };
  }, [transactions]);

  const categoryTransactions = React.useMemo(() => {
    if (!selectedCategory) return [];
    return transactions
      .filter(t => t.category === selectedCategory.name && t.type === selectedCategory.type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedCategory]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{t.title}</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t.incomeByCategory}</CardTitle>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(categoryStats.totalIncome)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryStats.income.map((item, index) => (
                <div 
                  key={item.name} 
                  className="space-y-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-lg transition-colors"
                  onClick={() => setSelectedCategory({ name: item.name, type: 'income' })}
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {categoryStats.income.length === 0 && (
                <p className="text-center text-slate-500 py-4">{t.noIncomeData}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t.expenseByCategory}</CardTitle>
              <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(categoryStats.totalExpense)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryStats.expense.map((item, index) => (
                <div 
                  key={item.name} 
                  className="space-y-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-lg transition-colors"
                  onClick={() => setSelectedCategory({ name: item.name, type: 'expense' })}
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full" 
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {categoryStats.expense.length === 0 && (
                <p className="text-center text-slate-500 py-4">{t.noExpenseData}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>{t.dailyCashFlow}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] md:h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="income" name={t.income} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name={t.expense} fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.netCashFlowTrend}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] md:h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="net" name={t.netFlow} stroke="#3b82f6" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        title={`${selectedCategory?.name} ${t.history}`}
      >
        <div className="space-y-3">
          {categoryTransactions.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                }`}>
                  {t.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white text-sm">{t.description}</p>
                  <p className="text-xs text-slate-500">{format(parseISO(t.date), 'MMM dd, yyyy')}</p>
                </div>
              </div>
              <span className={`font-bold text-sm ${
                t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
              </span>
            </div>
          ))}
          {categoryTransactions.length === 0 && (
            <p className="text-center text-slate-500 py-4 text-sm">{t.noTransactions}</p>
          )}
        </div>
      </Modal>
    </div>
  );
};
