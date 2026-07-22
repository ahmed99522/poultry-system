import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client.js';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const empty = { fullName: '', username: '', password: '', role: 'distributor' };

export default function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const load = () => client.get('/users').then((res) => setUsers(res.data.users));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(empty); setError(''); setModalOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/users', form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || t('error_generic'));
    }
  };

  const toggleActive = async (u) => {
    await client.patch(`/users/${u.id}`, { isActive: !u.is_active });
    load();
  };

  const submitReset = async (e) => {
    e.preventDefault();
    try {
      await client.post(`/users/${resetTarget.id}/reset-password`, { newPassword });
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      alert(err.response?.data?.error || t('error_generic'));
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink-900">{t('users')}</h1>
        <button className="btn-primary" onClick={openCreate}>+ {t('new_user')}</button>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">{t('full_name')}</th>
              <th className="th">{t('username')}</th>
              <th className="th">{t('role')}</th>
              <th className="th">{t('status')}</th>
              <th className="th">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="td font-semibold text-ink-900">{u.full_name}</td>
                <td className="td font-mono text-xs">{u.username}</td>
                <td className="td">{t(`role_${u.role}`)}</td>
                <td className="td"><StatusBadge status={u.is_active ? 'active' : 'inactive'} /></td>
                <td className="td">
                  <div className="flex gap-2">
                    <button className="btn-secondary !px-3 !py-1.5" onClick={() => toggleActive(u)}>
                      {u.is_active ? t('inactive') : t('active')}
                    </button>
                    <button className="btn-secondary !px-3 !py-1.5" onClick={() => setResetTarget(u)}>{t('reset_password')}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('new_user')}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">{t('full_name')}</label>
            <input className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('username')}</label>
            <input className="input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('password')}</label>
            <input className="input" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('role')}</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">{t('role_admin')}</option>
              <option value="distributor">{t('role_distributor')}</option>
              <option value="weigher">{t('role_weigher')}</option>
            </select>
          </div>
          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{t('save')}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={t('reset_password')}>
        <form onSubmit={submitReset} className="space-y-4">
          <div>
            <label className="label">{t('new_password')}</label>
            <input className="input" type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setResetTarget(null)}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{t('save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
