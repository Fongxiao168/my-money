import React, { useState, useEffect, useRef } from 'react';
import { Send, User, XCircle, Settings as SettingsIcon, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import type { ChatMessage, ChatSession, ChatSettings } from '../types';

export default function AdminChat() {
  const { user } = useStore();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
    fetchSettings();

    const subscription = supabase
      .channel('admin_chat_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession.id);

      const subscription = supabase
        .channel(`admin_chat:${selectedSession.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `session_id=eq.${selectedSession.id}`,
          },
          (payload) => {
            const newMessage = payload.new as ChatMessage;
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
            scrollToBottom();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedSession?.id]);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*, profiles:user_id(email, full_name)')
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (data) {
      // @ts-ignore - Supabase types are tricky with joins
      setSessions(data);
    }
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('chat_settings')
      .select('*')
      .single();

    if (data) {
      setSettings(data);
      setWelcomeMessage(data.welcome_message);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase
      .from('chat_settings')
      .update({ welcome_message: welcomeMessage })
      .eq('id', 1);

    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved successfully');
      fetchSettings();
      setShowSettings(false);
    }
    setSavingSettings(false);
  };

  const fetchMessages = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedSession) return;

    const content = newMessage.trim();
    setNewMessage('');

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([
        {
          session_id: selectedSession.id,
          sender_id: user!.id,
          content,
          is_admin: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setNewMessage(content);
    } else if (data) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev;
        return [...prev, data as ChatMessage];
      });
      scrollToBottom();
    }
  };

  const endChat = async () => {
    if (!selectedSession) return;

    if (window.confirm('Are you sure you want to end this chat?')) {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ status: 'ended' })
        .eq('id', selectedSession.id);

      if (!error) {
        setSelectedSession(null);
        setMessages([]);
        fetchSessions();
      }
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Support</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showSettings 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <SettingsIcon size={20} />
          Settings
        </button>
      </div>

      {showSettings ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Chat Settings</h2>
          <div className="max-w-2xl">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Welcome Message (Auto-reply)
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This message will be automatically sent to users when they start a new chat session.
            </p>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Enter welcome message..."
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-12rem)] bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Sessions List */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h3 className="font-semibold text-gray-900 dark:text-white">Active Chats ({sessions.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No active chats
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`w-full p-4 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedSession?.id === session.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <User size={20} />
                    </div>
                    <div>
                      {/* @ts-ignore */}
                      <p className="font-medium text-gray-900 dark:text-white">{session.profiles?.full_name || session.profiles?.email || 'Unknown User'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Started {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <User size={20} />
                  </div>
                  <div>
                    {/* @ts-ignore */}
                    <h3 className="font-semibold text-gray-900 dark:text-white">{selectedSession.profiles?.full_name || selectedSession.profiles?.email}</h3>
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400"></span>
                      Active Now
                    </span>
                  </div>
                </div>
                <button
                  onClick={endChat}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <XCircle size={20} />
                  End Chat
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        msg.is_admin
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Select a chat session to start messaging
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
