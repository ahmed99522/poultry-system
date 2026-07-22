import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client.js';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const empty = { name: '', unit: 'kg', pricePerKg: '' };

export default function Products() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const load = () => client.get('/products').then((res) => setProducts(res.data.products));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setModalOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, unit: p.unit, pricePerKg: p.price_per_kg }); setError(''); setModalOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await client.put(`/products/${editing.id}`, form);
      else await client.post('/products', form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || t('error_generic'));
    }
  };

  const toggle = async (p) => {
    await client.patch(`/products/${p.id}/toggle`);
    load();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink-900">{t('products')}</h1>
        <button className="btn-primary" onClick={openCreate}>+ {t('new_product')}</button>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">{t('product')}</th>
              <th className="th">{t('unit')}</th>
              <th className="th">{t('price_per_kg')}</th>
              <th className="th">{t('status')}</th>
              <th className="th">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="td font-semibold text-ink-900">{p.name}</td>
                <td className="td">{p.unit}</td>
                <td className="td">{p.price_per_kg}</td>
                <td className="td"><StatusBadge status={p.is_active ? 'active' : 'inactive'} /></td>
                <td className="td">
                  <div className="flex gap-2">
                    <button className="btn-secondary !px-3 !py-1.5" onClick={() => openEdit(p)}>{t('edit')}</button>
                    <button className="btn-secondary !px-3 !py-1.5" onClick={() => toggle(p)}>
                      {p.is_active ? t('inactive') : t('active')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={5} className="td text-center text-ink-400 py-10">{t('no_data')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('edit') : t('new_product')}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">{t('product')}</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('unit')}</label>
            <input className="input" required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('price_per_kg')}</label>
            <input className="input" type="number" step="0.01" min="0" required value={form.pricePerKg} onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })} />
          </div>
          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{t('save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
