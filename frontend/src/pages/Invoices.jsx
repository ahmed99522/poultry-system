import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client.js';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Invoices() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orderId, setOrderId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  const load = () => client.get('/invoices').then((res) => setInvoices(res.data.invoices));

  useEffect(() => {
    load();
    client.get('/orders').then((res) => setOrders(res.data.orders));
    client.get('/customers').then((res) => setCustomers(res.data.customers));
  }, []);

  const generate = async (e) => {
    e.preventDefault();
    setError('');
    if (!orderId || !customerId) return;
    try {
      await client.post(`/invoices/generate/${orderId}/${customerId}`);
      setOrderId('');
      setCustomerId('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || t('error_generic'));
    }
  };

  const markPaid = async (id) => {
    await client.patch(`/invoices/${id}/mark-paid`);
    load();
  };

  const viewDetail = async (id) => {
    const res = await client.get(`/invoices/${id}`);
    setDetail(res.data);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{t('invoices')}</h1>

      <div className="card mb-6">
        <h3 className="mb-4 font-bold text-ink-900">{t('generate_invoice')}</h3>
        <form onSubmit={generate} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="label">{t('order_number')}</label>
            <select className="input" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">{t('order_number')}</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.order_number} — {o.customer_name}</option>)}
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="label">{t('customer')}</label>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">{t('select_customer')}</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary">{t('generate_invoice')}</button>
        </form>
        {error && <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">{t('invoice_number')}</th>
              <th className="th">{t('customer')}</th>
              <th className="th">{t('order_number')}</th>
              <th className="th">{t('total_birds')}</th>
              <th className="th">{t('total_weight')}</th>
              <th className="th">{t('total_amount')}</th>
              <th className="th">{t('status')}</th>
              <th className="th">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="td font-mono text-xs font-semibold">{inv.invoice_number}</td>
                <td className="td">{inv.customer_name}</td>
                <td className="td">{inv.order_number}</td>
                <td className="td">{inv.total_birds}</td>
                <td className="td">{inv.total_weight}</td>
                <td className="td font-bold">{inv.total_amount}</td>
                <td className="td"><StatusBadge status={inv.status} /></td>
                <td className="td">
                  <div className="flex gap-2">
                    <button className="btn-secondary !px-3 !py-1.5" onClick={() => viewDetail(inv.id)}>{t('view')}</button>
                    {inv.status === 'unpaid' && (
                      <button className="btn-primary !px-3 !py-1.5" onClick={() => markPaid(inv.id)}>{t('mark_paid')}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={8} className="td text-center text-ink-400 py-10">{t('no_data')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.invoice?.invoice_number}>
        {detail && (
          <div>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-ink-500">{t('customer')}: </span><strong>{detail.invoice.customer_name}</strong></div>
              <div><span className="text-ink-500">{t('phone')}: </span><strong>{detail.invoice.phone || '—'}</strong></div>
              <div><span className="text-ink-500">{t('total_birds')}: </span><strong>{detail.invoice.total_birds}</strong></div>
              <div><span className="text-ink-500">{t('total_weight')}: </span><strong>{detail.invoice.total_weight}</strong></div>
              <div className="col-span-2 text-lg"><span className="text-ink-500">{t('total_amount')}: </span><strong className="text-brand-600">{detail.invoice.total_amount}</strong></div>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-ink-100">
              <table className="w-full text-sm">
                <thead><tr><th className="th">{t('bird_code')}</th><th className="th">{t('weight_kg')}</th><th className="th">{t('total_price')}</th></tr></thead>
                <tbody className="divide-y divide-ink-100">
                  {detail.birds.map((b, i) => (
                    <tr key={i}>
                      <td className="td font-mono text-xs">{b.bird_code}</td>
                      <td className="td">{b.weight_kg}</td>
                      <td className="td">{b.total_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
