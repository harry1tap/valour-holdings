import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Sun, AlertCircle } from 'lucide-react';

interface LoginProps {
  onNavigateToSignup: () => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigateToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log('1. Attempting login with:', email);

    try {
      // 1. Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('2. Auth response:', { data, error });

      if (error) {
        console.error('3. Auth error:', error.message);
        throw error;
      }

      console.log('4. Auth successful, verifying user profile access...');

      // 2. Debug: Manually fetch user profile to check for RLS or existence issues immediately
      // This mimics what App.tsx does, but gives us immediate feedback in the login context
      const { data: userData, error: userError } = await supabase
        .schema('finances')
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      console.log('5. User profile debug response:', { userData, userError });

      if (userError) {
        console.error('6. User profile error (Debug):', userError.message);
        // We don't throw here to let App.tsx's auth listener handle the state transition,
        // but this log helps diagnose if the profile is missing or RLS is blocking access.
      } else {
        console.log('7. User profile found. App.tsx should now redirect to Dashboard.');
      }

    } catch (err: any) {
      console.error('Login Exception:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1628] p-4">
      <div className="w-full max-w-md bg-[#0f172a] rounded-lg border border-[#1e3a5f] shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-500/10 p-3 rounded-full mb-4">
            <Sun className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Grantiau Cymru</h1>
          <p className="text-slate-400 mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            Don't have an account?{' '}
            <button
              onClick={onNavigateToSignup}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};