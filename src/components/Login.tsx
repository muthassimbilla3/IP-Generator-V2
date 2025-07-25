import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Key, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKey.trim()) return;

    setLoading(true);
    await login(accessKey.trim());
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
            <Key className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            IP Generator System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your access key to continue
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="access-key" className="sr-only">
              Access Key
            </label>
            <div className="relative">
              <input
                id="access-key"
                name="access-key"
                type="text"
                required
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your access key"
              />
              <Key className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !accessKey.trim()}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Demo Keys:</h3>
            <div className="text-xs space-y-1 text-gray-600">
              <div><strong>Admin:</strong> admin123</div>
              <div><strong>Manager:</strong> manager123</div>
              <div><strong>User:</strong> user1key, user2key, user3key</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};