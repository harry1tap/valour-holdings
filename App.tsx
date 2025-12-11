
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './types';
import { fetchUserProfile } from './services/solarService';
import { LoadingSpinner } from './components/LoadingSpinner';
import { BusinessProvider } from './contexts/BusinessContext';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('App: Initial session check:', session ? 'Session found' : 'No session');
      setSession(session);
      if (session?.user?.email) {
        loadUserProfile(session.user.email);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('App: Auth state change:', _event);
      setSession(session);
      if (session?.user?.email) {
        setLoading(true); // Show loading while fetching profile
        loadUserProfile(session.user.email);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (email: string) => {
    console.log('App: Fetching user profile for:', email);
    try {
      const profile = await fetchUserProfile(email);
      console.log('App: User profile loaded:', profile);
      
      if (profile) {
        setUserProfile(profile);
      } else {
        console.error('App: User profile not found in database');
        setAuthError("User profile not found in 'finances.users'. Contact Admin.");
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('App: Error loading user profile:', error);
      setAuthError("Error loading user profile.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Ensure BusinessProvider wraps everything to avoid context errors if hooks are used anywhere or during transitions
  return (
    <BusinessProvider>
      {!session ? (
        currentView === 'signup' ? (
          <Signup onNavigateToLogin={() => setCurrentView('login')} />
        ) : (
          <Login onNavigateToSignup={() => setCurrentView('signup')} />
        )
      ) : authError ? (
        <div className="min-h-screen bg-[#0a1628] flex items-center justify-center text-white">
          <div className="bg-red-900/20 border border-red-500 p-6 rounded-lg max-w-md text-center">
            <h2 className="text-xl font-bold mb-2 text-red-400">Authentication Error</h2>
            <p>{authError}</p>
            <p className="text-sm text-slate-400 mt-2">Check console for more details.</p>
            <button 
              onClick={() => { setAuthError(null); supabase.auth.signOut(); }}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-sm font-medium transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      ) : userProfile ? (
        <Dashboard user={userProfile} />
      ) : null}
    </BusinessProvider>
  );
};

export default App;
