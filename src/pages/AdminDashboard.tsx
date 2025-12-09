import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, PaymentRequest } from '../types';
import { Users, UserPlus, ShieldAlert, Activity, TrendingUp, Check, X, Eye, ExternalLink } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import { toast } from 'sonner';

export function AdminDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: true });

        if (profilesError) throw profilesError;
        setProfiles(profilesData || []);

        const { data: requestsData, error: requestsError } = await supabase
          .from('payment_requests')
          .select('*, profiles:user_id(email, full_name)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
        if (requestsError) throw requestsError;
        setPaymentRequests(requestsData || []);

      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const handleApprovePayment = async (requestId: string, userId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('payment_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);
      
      if (updateError) throw updateError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', userId);

      if (profileError) throw profileError;

      setPaymentRequests(prev => prev.filter(req => req.id !== requestId));
      setSelectedRequest(null);
      toast.success('Payment approved and user upgraded.');
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('Failed to approve payment.');
    }
  };

  const handleRejectPayment = async (requestId: string) => {
    if (!confirm('Are you sure you want to reject this payment?')) return;
    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      
      if (error) throw error;

      setPaymentRequests(prev => prev.filter(req => req.id !== requestId));
      setSelectedRequest(null);
      toast.success('Payment rejected.');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
      </div>
    );
  }

  // Calculate Stats
  const totalUsers = profiles.length;
  const newUsersLast30Days = profiles.filter(p => 
    isAfter(parseISO(p.created_at), subDays(new Date(), 30))
  ).length;
  const bannedUsers = profiles.filter(p => p.status === 'banned').length;
  const adminCount = profiles.filter(p => p.role === 'admin').length;

  // Prepare Chart Data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return format(date, 'MMM dd');
  });

  const userGrowthData = last7Days.map(dateStr => {
    const count = profiles.filter(p => 
      format(parseISO(p.created_at), 'MMM dd') === dateStr
    ).length;
    return { name: dateStr, users: count };
  });

  // Accumulate growth for a nicer chart
  let runningTotal = 0;
  const cumulativeGrowthData = userGrowthData.map(day => {
    runningTotal += day.users;
    return { ...day, total: runningTotal };
  });

  const roleData = [
    { name: 'Admins', value: adminCount },
    { name: 'Users', value: totalUsers - adminCount },
  ];

  const statusData = [
    { name: 'Active', value: totalUsers - bannedUsers },
    { name: 'Banned', value: bannedUsers },
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444'];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Overview</h2>
        <p className="text-gray-500 dark:text-gray-400">Welcome back, Admin. Here's what's happening today.</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Users" 
          value={totalUsers} 
          icon={Users} 
          color="blue"
          trend="+12%" 
        />
        <StatsCard 
          title="New Users (30d)" 
          value={newUsersLast30Days} 
          icon={UserPlus} 
          color="green"
          trend={`+${newUsersLast30Days}`}
        />
        <StatsCard 
          title="Banned Users" 
          value={bannedUsers} 
          icon={ShieldAlert} 
          color="red"
          trend="Action needed"
        />
        <StatsCard 
          title="Active Admins" 
          value={adminCount} 
          icon={Activity} 
          color="purple"
          trend="Stable"
        />
      </div>

      {/* Payment Requests Section - MOVED TO TOP */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Payment Requests</h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {paymentRequests.length} Pending
          </span>
        </div>
        
        {paymentRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <Check className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">No pending requests</h3>
            <p className="mt-1 text-sm text-gray-500">All payment requests have been reviewed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">User Details</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Receipt</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paymentRequests.map((request) => (
                  <tr key={request.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {request.profiles?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">{request.profiles?.email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      ${request.amount}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {format(parseISO(request.created_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedRequest(request)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        Review
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Pending
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* User Growth Chart */}
        <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Growth (Last 7 Days)</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Role Distribution */}
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">User Roles</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {roleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#8b5cf6' : '#3b82f6'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Account Status</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedRequest(null)}>
          <div className="relative max-w-4xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
            
            {/* Left Side: Receipt Image */}
            <div className="w-full md:w-1/2 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 border-r border-gray-200 dark:border-gray-700">
              <img 
                src={selectedRequest.receipt_url} 
                alt="Receipt" 
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
              />
            </div>

            {/* Right Side: Details & Actions */}
            <div className="w-full md:w-1/2 p-6 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Review Payment</h3>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">User</label>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {selectedRequest.profiles?.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">{selectedRequest.profiles?.email}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Amount</label>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">${selectedRequest.amount}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Date Submitted</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {format(parseISO(selectedRequest.created_at), 'PPP p')}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleRejectPayment(selectedRequest.id)}
                  className="flex items-center justify-center px-4 py-3 text-sm font-medium text-red-700 bg-red-50 rounded-xl hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
                >
                  <X className="w-5 h-5 mr-2" />
                  Reject
                </button>
                <button
                  onClick={() => handleApprovePayment(selectedRequest.id, selectedRequest.user_id)}
                  className="flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-colors"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color, trend }: any) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  };

  return (
    <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm">
        <span className={`font-medium ${
          trend.includes('+') ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
        }`}>
          {trend}
        </span>
        <span className="ml-2 text-gray-400">vs last month</span>
      </div>
    </div>
  );
}

