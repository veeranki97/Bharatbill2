import { useState, useEffect, useMemo } from 'react';
import { getAllJournals } from '../store';
import { formatCurrency } from '../utils';
import { toast } from './Toast';

/** General Ledger + Party / Client ledger filters (extends prior account filter). */
export default function GeneralLedgerView() {
  const [rows, setRows] = useState([]);
  const [account, setAccount] = useState('');
  const [party, setParty] = useState('');
  const [mode, setMode] = useState('all'); // all | party | account

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
            refType: j.refType,
            party: j.party || j.clientName || '',
            site: j.site || '',
          });
        });
      });
      setRows(flat);
    }).catch(() => toast('Failed to load journals', 'error'));
  }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (account && !(r.account || '').toLowerCase().includes(account.toLowerCase())) return false;
      if (party && !(r.party || '').toLowerCase().includes(party.toLowerCase())
        && !(r.narration || '').toLowerCase().includes(party.toLowerCase())) return false;
      if (mode === 'party' && !r.party) return false;
      return true;
    });
  }, [rows, account, party, mode]);

  const partyTotals = useMemo(() => {
    if (!party) return null;
    const dr = filtered.reduce((s, r) => s + (Number(r.debit) || 0), 0);
    const cr = filtered.reduce((s, r) => s + (Number(r.credit) || 0), 0);
    return { dr, cr, bal: dr - cr };
  }, [filtered, party]);

  return (
    <div className="page">
      <h2>General Ledger</h2>
      <p className="page-subtitle">Account ledger · Party / client ledger (filter by party name)</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input className="form-input" style={{ maxWidth: 220 }}
          placeholder="Filter account" value={account} onChange={e => setAccount(e.target.value)} />
        <input className="form-input" style={{ maxWidth: 220 }}
          placeholder="Party / client ledger" value={party} onChange={e => setParty(e.target.value)} />
        <select className="form-input" style={{ maxWidth: 160 }} value={mode} onChange={e => setMode(e.target.value)}>
          <option value="all">All lines</option>
          <option value="party">Only party-tagged</option>
        </select>
      </div>
      {partyTotals && (
        <div className="glass-panel p-3 mb-3" style={{ maxWidth: 480, fontSize: 13 }}>
          Party <strong>{party}</strong> — Dr {formatCurrency(partyTotals.dr)} · Cr {formatCurrency(partyTotals.cr)} ·
          Bal {formatCurrency(partyTotals.bal)}
        </div>
      )}
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Date</th><th>Account</th><th>Party</th><th>Narration</th><th>Ref</th>
            <th className="text-end">Debit</th><th className="text-end">Credit</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r, i) => (
            <tr key={i}>
              <td>{r.date}</td>
              <td>{r.account}</td>
              <td>{r.party || '—'}</td>
              <td>{r.narration}</td>
              <td>{r.refId || '—'}</td>
              <td className="text-end">{r.debit ? formatCurrency(r.debit) : '—'}</td>
              <td className="text-end">{r.credit ? formatCurrency(r.credit) : '—'}</td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center' }}>No journal lines yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
