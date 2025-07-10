import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, UploadHistory, User } from '../lib/supabase';
import { Upload, Trash2, Users, Settings, Plus, Minus, Edit2, Key, RotateCcw, Database } from 'lucide-react';
import toast from 'react-hot-toast';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<'prepend' | 'append'>('append');
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    accessKey: '',
    role: 'user' as 'admin' | 'manager' | 'user',
    dailyLimit: 500
  });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    accessKey: '',
    dailyLimit: 0
  });
  const [totalProxies, setTotalProxies] = useState(0);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUploadHistory();
      fetchUsers();
      fetchProxyCount();
    }
  }, [user]);

  const fetchUploadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('upload_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUploadHistory(data || []);
    } catch (error) {
      console.error('Error fetching upload history:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProxyCount = async () => {
    try {
      const { count, error } = await supabase
        .from('proxies')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setTotalProxies(count || 0);
    } catch (error) {
      console.error('Error fetching proxy count:', error);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setLoading(true);
    try {
      const text = await file.text();
      const proxies = text.split('\n').filter(line => line.trim());

      if (proxies.length === 0) {
        toast.error('ফাইলে কোনো বৈধ প্রক্সি নেই');
        setLoading(false);
        return;
      }

      // Insert proxies at the end (append)
      for (const proxy of proxies) {
        await supabase.from('proxies').insert({
          proxy_string: proxy.trim()
        });
      }

      // Record upload history
      await supabase.from('upload_history').insert({
        uploaded_by: user.id,
        file_name: file.name,
        proxy_count: proxies.length,
        position: 'append'
      });

      toast.success(`🎉 সফলভাবে ${proxies.length}টি প্রক্সি আপলোড সম্পন্ন হয়েছে!`);
      setFile(null);
      fetchUploadHistory();
      fetchProxyCount();
    } catch (error) {
      toast.error('❌ আপলোড করতে ত্রুটি হয়েছে');
      console.error('Error uploading file:', error);
    }
    setLoading(false);
  };

  const deleteUploadHistory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('upload_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('আপলোড ইতিহাস মুছে ফেলা হয়েছে');
      fetchUploadHistory();
    } catch (error) {
      toast.error('মুছতে ত্রুটি');
      console.error('Error deleting upload history:', error);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.accessKey) return;

    try {
      const { error } = await supabase.from('users').insert({
        username: newUser.username,
        access_key: newUser.accessKey,
        role: newUser.role,
        daily_limit: newUser.dailyLimit
      });

      if (error) throw error;

      toast.success('নতুন ইউজার তৈরি হয়েছে');
      setNewUser({
        username: '',
        accessKey: '',
        role: 'user',
        dailyLimit: 500
      });
      fetchUsers();
    } catch (error) {
      toast.error('ইউজার তৈরি করতে ত্রুটি');
      console.error('Error creating user:', error);
    }
  };

  const updateUserLimit = async (userId: string, newLimit: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ daily_limit: newLimit })
        .eq('id', userId);

      if (error) throw error;

      toast.success('ইউজারের সীমা আপডেট হয়েছে');
      fetchUsers();
    } catch (error) {
      toast.error('সীমা আপডেট করতে ত্রুটি');
      console.error('Error updating user limit:', error);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success('ইউজারের স্ট্যাটাস আপডেট হয়েছে');
      fetchUsers();
    } catch (error) {
      toast.error('স্ট্যাটাস আপডেট করতে ত্রুটি');
      console.error('Error updating user status:', error);
    }
  };

  const startEditUser = (userData: User) => {
    setEditingUser(userData.id);
    setEditForm({
      username: userData.username,
      accessKey: userData.access_key,
      dailyLimit: userData.daily_limit
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({
      username: '',
      accessKey: '',
      dailyLimit: 0
    });
  };

  const saveUserEdit = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          username: editForm.username,
          access_key: editForm.accessKey,
          daily_limit: editForm.dailyLimit
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      toast.error('Error updating user');
      console.error('Error updating user:', error);
    }
  };

  const generateNewAccessKey = async (userId: string) => {
    try {
      const newKey = `key_${Math.random().toString(36).substring(2, 15)}`;
      
      const { error } = await supabase
        .from('users')
        .update({ access_key: newKey })
        .eq('id', userId);

      if (error) throw error;

      toast.success('New access key generated');
      fetchUsers();
    } catch (error) {
      toast.error('Error generating new access key');
      console.error('Error generating access key:', error);
    }
  };

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Error deleting user');
      console.error('Error deleting user:', error);
    }
  };

  const deleteAllProxies = async () => {
    if (!confirm(`আপনি কি নিশ্চিত যে ডাটাবেস থেকে সব ${totalProxies}টি প্রক্সি মুছে ফেলতে চান? এই কাজটি আর ফিরিয়ে আনা যাবে না।`)) {
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
      fetchProxyCount();
    } catch (error) {
      toast.error('❌ প্রক্সি মুছতে ত্রুটি হয়েছে');
      console.error('Error deleting all proxies:', error);
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">শুধুমাত্র অ্যাডমিন এবং ম্যানেজার এই পেজ দেখতে পারে</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {user?.role === 'admin' ? 'Admin Panel' : 'Manager Panel'}
        </h1>

        {/* Proxy Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              প্রক্সি ম্যানেজমেন্ট
            </h2>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                মোট প্রক্সি: <span className="font-semibold text-blue-600">{totalProxies}</span>
              </div>
              {totalProxies > 0 && (
                <button
                  onClick={deleteAllProxies}
                  className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105 text-sm font-medium shadow-lg hover:shadow-xl"
                >
                  <Database size={16} />
                  <span>সব প্রক্সি মুছুন</span>
                </button>
              )}
            </div>
          </div>
          
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                TXT ফাইল নির্বাচন করুন
              </label>
              <input
                type="file"
                id="file"
                accept=".txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            
            <button
              type="submit"
              disabled={!file || loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center space-x-3 font-medium"
            >
              {loading ? (
                <>
                  <div className="relative">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-5 h-5 border-2 border-transparent border-t-blue-200 rounded-full animate-ping"></div>
                  </div>
                  <span className="animate-pulse">আপলোড শেষ না হওয়া পর্যন্ত অপেক্ষা করুন...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>আপলোড করুন</span>
                </>
              )}
            </button>
          </form>
          
          {totalProxies > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center">
                <Database className="h-4 w-4 text-blue-400 mr-2" />
                <p className="text-blue-700 text-sm">
                  <strong>ডাটাবেস স্ট্যাটাস:</strong> সিস্টেমে {totalProxies}টি প্রক্সি উপলব্ধ রয়েছে।
                </p>
              </div>
            </div>
          )}
        </div>

        {/* User Management Section - Only for Admin */}
        {user?.role === 'admin' && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="mr-2 h-5 w-5" />
            ইউজার ম্যানেজমেন্ট
          </h2>
          
          {/* Create New User */}
          <form onSubmit={createUser} className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-md font-medium text-gray-800 mb-3">নতুন ইউজার তৈরি করুন</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="ইউজারনেম"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="এক্সেস কী"
                value={newUser.accessKey}
                onChange={(e) => setNewUser({...newUser, accessKey: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value as 'admin' | 'manager' | 'user'})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">ইউজার</option>
                <option value="manager">ম্যানেজার</option>
                <option value="admin">অ্যাডমিন</option>
              </select>
              <input
                type="number"
                placeholder="দৈনিক সীমা"
                value={newUser.dailyLimit}
                onChange={(e) => setNewUser({...newUser, dailyLimit: parseInt(e.target.value)})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="mt-3 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              ইউজার তৈরি করুন
            </button>
          </form>

          {/* Users List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ফাইলের নাম
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    এক্সেস কী
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    প্রক্সি সংখ্যা
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    পজিশন
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    তারিখ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    অ্যাকশন
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userData) => (
                  <tr key={userData.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {editingUser === userData.id ? (
                        <input
                          type="text"
                          value={editForm.username}
                          onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                        />
                      ) : (
                        userData.username
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingUser === userData.id ? (
                        <input
                          type="text"
                          value={editForm.accessKey}
                          onChange={(e) => setEditForm({...editForm, accessKey: e.target.value})}
                          className="px-2 py-1 border border-gray-300 rounded text-xs w-full font-mono"
                        />
                      ) : (
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {userData.access_key}
                        </code>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userData.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : userData.role === 'manager'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {userData.role === 'admin' ? 'অ্যাডমিন' : userData.role === 'manager' ? 'ম্যানেজার' : 'ইউজার'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingUser === userData.id ? (
                        <input
                          type="number"
                          value={editForm.dailyLimit}
                          onChange={(e) => setEditForm({...editForm, dailyLimit: parseInt(e.target.value)})}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-20"
                        />
                      ) : (
                        userData.daily_limit
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => toggleUserStatus(userData.id, userData.is_active)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          userData.is_active 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {userData.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingUser === userData.id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => saveUserEdit(userData.id)}
                            className="text-green-600 hover:text-green-800"
                            title="Save changes"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-gray-600 hover:text-gray-800"
                            title="Cancel"
                          >
                            <Minus size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => startEditUser(userData)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit user"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => generateNewAccessKey(userData.id)}
                            className="text-purple-600 hover:text-purple-800"
                            title="Generate new access key"
                          >
                            <RotateCcw size={16} />
                          </button>
                          {userData.role !== 'admin' && (
                            <button
                              onClick={() => deleteUser(userData.id, userData.username)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete user"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Upload History Section - Only for Admin */}
        {user?.role === 'admin' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">আপলোড ইতিহাস</h2>
          
          {uploadHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">কোনো আপলোড ইতিহাস নেই</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proxy Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uploadHistory.map((history) => (
                    <tr key={history.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {history.file_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {history.proxy_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          history.position === 'prepend' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {history.position === 'prepend' ? 'Prepend' : 'Append'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(history.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => deleteUploadHistory(history.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};