import { useTranslation } from 'react-i18next';
import { applyDirection } from '../i18n/index.js';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggle = () => {
    const next = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
    applyDirection(next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 shadow-soft hover:bg-ink-50 transition"
      title="Change language / تغيير اللغة"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
      </svg>
      {i18n.language === 'ar' ? 'English' : 'العربية'}
    </button>
  );
}
