import React from 'react';
import { Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export function Banned() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
            <Ban className="w-16 h-16 text-red-600 dark:text-red-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Suspended</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Your account has been suspended by an administrator. If you believe this is a mistake, please contact support.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
