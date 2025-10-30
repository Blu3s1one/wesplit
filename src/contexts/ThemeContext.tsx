import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';
type ColorTheme = 'basic' | 'blue' | 'red' | 'green' | 'purple';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  setColorTheme: (theme: ColorTheme) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme-mode');
    return (stored as ThemeMode) || 'light';
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>('basic');

  useEffect(() => {
    const root = document.documentElement;

    // Apply dark mode class
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply color theme class
    root.classList.remove('theme-basic', 'theme-blue', 'theme-red', 'theme-green', 'theme-purple');
    root.classList.add(`theme-${colorTheme}`);

    // Store mode preference only
    localStorage.setItem('theme-mode', mode);
  }, [mode, colorTheme]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
  };

  const toggleMode = () => {
    setModeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode, setColorTheme, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
