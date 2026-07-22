import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client.js';
import Modal from '../components/Modal.jsx';

export default function Distribution() {
  const { t } = useTranslation();
  const [birds, setBirds] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [assigning, setAssigning] = useState(null);
  const [targetCustomerId, setTargetCustomerId] = useState('');

  const load = () => client.get('/distribution/weighed').then((res) => setBirds(res.data.birds));

  useEffect(() => {
    load();
    client.get('/customers').then((res) => setCustomers(res.data.customers));
  }, []);

  const openAssign = (bird) => {
    setAssigning(bird);
    setTargetCustomerId('');
  };

  const confirmAssign = async (useOriginal) => {
    try {
      const payload = useOriginal ? {} : { targetCustomerId };
      await client.post(`/distribution/${assigning.id}/assign`, payload);
      setAssigning(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || t('error_generic'));
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{t('distribution')}</h1>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">{t('bird_code')}</th>
              <th className="th">{t('order_number')}</th>
              <th className="th">{t('customer')}</th>
              <th className="th">{t('weight_kg')}</th>
              <th className="th">{t('total_price')}</th>
              <th className="th">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {birds.map((b) => (
              <tr key={b.id}>
                <td className="td font-mono text-xs font-semibold">{b.bird_code}</td>
                <td className="td">{b.order_number}</td>
                <td className="td">{b.customer_name}</td>
                <td className="td">{b.weight_kg}</td>
                <td className="td">{b.total_price}</td>
                <td className="td">
                  <button className="btn-primary !px-3 !py-1.5" onClick={() => openAssign(b)}>{t('assign')}</button>
                </td>
              </tr>
            ))}
            {birds.length === 0 && (
              <tr><td colSpan={6} className="td text-center text-ink-400 py-10">{t('no_data')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!assigning} onClose={() => setAssigning(null)} title={t('assign_to_customer')}>
        {assigning && (
          <div className="space-y-4">
            <div className="text-sm text-ink-600">
              {t('bird_code')}: <span className="font-mono font-semibold">{assigning.bird_code}</span> —
              {' '}{t('customer')}: <strong>{assigning.customer_name}</strong>
            </div>
            <button className="btn-secondary w-full" onClick={() => confirmAssign(true)}>
              {t('assign')} → {assigning.customer_name} ({t('order_number')})
            </button>

            <div className="relative py-2 text-center text-xs text-ink-400">
              <span className="bg-white px-2">أو / or</span>
            </div>

            <div>
              <label className="label">{t('select_customer')}</label>
              <select className="input" value={targetCustomerId} onChange={(e) => setTargetCustomerId(e.target.value)}>
                <option value="">{t('select_customer')}</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button className="btn-primary w-full" disabled={!targetCustomerId} onClick={() => confirmAssign(false)}>
              {t('assign')}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
