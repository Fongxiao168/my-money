import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Announcement } from '../types';
import { X, Info, AlertTriangle, AlertCircle } from 'lucide-react';

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('dismissed_announcements');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });
      
      if (data) {
        setAnnouncements(data.filter(a => !dismissedIds.includes(a.id)));
      }
    };

    fetchAnnouncements();
    
    const subscription = supabase
      .channel('public:announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchAnnouncements)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [dismissedIds]);

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissed_announcements', JSON.stringify(newDismissed));
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  if (announcements.length === 0) return null;

  return (
    <div className="flex flex-col w-full z-50">
      {announcements.map(announcement => (
        <div 
          key={announcement.id}
          className={`
            relative px-4 py-3 flex items-start justify-between
            ${announcement.type === 'alert' ? 'bg-red-600 text-white' : 
              announcement.type === 'warning' ? 'bg-yellow-500 text-white' : 
              'bg-blue-600 text-white'}
          `}
        >
          <div className="flex items-center gap-3">
            {announcement.type === 'alert' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            {announcement.type === 'warning' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            {announcement.type === 'info' && <Info className="w-5 h-5 flex-shrink-0" />}
            
            <div>
              <p className="font-medium text-sm md:text-base">
                {announcement.title}
                {announcement.content && <span className="font-normal opacity-90 ml-2 hidden md:inline">- {announcement.content}</span>}
              </p>
              {announcement.content && <p className="text-sm opacity-90 md:hidden mt-1">{announcement.content}</p>}
            </div>
          </div>

          <button 
            onClick={() => handleDismiss(announcement.id)}
            className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
