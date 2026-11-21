import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ variant = 'segmented', showLabels = true }) {
  const { theme, setTheme, toggleTheme } = useTheme();

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className="theme-toggle-btn"
        aria-label="Toggle color theme"
      >
        {theme === 'dark' ? (
          <Sun size={18} className="theme-icon-sun" />
        ) : (
          <Moon size={18} className="theme-icon-moon" />
        )}
      </button>
    );
  }

  // Segmented control showing both Light and Dark options side-by-side
  return (
    <div className="theme-toggle-segmented" role="radiogroup" aria-label="Theme selection">
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        className={`theme-segment ${theme === 'light' ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        title="Light Mode"
      >
        <Sun size={15} />
        {showLabels && <span>Light</span>}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        className={`theme-segment ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        title="Dark Mode"
      >
        <Moon size={15} />
        {showLabels && <span>Dark</span>}
      </button>
    </div>
  );
}
