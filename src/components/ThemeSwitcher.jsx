import { useTheme } from '../context/ThemeContext';

const THEME_META = {
  lavender: { label: 'Lavender', dot: '#8B5CF6', nextLabel: 'Minty Teal'  },
  minty:    { label: 'Minty Teal', dot: '#0F766E', nextLabel: 'Midnight'   },
  midnight: { label: 'Midnight',  dot: '#38BDF8', nextLabel: 'Lavender'   },
};

function ThemeSwitcher() {
  const { theme, cycleTheme } = useTheme();
  const { label, dot, nextLabel } = THEME_META[theme] ?? THEME_META.lavender;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={`Switch to ${nextLabel}`}
      className="flex items-center gap-1.5 rounded-none border border-theme-border bg-theme-surface px-2.5 py-1 text-xs font-semibold text-theme-text transition-opacity hover:opacity-70"
    >
      <span
        className="inline-block h-2.5 w-2.5 shrink-0"
        style={{ backgroundColor: dot, borderRadius: 0 }}
      />
      {label}
    </button>
  );
}

export default ThemeSwitcher;
