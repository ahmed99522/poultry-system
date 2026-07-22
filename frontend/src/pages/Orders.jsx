import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client.js';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const empty = { customerId: '', productId: '', requestedQty: '', notes: '' };

export default function Orders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  const load = () => client.get('/orders').then((res) => setOrders(res.data.orders));

  useEffect(() => {
    load();
    client.get('/customers').then((res) => setCustomers(res.data.customers));
    client.get('/products').then((res) => setProducts(res.data.products));
  }, []);

  const openCreate = () => { setForm(empty); setError(''); setModalOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/orders', form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || t('error_generic'));
    }
  };

  const closeOrder = async (id) => {
    try {
      await client.post(`/orders/${id}/close`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || t('error_generic'));
    }
  };

  const cancelOrder = async (id) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await client.post(`/orders/${id}/cancel`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || t('error_generic'));
    }
  };

  const viewDetail = async (id) => {
    const res = await client.get(`/orders/${id}`);
    setDetail(res.data);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink-900">{t('orders')}</h1>
        <button className="btn-primary" onClick={openCreate}>+ {t('new_order')}</button>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">{t('order_number')}</th>
              <th className="th">{t('customer')}</th>
              <th className="th">{t('product')}</th>
              <th className="th">{t('requested_qty')}</th>
              <th className="th">{t('status')}</th>
              <th className="th">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="td font-mono text-xs font-semibold text-ink-900">{o.order_number}</td>
                <td className="td">{o.customer_name}</td>
                <td className="td">{o.product_name}</td>
                <td className="td">{o.requested_qty}</td>
                <td className="td"><StatusBadge status={o.status} /></td>
                <td className="td">
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary !px-3 !py-1.5" onClick={() => viewDetail(o.id)}>{t('view')}</button>
                    {o.status === 'open' && (
                      <button className="btn-primary !px-3 !py-1.5" onClick={() => closeOrder(o.id)}>{t('close_order')}</button>
                    )}
                    {!['completed', 'cancelled'].includes(o.status) && (
                      <button className="btn-danger !px-3 !py-1.5" onClick={() => cancelOrder(o.id)}>{t('cancel_order')}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="td text-center text-ink-400 py-10">{t('no_data')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('new_order')}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">{t('customer')}</label>
            <select className="input" required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">{t('select_customer')}</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('product')}</label>
            <select className="input" required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
              <option value="">{t('select_product')}</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('requested_qty')}</label>
            <input className="input" type="number" min="1" required value={form.requestedQty} onChange={(e) => setForm({ ...form, requestedQty: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('notes')}</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{t('save')}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.order?.order_number}>
        {detail && (
          <div>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-ink-500">{t('customer')}: </span><strong>{detail.order.customer_name}</strong></div>
              <div><span className="text-ink-500">{t('product')}: </span><strong>{detail.order.product_name}</strong></div>
              <div><span className="text-ink-500">{t('status')}: </span><StatusBadge status={detail.order.status} /></div>
              <div><span className="text-ink-500">{t('requested_qty')}: </span><strong>{detail.order.requested_qty}</strong></div>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-ink-100">
              <table className="w-full text-sm">
                <thead>
                  <tr><th className="th">{t('bird_code')}</th><th className="th">{t('weight_kg')}</th><th className="th">{t('total_price')}</th><th className="th">{t('status')}</th></tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {detail.birds.map((b) => (
                    <tr key={b.id}>
                      <td className="td font-mono text-xs">{b.bird_code}</td>
                      <td className="td">{b.weight_kg ?? '—'}</td>
                      <td className="td">{b.total_price ?? '—'}</td>
                      <td className="td"><StatusBadge status={b.status} /></td>
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
