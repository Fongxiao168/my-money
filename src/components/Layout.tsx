import React from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Wallet, CreditCard, PieChart, Settings, ArrowRightLeft, LogOut, ShieldCheck, LifeBuoy } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import { translations } from '../lib/i18n';
import { AnnouncementBanner } from './AnnouncementBanner';

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, resetData, profile, language } = useStore();
  
  const validLanguage = (language && translations[language]) ? language : 'en';
  const t = translations[validLanguage].sidebar;

  const handleLogout = async () => {
    try {
      const toastId = toast.loading(t.loggingOut);
      const { error } = await supabase.auth.signOut();
      toast.dismiss(toastId);
      
      if (error) {
        throw error;
      }
      
      toast.success(t.logoutSuccess);
    } catch (error) {
      console.error('Error signing out:', error);
      // Fallback: Clear all local storage to ensure logout happens
      localStorage.clear();
    } finally {
      resetData();
      setUser(null);
      navigate('/auth');
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: t.dashboard, path: '/' },
    { icon: Wallet, label: t.accounts, path: '/accounts' },
    { icon: ArrowRightLeft, label: t.transactions, path: '/transactions' },
    { icon: PieChart, label: t.reports, path: '/reports' },
    { icon: LifeBuoy, label: t.support || 'Support', path: '/support' },
    { icon: Settings, label: t.settings, path: '/settings' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed h-full z-50">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              MoneyFlow
            </h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          {/* Debug Info - Remove later */}
          <div className="px-4 py-2 mb-2 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 rounded">
            <p>Role: {profile?.role || 'null'}</p>
            <p>Email: {user?.email}</p>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 rounded-xl font-medium transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            {t.logout}
          </button>
        </div>
      </aside>

      {/* Mobile Header (Top Bar) */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 px-6 py-4 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-600/20">
               <CreditCard className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
               MoneyFlow
            </h1>
         </div>
         <button 
            onClick={handleLogout}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
            title="Logout"
         >
            <LogOut className="w-5 h-5" />
         </button>
      </header>

      {/* Mobile Navigation (Bottom Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 px-2 py-3 flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[60px]",
                isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        {profile?.role === 'admin' && (
          <Link
            to="/admin"
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[60px]",
              location.pathname.startsWith('/admin') ? "text-purple-600 dark:text-purple-400" : "text-slate-400 dark:text-slate-500"
            )}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px] font-medium">Admin</span>
          </Link>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-6 pb-24 md:pb-6 pt-24 md:pt-6 overflow-x-hidden">
        <div className="mb-6">
          <AnnouncementBanner />
        </div>
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
