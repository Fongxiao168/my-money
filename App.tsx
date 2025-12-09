import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Transactions } from './pages/Transactions';
import { Reports } from './pages/Reports';
import { Support } from './pages/Support';
import { Settings } from './pages/Settings';
import { Auth } from './pages/Auth';
import { Banned } from './pages/Banned';
import { useStore } from './store/useStore';
import { Toaster } from 'sonner';
import { supabase } from './lib/supabase';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUsers } from './pages/AdminUsers';
import { AdminAnnouncements } from './pages/AdminAnnouncements';
import { AdminLogs } from './pages/AdminLogs';
import { AdminSettings } from './pages/AdminSettings';
import { AdminTickets } from './pages/AdminTickets';
import { AdminHistory } from './pages/AdminHistory';
import AdminChat from './pages/AdminChat';
import ChatWidget from './components/ChatWidget';

import { AdminLogin } from './pages/AdminLogin';
import { UpdatePassword } from './pages/UpdatePassword';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useStore();
  
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.status === 'banned') return <Navigate to="/banned" replace />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  
  return <>{children}</>;
}

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useStore();
  
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (profile?.status === 'banned') return <Navigate to="/banned" replace />;
  if (profile?.role !== 'admin') return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

function App() {
  const { settings, fetchData, setUser } = useStore();
  const [isInitializing, setIsInitializing] = React.useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchData();
      
      // If we have a session, we are done initializing.
      // If we don't have a session, but we have a hash with access_token, 
      // we might be in the middle of a recovery flow, so we wait for onAuthStateChange.
      if (session || !window.location.hash.includes('access_token')) {
        setIsInitializing(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchData();
      
      // If we are in a recovery flow, we want to ensure we have the session before stopping initialization
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
         setIsInitializing(false);
      } else if (!window.location.hash.includes('access_token')) {
         // For other events like SIGNED_OUT, only stop initializing if we are not waiting for a token
         setIsInitializing(false);
      }
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

  if (isInitializing) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <Router>
      <Toaster position='top-right' richColors />
      <ChatWidget />
      <Routes>
        <Route path='/auth' element={<Auth />} />
        <Route path='/update-password' element={<UpdatePassword />} />
        <Route path='/admin/login' element={<AdminLogin />} />
        <Route path='/banned' element={<Banned />} />
        
        {/* Admin Routes */}
        <Route path='/admin' element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path='users' element={<AdminUsers />} />
          <Route path='announcements' element={<AdminAnnouncements />} />
          <Route path='logs' element={<AdminLogs />} />
          <Route path='settings' element={<AdminSettings />} />
          <Route path="tickets" element={<AdminTickets />} />
          <Route path="history" element={<AdminHistory />} />
          <Route path="chat" element={<AdminChat />} />
        </Route>

        {/* User Routes */}
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path='/' element={<Dashboard />} />
          <Route path='/accounts' element={<Accounts />} />
          <Route path='transactions' element={<Transactions />} />
          <Route path='reports' element={<Reports />} />
          <Route path='support' element={<Support />} />
          <Route path='settings' element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
