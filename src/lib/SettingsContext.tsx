import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
  isEasyMode: boolean;
  toggleEasyMode: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
  isEasyMode: true, // Default to true for accessibility first
  toggleEasyMode: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children?: ReactNode }) => {
  const [isEasyMode, setIsEasyMode] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('turmeiro_easy_mode');
    if (saved !== null) {
      setIsEasyMode(saved === 'true');
    }
  }, []);

  const toggleEasyMode = () => {
    setIsEasyMode(prev => {
      const newVal = !prev;
      localStorage.setItem('turmeiro_easy_mode', String(newVal));
      return newVal;
    });
  };

  return (
    <SettingsContext.Provider value={{ isEasyMode, toggleEasyMode }}>
      <div className={isEasyMode ? "easy-mode-active" : ""}>
        {children}
      </div>
    </SettingsContext.Provider>
  );
};