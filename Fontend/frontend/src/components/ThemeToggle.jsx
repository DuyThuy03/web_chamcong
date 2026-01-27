import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="
        relative p-2 rounded-full transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]
        hover:bg-[var(--bg-primary)]
        border border-[var(--border-color)]
        bg-[var(--bg-secondary)]
      "
      aria-label="Toggle Dark Mode"
    >
      <div className="relative w-6 h-6">
        <Sun 
          className={`absolute inset-0 w-full h-full text-yellow-500 transition-all duration-300 transform ${theme === 'dark' ? 'rotate-90 opacity-0 scale-50' : 'rotate-0 opacity-100 scale-100'}`} 
        />
        <Moon 
          className={`absolute inset-0 w-full h-full text-[var(--accent-color)] transition-all duration-300 transform ${theme === 'light' ? '-rotate-90 opacity-0 scale-50' : 'rotate-0 opacity-100 scale-100'}`} 
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
