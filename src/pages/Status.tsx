import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, User, UsageLog } from '../lib/supabase';
import { Users, Activity, TrendingUp, Calendar, Database, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserStats {
  user: User;
  totalUsage: number;
  todayUsage: number;
  thisWeekUsage: number;
  usageCount: number;
  lastUsed?: string;
}

export const Status: React.FC = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProxies: 0,
    usedProxies: 0
  });

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      fetchUserStats();
      fetchSystemStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch all usage logs
      const { data: usageLogs, error: logsError } = await supabase
        .from('usage_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Calculate stats for each user
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats: UserStats[] = users?.map(userData => {
        const userLogs = usageLogs?.filter(log => log.user_id === userData.id) || [];
        
        const totalUsage = userLogs.reduce((sum, log) => sum + log.amount, 0);
        const todayUsage = userLogs
          .filter(log => new Date(log.created_at) >= today)
          .reduce((sum, log) => sum + log.amount, 0);
        const thisWeekUsage = userLogs
          .filter(log => new Date(log.created_at) >= weekAgo)
          .reduce((sum, log) => sum + log.amount, 0);
        const usageCount = userLogs.length;
        const lastUsed = userLogs[0]?.created_at;

        return {
          user: userData,
          totalUsage,
          todayUsage,
          thisWeekUsage,
          usageCount,
          lastUsed
        };
      }) || [];

      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      // Count users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Count proxies
      const { count: totalProxies } = await supabase
        .from('proxies')
        .select('*', { count: 'exact', head: true });

      const { count: usedProxies } = await supabase
        .from('proxies')
        .select('*', { count: 'exact', head: true })
        .eq('is_used', true);

      setSystemStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalProxies: totalProxies || 0,
        usedProxies: usedProxies || 0
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const deleteAllProxies = async () => {
    if (!confirm(`আপনি কি নিশ্চিত যে ডাটাবেস থেকে সব ${systemStats.totalProxies}টি প্রক্সি মুছে ফেলতে চান? এই কাজটি আর ফিরিয়ে আনা যাবে না।`)) {
      return;
    }

    if (!confirm('এটি স্থায়ীভাবে সব প্রক্সি ডেটা মুছে ফেলবে। আপনি কি সত্যিই এটি করতে চান?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('proxies')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) throw error;

      toast.success('🗑️ সব প্রক্সি সফলভাবে মুছে ফেলা হয়েছে');
      fetchSystemStats(); // Refresh the stats
    } catch (error) {
      toast.error('❌ প্রক্সি মুছতে ত্রুটি হয়েছে');
      console.error('Error deleting all proxies:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">শুধুমাত্র অ্যাডমিন এবং ম্যানেজার এই পেজ দেখতে পারে</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const availableProxies = systemStats.totalProxies - systemStats.usedProxies;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">সিস্টেম স্ট্যাটাস</h1>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">মোট ইউজার</p>
                <p className="text-2xl font-bold text-blue-900">{systemStats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">সক্রিয় ইউজার</p>
                <p className="text-2xl font-bold text-green-900">{systemStats.activeUsers}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">উপলব্ধ প্রক্সি</p>
                <p className="text-2xl font-bold text-purple-900">{availableProxies}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">মোট প্রক্সি</p>
                <p className="text-2xl font-bold text-orange-900">{systemStats.totalProxies}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* User Statistics Table - Only for Admin */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ইউজার পরিসংখ্যান</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ইউজার
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      রোল
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      স্ট্যাটাস
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      দৈনিক সীমা
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      আজকের ব্যবহার
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      এই সপ্তাহ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      মোট ব্যবহার
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      শেষ ব্যবহার
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userStats.map((stat) => (
                    <tr key={stat.user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {stat.user.username}
                          </div>
                          <div className="text-xs text-gray-500">
                            {stat.user.access_key}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          stat.user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : stat.user.role === 'manager'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {stat.user.role === 'admin' ? 'অ্যাডমিন' : stat.user.role === 'manager' ? 'ম্যানেজার' : 'ইউজার'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          stat.user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {stat.user.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stat.user.daily_limit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <span className="mr-2">{stat.todayUsage}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (stat.todayUsage / stat.user.daily_limit) * 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stat.thisWeekUsage}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{stat.totalUsage}</div>
                          <div className="text-xs text-gray-500">{stat.usageCount} times</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stat.lastUsed ? new Date(stat.lastUsed).toLocaleString() : 'কখনো না'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};