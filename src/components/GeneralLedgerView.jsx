import { useState, useEffect } from 'react';
import { getAllJournals } from '../store';
import { formatCurrency } from '../utils';
import { toast } from './Toast';

export default function GeneralLedgerView() {
  const [rows, setRows] = useState([]);
  const [account, setAccount] = useState('');

  useEffect(() => {
    getAllJournals().then(js => {
      const flat = [];
      (js || []).forEach(j => {
        (j.entries || []).forEach(e => {
          flat.push({
            date: j.date,
            narration: j.narration,
            account: e.account,
            debit: e.debit,
            credit: e.credit,
            refId: j.refId,
          });
        });
      });
      setRows(flat);
    }).catch(() => toast('Failed to load journals', 'error'));
  }, []);

  const filtered = account
    ? rows.filter(r => (r.account || '').toLowerCase().includes(account.toLowerCase()))
    : rows;

  return (
    <div className="page">
      <h2>General Ledger</h2>
      <input className="form-input" style={{ maxWidth: 280, marginBottom: 12 }}
        placeholder="Filter account" value={account} onChange={e => setAccount(e.target.value)} />
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr><th>Date</th><th>Account</th><th>Narration</th><th className="text-end">Debit</th><th className="text-end">Credit</th></tr>
        </thead>
        <tbody>
          {filtered.map((r, i) => (
            <tr key={i}>
              <td>{r.date}</td><td>{r.account}</td><td>{r.narration}</td>
              <td className="text-end">{r.debit ? formatCurrency(r.debit) : '—'}</td>
              <td className="text-end">{r.credit ? formatCurrency(r.credit) : '—'}</td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center' }}>No journal lines yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
