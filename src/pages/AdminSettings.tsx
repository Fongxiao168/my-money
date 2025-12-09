import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { SystemSetting } from '../types';
import { Save, Settings as SettingsIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { logAdminAction } from '../lib/admin';

export function AdminSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('key');

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: string, currentValue: any) => {
    try {
      const newValue = { ...currentValue, enabled: !currentValue.enabled };
      
      const { error } = await supabase
        .from('system_settings')
        .update({ value: newValue, updated_at: new Date().toISOString() })
        .eq('key', key);

      if (error) throw error;

      setSettings(prev => prev.map(s => 
        s.key === key ? { ...s, value: newValue } : s
      ));

      await logAdminAction('update_setting', 'system_settings', key, { oldValue: currentValue, newValue });
      toast.success('Setting updated');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h2>
          <p className="text-gray-500 dark:text-gray-400">Configure global application settings.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {settings.map((setting) => (
          <div key={setting.key} className="bg-white border border-gray-200 shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-lg dark:bg-gray-700">
                  <SettingsIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white capitalize">
                    {setting.key.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {setting.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {typeof setting.value?.enabled === 'boolean' && (
                  <button
                    onClick={() => handleToggle(setting.key, setting.value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      setting.value.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        setting.value.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>
            
            {/* Show JSON value for debugging or complex settings */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-xs font-mono text-gray-500">
              {JSON.stringify(setting.value, null, 2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
