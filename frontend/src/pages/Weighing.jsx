import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client.js';

export default function Weighing() {
  const { t } = useTranslation();
  const [birds, setBirds] = useState([]);
  const [weight, setWeight] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const load = () => client.get('/weights/pending').then((res) => setBirds(res.data.birds));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [birds]);

  const current = birds[0];

  const submit = async (e) => {
    e.preventDefault();
    if (!current || !weight) return;
    setError('');
    try {
      const res = await client.post(`/weights/${current.id}`, { weightKg: weight });
      setLastResult({ code: res.data.birdCode, total: res.data.totalPrice, weight });
      setWeight('');
      setBirds((prev) => prev.slice(1));
      setTimeout(load, 300);
    } catch (err) {
      setError(err.response?.data?.error || t('error_generic'));
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{t('weighing')}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          {current ? (
            <>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase text-ink-400">{t('bird_code')}</div>
                  <div className="font-mono text-lg font-bold text-ink-900">{current.bird_code}</div>
                </div>
                <div className="text-end">
                  <div className="text-xs font-semibold uppercase text-ink-400">{t('order_number')}</div>
                  <div className="font-semibold text-ink-700">{current.order_number}</div>
                </div>
              </div>
              <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-ink-500">{t('customer')}: </span><strong>{current.customer_name}</strong></div>
                <div><span className="text-ink-500">{t('product')}: </span><strong>{current.product_name}</strong></div>
              </div>
              <form onSubmit={submit}>
                <label className="label">{t('enter_weight')}</label>
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="number"
                    step="0.001"
                    min="0.01"
                    className="input !text-2xl !font-bold text-center"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="btn-primary !px-8">{t('submit')}</button>
                </div>
              </form>
              {error && <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            </>
          ) : (
            <div className="py-16 text-center text-ink-400">{t('no_data')}</div>
          )}

          <div className="mt-6 text-sm text-ink-500">
            {t('pending_birds')}: <strong className="text-ink-800">{birds.length}</strong>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-3 font-bold text-ink-900">{t('total_price')}</h3>
          {lastResult ? (
            <div className="space-y-1 text-sm">
              <div className="font-mono text-xs text-ink-500">{lastResult.code}</div>
              <div>{t('weight_kg')}: <strong>{lastResult.weight}</strong></div>
              <div className="text-2xl font-extrabold text-brand-600">{lastResult.total}</div>
            </div>
          ) : (
            <div className="text-ink-400 text-sm">—</div>
          )}
        </div>
      </div>
    </div>
  );
}
