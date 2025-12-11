
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type BusinessType = 'solar' | 'eco4';

interface BusinessContextType {
  business: BusinessType;
  setBusiness: (business: BusinessType) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [business, setBusiness] = useState<BusinessType>(() => {
    const saved = localStorage.getItem('active_business');
    return (saved === 'solar' || saved === 'eco4') ? saved : 'solar';
  });

  useEffect(() => {
    localStorage.setItem('active_business', business);
  }, [business]);

  const value = React.useMemo(() => ({ business, setBusiness }), [business]);

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
