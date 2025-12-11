
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { RefreshCw, LogOut, Sun, Home } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { FieldRepsView } from './FieldRepsView';
import { CompanyKPIsView } from './CompanyKPIsView';
import { AccountManagerView } from './AccountManagerView';
import { useBusiness } from '../contexts/BusinessContext';

interface DashboardProps {
  user: UserProfile;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = () => setRefreshKey(prev => prev + 1);
  const { business, setBusiness } = useBusiness();

  const isAdmin = user.role === 'admin';
  const isAccountManager = user.role === 'account_manager';

  return (
    <div className="min-h-screen bg-[#0a1628] pb-10">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-[#1e3a5f] sticky top-0 z-30">
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Sun className="w-8 h-8 text-blue-500" />
                <span className="text-xl font-bold text-white tracking-tight hidden md:block">Grantiau Cymru</span>
              </div>
              
              {/* Business Toggle */}
              <div className="bg-[#1e293b] p-1 rounded-lg flex items-center">
                 <button
                   onClick={() => setBusiness('solar')}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                     business === 'solar' 
                       ? 'bg-blue-600 text-white shadow' 
                       : 'text-slate-400 hover:text-white'
                   }`}
                 >
                   <Sun className="w-4 h-4" />
                   Solar
                 </button>
                 <button
                   onClick={() => setBusiness('eco4')}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                     business === 'eco4' 
                       ? 'bg-emerald-600 text-white shadow' 
                       : 'text-slate-400 hover:text-white'
                   }`}
                 >
                   <Home className="w-4 h-4" />
                   ECO4
                 </button>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-white">{user.name}</span>
                <span className={`text-xs uppercase tracking-wide font-semibold ${
                  isAccountManager ? 'text-purple-400' : 'text-blue-400'
                }`}>
                  {user.role.replace('_', ' ')}
                </span>
              </div>
              
              <div className="h-6 w-px bg-[#1e3a5f]"></div>

              <div className="flex items-center gap-2">
                 <button onClick={handleRefresh} className="p-2 text-slate-400 hover:text-white transition-colors" title="Refresh Data">
                   <RefreshCw className="w-5 h-5" />
                 </button>
                 <button 
                  onClick={() => supabase.auth.signOut()} 
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors" 
                  title="Logout"
                >
                   <LogOut className="w-5 h-5" />
                 </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-6 lg:px-8 py-8">
        {isAdmin ? (
          <CompanyKPIsView key={`company-kpis-${business}-${refreshKey}`} user={user} />
        ) : isAccountManager ? (
          <AccountManagerView key={`am-view-${business}-${refreshKey}`} user={user} />
        ) : (
          <FieldRepsView key={`field-reps-${business}-${refreshKey}`} user={user} selectedRep="" />
        )}
      </main>
    </div>
  );
};
