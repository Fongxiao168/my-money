import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { CategoryManager } from '../components/CategoryManager';
import { Moon, Sun, RefreshCw, LogOut, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { translations } from '../lib/i18n';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Settings = () => {
  const { settings, setSettings, resetData, accounts, transactions, categories, setUser, user, profile, fetchData, language } = useStore();
  const navigate = useNavigate();

  const validLanguage = (language && translations[language]) ? language : 'en';
  const t = translations[validLanguage].settings;

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [isChangeNameOpen, setIsChangeNameOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [emailForm, setEmailForm] = useState({
    currentPassword: '',
    newEmail: ''
  });

  const [nameForm, setNameForm] = useState({
    fullName: profile?.full_name || ''
  });

  const handleChangeName = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setConfirmConfig({
      isOpen: true,
      title: 'Update Profile Name',
      message: 'Are you sure you want to update your profile name?',
      type: 'info',
      action: async () => {
        setIsLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("User not found");

          const { error } = await supabase
            .from('profiles')
            .update({ full_name: nameForm.fullName })
            .eq('id', user.id);

          if (error) throw error;

          // Update user metadata as well for consistency
          await supabase.auth.updateUser({
            data: { full_name: nameForm.fullName }
          });

          await fetchData(); // Refresh profile data
          toast.success("Profile name updated successfully");
          setIsChangeNameOpen(false);
        } catch (error: any) {
          toast.error(error.message);
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      toast.error("New password cannot be the same as the old password");
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Change Password',
      message: 'Are you sure you want to change your password?',
      type: 'warning',
      action: async () => {
        setIsLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || !user.email) throw new Error("User not found");

          // Verify old password
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: passwordForm.currentPassword
          });

          if (signInError) throw new Error("Incorrect current password");

          // Update password
          const { error: updateError } = await supabase.auth.updateUser({
            password: passwordForm.newPassword
          });

          if (updateError) throw updateError;

          toast.success("Password updated successfully");
          setIsChangePasswordOpen(false);
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
          toast.error(error.message);
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    if (!emailRegex.test(emailForm.newEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Change Email',
      message: 'Are you sure you want to change your email address?',
      type: 'warning',
      action: async () => {
        setIsLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || !user.email) throw new Error("User not found");

          if (user.email === emailForm.newEmail) {
            throw new Error("New email cannot be the same as the current email");
          }

          // Verify password
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: emailForm.currentPassword
          });

          if (signInError) throw new Error("Incorrect current password");

          // Update email
          const { error: updateError } = await supabase.auth.updateUser({
            email: emailForm.newEmail
          });

          if (updateError) throw updateError;

          // Update public profile
          await supabase.from('profiles').update({ email: emailForm.newEmail }).eq('id', user.id);

          toast.success("Confirmation email sent. Please check both your old and new email addresses to confirm the change.");
          setIsChangeEmailOpen(false);
          setEmailForm({ currentPassword: '', newEmail: '' });
        } catch (error: any) {
          toast.error(error.message);
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleLogout = async () => {
    try {
      const toastId = toast.loading('Logging out...');
      const { error } = await supabase.auth.signOut();
      toast.dismiss(toastId);
      
      if (error) {
        throw error;
      }
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      localStorage.clear();
    } finally {
      resetData();
      setUser(null);
      navigate('/auth');
    }
  };

  const toggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    setSettings({ theme: newTheme });
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{t.title}</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
      </div>

      {/* Profile Header Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 border-none text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{profile?.full_name || 'User'}</h3>
              <p className="text-blue-100">{user?.email}</p>
              <span className="inline-block mt-2 px-2 py-0.5 bg-white/20 rounded text-xs font-medium capitalize">
                {profile?.role || 'user'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.appearance}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">{t.themeMode}</span>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {settings.theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.account}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              onClick={() => {
                setNameForm({ fullName: profile?.full_name || '' });
                setIsChangeNameOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <User className="w-4 h-4" />
              {t.changeName}
            </button>

            <button
              onClick={() => setIsChangeEmailOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Mail className="w-4 h-4" />
              {t.changeEmail}
            </button>

            <button
              onClick={() => setIsChangePasswordOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Lock className="w-4 h-4" />
              {t.changePassword}
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t.logout}
            </button>
          </CardContent>
        </Card>
      </div>

      <CategoryManager />

      <Modal
        isOpen={isChangeNameOpen}
        onClose={() => setIsChangeNameOpen(false)}
        title="Change Profile Name"
      >
        <form onSubmit={handleChangeName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={nameForm.fullName}
              onChange={(e) => setNameForm({ fullName: e.target.value })}
              placeholder="Enter your full name"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsChangeNameOpen(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update Name'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        title="Change Password"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isChangeEmailOpen}
        onClose={() => setIsChangeEmailOpen(false)}
        title="Change Email"
      >
        <form onSubmit={handleChangeEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={emailForm.currentPassword}
              onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">Required to verify your identity</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              New Email Address
            </label>
            <input
              type="email"
              required
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsChangeEmailOpen(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update Email'}
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
    </div>
  );
};
