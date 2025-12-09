import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Transactions } from './pages/Transactions';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Auth } from './pages/Auth';
import { Banned } from './pages/Banned';
import { useStore } from './store/useStore';
import { Toaster } from 'sonner';
import { supabase } from './lib/supabase';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUsers } from './pages/AdminUsers';
import AdminChat from './pages/AdminChat';
import ChatWidget from './components/ChatWidget';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useStore();
  
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.status === 'banned') return <Navigate to="/banned" replace />;
  
  return <>{children}</>;
}

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useStore();
  
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.status === 'banned') return <Navigate to="/banned" replace />;
  if (profile?.role !== 'admin') return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

function App() {
  const { settings, fetchData, setUser } = useStore();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchData();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchData();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  return (
    <Router>
      <Toaster position='top-right' richColors />
      <ChatWidget />
      <Routes>
        <Route path='/auth' element={<Auth />} />
        <Route path='/banned' element={<Banned />} />
        
        {/* Admin Routes */}
        <Route path='/admin' element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path='users' element={<AdminUsers />} />
          <Route path='chat' element={<AdminChat />} />
        </Route>

        {/* User Routes */}
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path='/' element={<Dashboard />} />
          <Route path='/accounts' element={<Accounts />} />
          <Route path='/transactions' element={<Transactions />} />
          <Route path='/reports' element={<Reports />} />
          <Route path='/settings' element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
