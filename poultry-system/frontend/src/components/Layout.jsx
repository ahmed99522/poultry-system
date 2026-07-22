import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

const NAV_ITEMS = [
  { to: '/', key: 'dashboard', roles: ['admin', 'distributor', 'weigher'], icon: 'grid' },
  { to: '/orders', key: 'orders', roles: ['admin', 'distributor'], icon: 'clipboard' },
  { to: '/weighing', key: 'weighing', roles: ['admin', 'weigher'], icon: 'scale' },
  { to: '/distribution', key: 'distribution', roles: ['admin', 'distributor'], icon: 'truck' },
  { to: '/invoices', key: 'invoices', roles: ['admin', 'distributor'], icon: 'receipt' },
  { to: '/customers', key: 'customers', roles: ['admin', 'distributor'], icon: 'users' },
  { to: '/products', key: 'products', roles: ['admin'], icon: 'box' },
  { to: '/users', key: 'users', roles: ['admin'], icon: 'shield' },
];

const ICONS = {
  grid: <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />,
  clipboard: <path d="M9 3h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V4a1 1 0 0 1 1-1Z" />,
  scale: <path d="M12 3v18M6 8h12M3 8l3 6a3 3 0 0 0 6 0l-3-6M15 8l3 6a3 3 0 0 0 6 0l-3-6" />,
  truck: <path d="M1 8h13v8H1zM14 11h4l3 3v2h-7zM5 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
  receipt: <path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z" />,
  users: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
  box: <path d="M21 8L12 3 3 8m18 0-9 5m9-5v9l-9 5m0-9L3 8m9 5v9M3 8v9l9 5" />,
  shield: <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5Z" />,
};

function Icon({ name }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      {/* الشريط الجانبي */}
      <aside
        className={`fixed inset-y-0 z-30 w-64 shrink-0 border-e border-ink-100 bg-white transition-transform lg:static lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'}`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-ink-100 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white font-bold">P</div>
          <span className="text-sm font-bold text-ink-900 leading-tight">{t('app_name')}</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  isActive ? 'bg-brand-600 text-white shadow-soft' : 'text-ink-600 hover:bg-ink-50'
                }`
              }
            >
              <Icon name={item.icon} />
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-ink-100 bg-white/80 px-4 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 hover:bg-ink-50 lg:hidden" onClick={() => setMobileOpen(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <div className="hidden sm:block" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="hidden text-end sm:block">
              <div className="text-sm font-semibold text-ink-900">{user.fullName}</div>
              <div className="text-xs text-ink-500">{t(`role_${user.role}`)}</div>
            </div>
            <button onClick={logout} className="btn-secondary !px-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
