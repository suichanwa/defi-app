import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type NavVisibilityContextValue = {
  isNavHidden: boolean;
  setNavHidden: (hidden: boolean) => void;
};

const NavVisibilityContext = createContext<NavVisibilityContextValue | null>(null);

export function NavVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [isNavHidden, setIsNavHidden] = useState(false);

  const setNavHidden = useCallback((hidden: boolean) => {
    setIsNavHidden(hidden);
  }, []);

  const value = useMemo(
    () => ({
      isNavHidden,
      setNavHidden,
    }),
    [isNavHidden, setNavHidden],
  );

  return <NavVisibilityContext.Provider value={value}>{children}</NavVisibilityContext.Provider>;
}

export const useNavVisibility = () => {
  const context = useContext(NavVisibilityContext);
  if (!context) {
    throw new Error('useNavVisibility must be used within NavVisibilityProvider');
  }
  return context;
};
