"use client";

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/hooks/useFinance';
import { SummaryCards } from '@/components/SummaryCards';
import { TransactionForm } from '@/components/TransactionForm';
import { TransactionList } from '@/components/TransactionList';
import { Charts } from '@/components/Charts';
import { Sidebar } from '@/components/Sidebar';
import { Menu } from 'lucide-react';

type FilterType = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function Home() {
  const { transactions, addTransaction, deleteTransaction, getSummary, isLoaded } = useFinance();
  const [filter, setFilter] = useState<FilterType>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      
      switch (filter) {
        case 'daily':
          return tDate.toDateString() === now.toDateString();
        case 'weekly':
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return tDate >= oneWeekAgo;
        case 'monthly':
          return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        case 'yearly':
          return tDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filter]);

  const summary = getSummary(filteredTransactions);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Sidebar />
      
      <div className="lg:ml-64 min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-40">
          <h1 className="text-lg font-bold text-slate-900">FinTrack</h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
            <Menu className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <main className="p-6 max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-500">Welcome back, here's your financial overview.</p>
            </div>
            
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              {(['all', 'daily', 'weekly', 'monthly', 'yearly'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    filter === f
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <SummaryCards summary={summary} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="xl:col-span-2 space-y-8">
              <Charts transactions={filteredTransactions} />
              <TransactionList transactions={filteredTransactions} onDelete={deleteTransaction} />
            </div>

            {/* Right Column */}
            <div className="xl:col-span-1">
              <div className="sticky top-8">
                <TransactionForm onAdd={addTransaction} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
