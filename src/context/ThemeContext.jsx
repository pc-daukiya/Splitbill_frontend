import { createContext, useContext, useEffect, useState } from 'react';

const THEMES = ['lavender', 'minty', 'midnight'];

const ThemeContext = createContext({ theme: 'lavender', cycleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('sb-theme') || 'lavender',
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sb-theme', theme);
  }, [theme]);

  const cycleTheme = () =>
    setTheme((t) => {
      const idx = THEMES.indexOf(t);
      return THEMES[(idx + 1) % THEMES.length];
    });

  return (
    <ThemeContext.Provider value={{ theme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
