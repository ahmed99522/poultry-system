import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function StatCard({ label, value, color }) {
  return (
    <div className="card !p-5">
      <div className="text-sm font-medium text-ink-500">{label}</div>
      <div className={`mt-2 text-3xl font-extrabold ${color || 'text-ink-900'}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    client.get('/dashboard/stats').then((res) => setStats(res.data));
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-ink-900">
        {t('welcome_back')}, {user.fullName}
      </h1>
      <p className="mb-6 text-ink-500">{t(`role_${user.role}`)}</p>

      {!stats ? (
        <div className="text-ink-400">{t('loading')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t('open_orders')} value={stats.openOrders} color="text-blue-600" />
          <StatCard label={t('pending_weighing')} value={stats.pendingWeighing} color="text-purple-600" />
          <StatCard label={t('ready_to_distribute')} value={stats.readyToDistribute} color="text-cyan-600" />
          <StatCard label={t('distributed_not_invoiced')} value={stats.distributedNotInvoiced} color="text-amber-600" />
          <StatCard label={t('total_customers')} value={stats.totalCustomers} />
          <StatCard label={t('unpaid_invoices')} value={stats.unpaidInvoicesCount} color="text-red-600" />
          <StatCard label={t('unpaid_invoices') + ' (' + t('total_amount') + ')'} value={stats.unpaidInvoicesTotal.toLocaleString()} color="text-red-600" />
          <StatCard label={t('today_revenue')} value={stats.todayRevenue.toLocaleString()} color="text-brand-600" />
        </div>
      )}
    </div>
  );
}
