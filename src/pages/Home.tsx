import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Proxy } from '../lib/supabase';
import { Copy, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const [amount, setAmount] = useState(15);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(false);
  const [usageToday, setUsageToday] = useState(0);

  useEffect(() => {
    if (user) {
      fetchTodayUsage();
    }
  }, [user]);

  const fetchTodayUsage = async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('usage_logs')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const total = data?.reduce((sum, log) => sum + log.amount, 0) || 0;
      setUsageToday(total);
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  const generateProxies = async () => {
    if (!user) return;

    if (usageToday + amount > user.daily_limit) {
      toast.error(`Daily limit exceeded! You can only get ${user.daily_limit - usageToday} more IPs today.`);
      return;
    }

    setLoading(true);
    try {
      // Check for available proxies
      const { data: availableProxies, error } = await supabase
        .from('proxies')
        .select('*')
        .eq('is_used', false)
        .limit(amount);

      if (error) throw error;

      if (!availableProxies || availableProxies.length < amount) {
        toast.error(`Not enough IPs available. Only ${availableProxies?.length || 0} IPs available.`);
        setLoading(false);
        return;
      }

      // Check if any of these proxies are being used by others
      const proxyIds = availableProxies.map(p => p.id);
      const { data: updatedProxies } = await supabase
        .from('proxies')
        .select('*')
        .in('id', proxyIds)
        .eq('is_used', false);

      if (!updatedProxies || updatedProxies.length < amount) {
        toast.error('Other users are using these IPs. Please try again.');
        setLoading(false);
        return;
      }

      setProxies(updatedProxies.slice(0, amount));
      toast.success(`${amount} IPs generated successfully`);
    } catch (error) {
      toast.error('Error generating IPs');
      console.error('Error generating proxies:', error);
    }
    setLoading(false);
  };

  const copyProxy = async (proxy: Proxy) => {
    try {
      // Check if proxy is still available
      const { data: currentProxy, error } = await supabase
        .from('proxies')
        .select('*')
        .eq('id', proxy.id)
        .single();

      if (error || !currentProxy || currentProxy.is_used) {
        toast.error('This IP has been used by someone else. Please generate again.');
        setProxies(prev => prev.filter(p => p.id !== proxy.id));
        return;
      }

      // Mark as used and copy to clipboard
      const { error: updateError } = await supabase
        .from('proxies')
        .update({
          is_used: true,
          used_by: user?.id,
          used_at: new Date().toISOString()
        })
        .eq('id', proxy.id);

      if (updateError) throw updateError;

      await navigator.clipboard.writeText(proxy.proxy_string);
      toast.success('IP copied and removed from database');

      // Remove from local state
      setProxies(prev => prev.filter(p => p.id !== proxy.id));

      // Delete from database
      await supabase.from('proxies').delete().eq('id', proxy.id);

      // Log usage if this is the last proxy being copied
      if (proxies.length === 1) {
        await supabase.from('usage_logs').insert({
          user_id: user?.id,
          amount: amount
        });
        await fetchTodayUsage();
      }
    } catch (error) {
      toast.error('Error copying IP');
      console.error('Error copying proxy:', error);
    }
  };

  const copyAllProxies = async () => {
    if (proxies.length === 0) return;

    try {
      // Check if all proxies are still available
      const proxyIds = proxies.map(p => p.id);
      const { data: currentProxies, error } = await supabase
        .from('proxies')
        .select('*')
        .in('id', proxyIds)
        .eq('is_used', false);

      if (error) throw error;

      if (!currentProxies || currentProxies.length !== proxies.length) {
        toast.error('Some IPs have been used by others. Please generate again.');
        return;
      }

      // Mark all as used
      const { error: updateError } = await supabase
        .from('proxies')
        .update({
          is_used: true,
          used_by: user?.id,
          used_at: new Date().toISOString()
        })
        .in('id', proxyIds);

      if (updateError) throw updateError;

      // Copy all to clipboard
      const allProxies = proxies.map(p => p.proxy_string).join('\n');
      await navigator.clipboard.writeText(allProxies);
      
      toast.success(`${proxies.length} IPs copied and removed from database`);

      // Delete from database
      await supabase.from('proxies').delete().in('id', proxyIds);

      // Log usage
      await supabase.from('usage_logs').insert({
        user_id: user?.id,
        amount: proxies.length
      });

      setProxies([]);
      await fetchTodayUsage();
    } catch (error) {
      toast.error('Error copying all IPs');
      console.error('Error copying all proxies:', error);
    }
  };

  const remainingLimit = user ? user.daily_limit - usageToday : 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">IP Proxy Generator</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Today's Usage</div>
              <div className="text-2xl font-bold text-blue-900">{usageToday}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Remaining Limit</div>
              <div className="text-2xl font-bold text-green-900">{remainingLimit}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Daily Limit</div>
              <div className="text-2xl font-bold text-purple-900">{user?.daily_limit}</div>
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-6">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Number of IPs
              </label>
              <input
                type="number"
                id="amount"
                min="1"
                max={Math.min(remainingLimit, 100)}
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 15)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="pt-6">
              <button
                onClick={generateProxies}
                disabled={loading || remainingLimit <= 0}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </div>
                ) : (
                  'Generate IPs'
                )}
              </button>
            </div>
          </div>

          {remainingLimit <= 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-red-700 text-sm">
                  Your daily limit has been reached. Please try again tomorrow.
                </p>
              </div>
            </div>
          )}
        </div>

        {proxies.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Generated IPs ({proxies.length})
              </h2>
              <button
                onClick={copyAllProxies}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                <Download size={16} />
                <span>Copy All</span>
              </button>
            </div>
            
            <div className="space-y-2">
              {proxies.map((proxy, index) => (
                <div
                  key={proxy.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500 w-8">
                      {index + 1}.
                    </span>
                    <code className="text-sm font-mono text-gray-800 bg-white px-2 py-1 rounded border select-none">
                      {proxy.proxy_string}
                    </code>
                  </div>
                  <button
                    onClick={() => copyProxy(proxy)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Copy size={14} />
                    <span>Copy</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-400 mr-2" />
                <p className="text-yellow-700 text-sm">
                  <strong>Warning:</strong> IPs will be deleted from the database after copying. 
                  Make sure to copy the IPs you need.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};