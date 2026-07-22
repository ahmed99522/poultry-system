import { useTranslation } from 'react-i18next';

const COLORS = {
  open: 'bg-blue-50 text-blue-700',
  closed: 'bg-amber-50 text-amber-700',
  weighed: 'bg-purple-50 text-purple-700',
  distributing: 'bg-cyan-50 text-cyan-700',
  completed: 'bg-brand-50 text-brand-700',
  cancelled: 'bg-red-50 text-red-700',
  pending: 'bg-ink-100 text-ink-600',
  distributed: 'bg-cyan-50 text-cyan-700',
  invoiced: 'bg-brand-50 text-brand-700',
  paid: 'bg-brand-50 text-brand-700',
  unpaid: 'bg-amber-50 text-amber-700',
  active: 'bg-brand-50 text-brand-700',
  inactive: 'bg-ink-100 text-ink-500',
};

export default function StatusBadge({ status }) {
  const { t } = useTranslation();
  const color = COLORS[status] || 'bg-ink-100 text-ink-600';
  return <span className={`badge ${color}`}>{t(status)}</span>;
}
