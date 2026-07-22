import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const empty = { name: '', phone: '', address: '', notes: '' };

export default function Customers() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const load = () => {
    client.get('/customers', { params: { search } }).then((res) => setCustomers(res.data.customers));
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || '', address: c.address || '', notes: c.notes || '' });
    setError('');
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await client.put(`/customers/${editing.id}`, form);
      } else {
        await client.post('/customers', form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || t('error_generic'));
    }
  };

  const remove = async (id) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await client.delete(`/customers/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || t('error_generic'));
    }
  };

  const canManage = ['admin', 'distributor'].includes(user.role);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink-900">{t('customers')}</h1>
        {canManage && (
          <button className="btn-primary" onClick={openCreate}>
            + {t('new_customer')}
          </button>
        )}
      </div>

      <div className="mb-4">
        <input className="input max-w-sm" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">{t('full_name')}</th>
              <th className="th">{t('phone')}</th>
              <th className="th">{t('address')}</th>
              {canManage && <th className="th">{t('actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="td font-semibold text-ink-900">{c.name}</td>
                <td className="td">{c.phone || '—'}</td>
                <td className="td max-w-xs truncate">{c.address || '—'}</td>
                {canManage && (
                  <td className="td">
                    <div className="flex gap-2">
                      <button className="btn-secondary !px-3 !py-1.5" onClick={() => openEdit(c)}>{t('edit')}</button>
                      {user.role === 'admin' && (
                        <button className="btn-danger !px-3 !py-1.5" onClick={() => remove(c.id)}>{t('delete')}</button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={4} className="td text-center text-ink-400 py-10">{t('no_data')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('edit') : t('new_customer')}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">{t('full_name')}</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('phone')}</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('address')}</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
    </div>
  );
}
