import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import type { ChatMessage, ChatSession } from '../types';

export default function ChatWidget() {
  const { user, profile } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchSession();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (session?.id) {
      fetchMessages(session.id);
      
      const subscription = supabase
        .channel(`chat:${session.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `session_id=eq.${session.id}`,
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

      const sessionSub = supabase
        .channel(`session:${session.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_sessions',
            filter: `id=eq.${session.id}`,
          },
          (payload) => {
            // @ts-ignore
            if (payload.new.status === 'ended') {
              setSession(null);
              setMessages([]);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
        sessionSub.unsubscribe();
      };
    }
  }, [session?.id]);

  const fetchSession = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .single();

    if (data) {
      setSession(data);
    } else {
      setSession(null);
    }
    setLoading(false);
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

  const startChat = async () => {
    setLoading(true);
    
    // Check if active session exists first
    const { data: existing } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .single();
      
    if (existing) {
      setSession(existing);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert([{ user_id: user!.id, status: 'active' }])
      .select()
      .single();

    if (data) {
      setSession(data);
    }
    setLoading(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !session) return;

    const content = newMessage.trim();
    setNewMessage('');

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([
        {
          session_id: session.id,
          sender_id: user!.id,
          content,
          is_admin: false,
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

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Only show for logged in users who are NOT admins
  if (!user || profile?.role === 'admin') return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-[100]"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-24 md:bottom-6 right-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[100] flex flex-col transition-all duration-300 ${isMinimized ? 'w-72 h-14' : 'w-80 h-96'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-600 text-white rounded-t-lg">
        <h3 className="font-semibold">Live Support</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMinimized(!isMinimized)} className="hover:text-gray-200">
            {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="hover:text-gray-200">
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!session ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <p className="text-gray-500 dark:text-gray-400">Need help? Start a chat with our support team.</p>
                <button
                  onClick={startChat}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Starting...' : 'Start Chat'}
                </button>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.is_admin
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                          : 'bg-blue-600 text-white'
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
              </>
            )}
          </div>

          {/* Input Area */}
          {session && (
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
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
          )}
        </>
      )}
    </div>
  );
}
