'use client';

import { useTheme } from '@/components/theme/ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
  const label = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻';

  return (
    <button
      className="btn-secondary px-3 py-2"
      onClick={() => setTheme(next)}
      title={`Theme: ${theme} (click for ${next})`}
      aria-label="Toggle theme"
    >
      <span aria-hidden>{label}</span>
    </button>
  );
}
