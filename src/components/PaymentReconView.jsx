import { useState, useEffect } from 'react';
import { getAllBills, getAllClients } from '../store';
import { formatCurrency } from '../utils';
import { toast } from './Toast';

/** Match unallocated credit (overpaid) vs open invoices per client */
export default function PaymentReconView() {
  const [bills, setBills] = useState([]);
  const [client, setClient] = useState('');
  const [clients, setClients] = useState([]);

  useEffect(() => {
    Promise.all([getAllBills(), getAllClients()]).then(([b, c]) => {
      setBills(b || []);
      setClients(c || []);
    }).catch(() => toast('Load failed', 'error'));
  }, []);

  const names = [...new Set(bills.map(b => b.clientName).filter(Boolean))].sort();
  const mine = bills.filter(b => !client || b.clientName === client);
  const advances = mine.filter(b => (b.paidAmount || 0) > (b.totalAmount || 0) + 0.01);
  const open = mine.filter(b => (b.status === 'unpaid' || b.status === 'partial' || b.status === 'overdue'));

  return (
    <div className="page">
      <h2>Payment Reconciliation</h2>
      <p className="page-subtitle">Match overpayments / advances to open invoices (manual review).</p>
      <select className="form-input" style={{ maxWidth: 320, marginBottom: 16 }} value={client} onChange={e => setClient(e.target.value)}>
        <option value="">All clients</option>
        {names.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h3>Unallocated credit / overpaid</h3>
          <ul>
            {advances.map(b => (
              <li key={b.id}>{b.invoiceNumber}: credit {formatCurrency((b.paidAmount||0)-(b.totalAmount||0))}</li>
            ))}
            {advances.length === 0 && <li style={{ color: '#94a3b8' }}>None</li>}
          </ul>
        </div>
        <div>
          <h3>Open invoices</h3>
          <ul>
            {open.map(b => (
              <li key={b.id}>{b.invoiceNumber}: due {formatCurrency((b.totalAmount||0)-(b.paidAmount||0))}</li>
            ))}
            {open.length === 0 && <li style={{ color: '#94a3b8' }}>None</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
