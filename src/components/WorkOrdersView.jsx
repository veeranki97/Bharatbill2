import { downloadCsv } from '../utils/exportData';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ClipboardList } from 'lucide-react';
import {
  getAllWorkOrders,
  saveWorkOrder,
  deleteWorkOrder,
  getAllBills,
  getAllClients,
} from '../store';
import { calcWOUsage, emptyWOItem, calcItemAmount, deriveWOStatus } from '../utils/workOrder';
import { formatCurrency } from '../utils';
import { toast } from './Toast';
import ActionMenu from './ActionMenu';

export default function WorkOrdersView() {
  const [list, setList] = useState([]);
  const [bills, setBills] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [wos, bs, cs] = await Promise.all([
        getAllWorkOrders(),
        getAllBills(),
        getAllClients(),
      ]);
      setList(wos || []);
      setBills(bs || []);
      setClients(cs || []);
    } catch {
      toast('Failed to load Work Orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () =>
    setForm({
      id: 'wo_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      woNumber: '',
      clientName: '',
      site: 'Main Site',
      title: '',
      approvedBudget: 0,
      status: 'draft',
      periodStart: '',
      periodEnd: '',
      notes: '',
      items: [emptyWOItem()],
      createdAt: new Date().toISOString(),
    });

  const updateItem = (idx, field, value) => {
    setForm(prev => {
      const items = [...(prev.items || [])];
      const row = { ...items[idx], [field]: value };
      if (field === 'qty' || field === 'rate') row.amount = calcItemAmount(row);
      items[idx] = row;
      const sum = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      return {
        ...prev,
        items,
        approvedBudget: prev.approvedBudget > 0 ? prev.approvedBudget : sum,
      };
    });
  };

  const addItem = () =>
    setForm(prev => ({ ...prev, items: [...(prev.items || []), emptyWOItem()] }));

  const removeItem = (idx) =>
    setForm(prev => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== idx),
    }));

  const save = async () => {
    if (!form.woNumber?.trim()) {
      const n = list.length + 1;
      const y = new Date().getFullYear();
      const fy = new Date().getMonth() >= 3 ? `${String(y).slice(-2)}-${String(y+1).slice(-2)}` : `${String(y-1).slice(-2)}-${String(y).slice(-2)}`;
      form.woNumber = `WO/${fy}/${String(n).padStart(3, '0')}`;
    }
    if (!form.clientName?.trim()) return toast('Client is required', 'error');
    const items = (form.items || []).map(it => ({
      ...it,
      amount: calcItemAmount(it),
    }));
    const itemsTotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    const budget = Number(form.approvedBudget) > 0 ? Number(form.approvedBudget) : itemsTotal;
    if (budget <= 0) return toast('Set budget or add line items with amount', 'error');

    try {
      await saveWorkOrder({ ...form, items, approvedBudget: budget }, { overwrite: true });
      toast('Work Order saved', 'success');
      setForm(null);
      load();
    } catch (e) {
      toast(e.message || 'Save failed', 'error');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this Work Order?')) return;
    try {
      await deleteWorkOrder(id);
      toast('Deleted', 'success');
      load();
    } catch {
      toast('Delete failed', 'error');
    }
  };

  if (loading) {
    return <div className="page" style={{ padding: '2rem' }}>Loading Work Orders…</div>;
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={22} /> Work Orders
          </h2>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0' }}>
            Line items, site, period, budget ceiling. Link on invoice to auto-fill.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> New Work Order
        </button>
      </div>

      {list.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          No Work Orders yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>WO #</th>
                <th>Client</th>
                <th>Site</th>
                <th>Title</th>
                <th>Period</th>
                <th>Budget</th>
                <th>Billed</th>
                <th>Remaining</th>
                <th>Status</th>
                <th style={{ width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {list.map(wo => {
                const { billedAmount, remaining } = calcWOUsage(wo, bills);
                return (
                  <tr key={wo.id}>
                    <td><strong>{wo.woNumber}</strong></td>
                    <td>{wo.clientName}</td>
                    <td>{wo.site || '—'}</td>
                    <td>{wo.title || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {wo.periodStart || '—'} → {wo.periodEnd || '—'}
                    </td>
                    <td>{formatCurrency(wo.approvedBudget)}</td>
                    <td>{formatCurrency(billedAmount)}</td>
                    <td style={{ color: remaining < 1 ? '#dc2626' : remaining < 5000 ? '#d97706' : 'inherit', fontWeight: 600 }}>
                      {formatCurrency(remaining)}
                    </td>
                    <td>{deriveWOStatus(wo, bills)} <small style={{color:'#94a3b8'}}>({wo.status})</small></td>
                    <td>
                      <ActionMenu items={[
                        { label: 'Edit', onClick: () => setForm({ ...wo, items: (wo.items && wo.items.length) ? wo.items : [emptyWOItem()] }) },
                        { label: 'Copy', onClick: () => setForm({ ...wo, id: undefined, woNumber: '', items: (wo.items || []).map(it => ({ ...it })) }) },
                        { label: 'Export row CSV', onClick: () => downloadRowsCsv(`WO-${wo.woNumber || wo.id}.csv`, [wo], [
                          { key: 'woNumber', label: 'WO No' }, { key: 'clientName', label: 'Client' },
                          { key: 'site', label: 'Site' }, { key: 'status', label: 'Status' },
                          { key: 'total', label: 'Total', get: r => r.total || r.amount || '' },
                        ]) },
                        { label: 'Delete', danger: true, onClick: () => remove(wo.id) },
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="modal" style={{
            background: 'var(--bg-card, #fff)', borderRadius: 12, padding: '1.5rem',
            width: 'min(720px, 96vw)', maxHeight: '92vh', overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginTop: 0 }}>
              {list.some(w => w.id === form.id) ? 'Edit Work Order' : 'New Work Order'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">WO Number *</label>
                <input className="form-input" value={form.woNumber}
                  onChange={e => setForm({ ...form, woNumber: e.target.value })}
                  placeholder="WO/2026-27/0001" />
              </div>
              <div className="form-group">
                <label className="form-label">Client *</label>
                <select className="form-input" value={form.clientName}
                  onChange={e => {
                    const c = clients.find(x => x.name === e.target.value);
                    const sites = c?.sites || (c?.site ? [c.site] : ['Main Site']);
                    setForm({
                      ...form,
                      clientName: e.target.value,
                      site: sites[0] || 'Main Site',
                    });
                  }}>
                  <option value="">Select Client</option>
                  {clients.map(c => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Site</label>
                <input className="form-input" value={form.site || ''}
                  onChange={e => setForm({ ...form, site: e.target.value })}
                  placeholder="Main Site / Project site" list="wo-site-list" />
                <datalist id="wo-site-list">
                  {(clients.find(c => c.name === form.clientName)?.sites || []).map(s => (
                    <option key={s} value={s} />
                  ))}
                  <option value="Main Site" />
                </datalist>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Period start</label>
                <input type="date" className="form-input" value={form.periodStart || ''}
                  onChange={e => setForm({ ...form, periodStart: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Period end</label>
                <input type="date" className="form-input" value={form.periodEnd || ''}
                  onChange={e => setForm({ ...form, periodEnd: e.target.value })} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title || ''}
                  onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Approved Budget (₹)</label>
                <input type="number" className="form-input" value={form.approvedBudget}
                  onChange={e => setForm({ ...form, approvedBudget: Number(e.target.value) || 0 })}
                  min="0" step="0.01" />
              </div>
            </div>

            <h4 style={{ margin: '1rem 0 0.5rem' }}>Line items</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>HSN/SAC</th>
                    <th>Unit</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                    <th>Cost head</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(form.items || []).map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td><input className="form-input" value={it.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)} /></td>
                      <td><input className="form-input" value={it.hsn || ''}
                        onChange={e => updateItem(idx, 'hsn', e.target.value)} style={{ width: 80 }} /></td>
                      <td><input className="form-input" value={it.unit || ''}
                        onChange={e => updateItem(idx, 'unit', e.target.value)} style={{ width: 70 }} /></td>
                      <td><input type="number" className="form-input" value={it.qty}
                        onChange={e => updateItem(idx, 'qty', e.target.value)} style={{ width: 70 }} /></td>
                      <td><input type="number" className="form-input" value={it.rate}
                        onChange={e => updateItem(idx, 'rate', e.target.value)} style={{ width: 90 }} /></td>
                      <td>{formatCurrency(calcItemAmount(it))}</td>
                      <td><input className="form-input" value={it.costHead || ''}
                        onChange={e => updateItem(idx, 'costHead', e.target.value)} style={{ width: 100 }} /></td>
                      <td>
                        <button type="button" className="btn-icon" onClick={() => removeItem(idx)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItem} style={{ marginTop: 8 }}>
              <Plus size={14} /> Add line
            </button>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes || ''}
                onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save Work Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
