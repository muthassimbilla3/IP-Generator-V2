import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Proxy } from '../lib/supabase';
import { Download, AlertTriangle, FileText, FileSpreadsheet } from 'lucide-react';
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

  const markProxiesAsUsed = async () => {
    if (proxies.length === 0) return;

    try {
      const proxyIds = proxies.map(p => p.id);
      
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

      // Delete from database
      await supabase.from('proxies').delete().in('id', proxyIds);

      // Log usage
      await supabase.from('usage_logs').insert({
        user_id: user?.id,
        amount: proxies.length
      });

      await fetchTodayUsage();
    } catch (error) {
      console.error('Error marking proxies as used:', error);
    }
  };

  const downloadTXT = async () => {
    if (proxies.length === 0) return;

    try {
      const proxyText = proxies.map(p => p.proxy_string).join('\n');
      const blob = new Blob([proxyText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `proxies_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await markProxiesAsUsed();
      setProxies([]);
      toast.success('TXT file downloaded and IPs removed from database');
    } catch (error) {
      toast.error('Error downloading TXT file');
      console.error('Error downloading TXT:', error);
    }
  };

  const downloadExcel = async () => {
    if (proxies.length === 0) return;

    try {
      // Create CSV content (Excel compatible)
      const csvHeader = 'Proxy\n';
      const csvContent = proxies.map(p => p.proxy_string).join('\n');
      const csvData = csvHeader + csvContent;
      
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `proxies_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await markProxiesAsUsed();
      setProxies([]);
      toast.success('Excel file downloaded and IPs removed from database');
    } catch (error) {
      toast.error('Error downloading Excel file');
      console.error('Error downloading Excel:', error);
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
              <div className="flex items-center space-x-3">
                <button
                  onClick={downloadTXT}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  <FileText size={16} />
                  <span>Download TXT</span>
                </button>
                <button
                  onClick={downloadExcel}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <FileSpreadsheet size={16} />
                  <span>Download Excel</span>
                </button>
              </div>
            </div>
            
            {/* Single box containing all proxies */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="max-h-96 overflow-y-auto">
                <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap break-all">
                  {proxies.map(proxy => proxy.proxy_string).join('\n')}
                </pre>
              </div>
            </div>

            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-400 mr-2" />
                <p className="text-yellow-700 text-sm">
                  <strong>Warning:</strong> IPs will be deleted from the database after downloading. 
                  Make sure to download the IPs you need.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};