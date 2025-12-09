import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Loader2, LogIn, UserPlus, Facebook, Phone, Mail, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { translations } from '../lib/i18n';
import type { Language } from '../lib/i18n';

type AuthMethod = 'email' | 'phone';

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { fetchData, language, setLanguage } = useStore();
  
  // Ensure language is valid, fallback to 'en'
  const validLanguage = (language && translations[language]) ? language : 'en';
  const t = translations[validLanguage].auth;

  const authSchema = z.object({
    email: z.string().email(t.invalidEmail),
    password: z.string().min(6, t.passwordLength),
    confirmPassword: isLogin 
      ? z.string().optional() 
      : z.string()
  }).refine((data) => {
    if (!isLogin && data.password !== data.confirmPassword) {
      return false;
    }
    return true;
  }, {
    message: t.passwordMismatch,
    path: ["confirmPassword"],
  });

  type AuthForm = z.infer<typeof authSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
  });

  useEffect(() => {
    reset();
  }, [isLogin, authMethod, reset, validLanguage]);

  const handleFacebookLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const onSubmit = async (data: AuthForm) => {
    setIsLoading(true);
    
    try {
      const credentials = {
        email: data.email,
        password: data.password
      };

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword(credentials);
        if (error) throw error;
        toast.success(t.welcomeBack);
      } else {
        // Check if user already exists in profiles to prevent duplicates
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', credentials.email)
          .single();

        if (existingUser) {
          toast.error(t.emailExists);
          setIsLoading(false);
          return;
        }

        const { data: authData, error } = await supabase.auth.signUp(credentials);
        if (error) throw error;
        
        if (authData.session) {
          toast.success(t.signUpSuccess);
          await fetchData();
          navigate('/');
          return;
        }
        
        toast.success('Sign up successful! Please check your email for verification code.');

        setIsLogin(true);
        setIsLoading(false);
        return;
      }

      await fetchData();
      navigate('/');
    } catch (error: any) {
      console.error("Auth Error:", error);
      if (error.message === 'Failed to fetch') {
        toast.error("Connection Failed: Could not reach the server. Please check your internet connection and Supabase URL.");
      } else {
        toast.error(error.message || "An error occurred during authentication");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md p-8 relative">
        
        {/* Language Selector */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <select
            value={validLanguage}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-transparent text-sm text-gray-600 dark:text-gray-400 border-none focus:ring-0 cursor-pointer outline-none"
          >
            <option value="en">English</option>
            <option value="km">ខ្មែរ</option>
            <option value="zh">中文</option>
          </select>
        </div>

        <div className="text-center mb-8 mt-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isLogin ? t.signIn : t.signUp}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isLogin
              ? t.welcomeBack
              : t.signUpSuccess.replace('!', '')} 
          </p>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg hidden">
          <button
            onClick={() => setAuthMethod('email')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
              authMethod === 'email'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={() => setAuthMethod('phone')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
              authMethod === 'phone'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Phone className="w-4 h-4" />
            Phone
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.email}
            </label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.password}
            </label>
            <input
              {...register('password')}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.confirmPassword}
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLogin ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {isLogin ? t.signIn : t.signUp}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {isLogin
              ? t.noAccount
              : t.hasAccount}
          </button>
        </div>


      </Card>
    </div>
  );
};
