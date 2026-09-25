import { downloadCsv } from '../utils/exportData';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ClipboardList } from 'lucide-react';
import {
  getAllWorkOrders,
  saveWorkOrder,
  deleteWorkOrder,
  getAllBills,
  getAllClients,
  getAllCostCenters,
} from '../store';
import { calcWOUsage, emptyWOItem, calcItemAmount, deriveWOStatus } from '../utils/workOrder';
import { formatCurrency } from '../utils';
import { toast } from './Toast';
import ActionMenu from './ActionMenu';

/** GST on WO lines — same split rules as PO (same state → CGST+SGST else IGST) */
function calcWOTotals(items, taxRate, clientState, hostState) {
  const sub = (items || []).reduce((s, it) => s + calcItemAmount(it), 0);
  const rate = Number(taxRate) || 0;
  const gst = +(sub * rate / 100).toFixed(2);
  const same =
    (clientState || '').trim().toLowerCase() === (hostState || '').trim().toLowerCase()
    && !!(clientState || '').trim();
  let cgst = 0, sgst = 0, igst = 0;
  if (rate > 0) {
    if (same) {
      cgst = +(gst / 2).toFixed(2);
      sgst = +(gst - cgst).toFixed(2);
    } else {
      igst = gst;
    }
  }
  return { sub, gst, cgst, sgst, igst, total: +(sub + gst).toFixed(2), isInterstate: !same };
}


export default function WorkOrdersView() {
  const [list, setList] = useState([]);
  const [bills, setBills] = useState([]);
  const [clients, setClients] = useState([]);
  const [costCenters, setCostCenters] = useState([]);

  // Master HSN/SAC + units (same keys as InvoiceGenerator)
  const [hsnMaster, setHsnMaster] = useState([]);
  const [unitMaster, setUnitMaster] = useState(['Nos', 'Hrs', 'Days', 'Kg', 'Ltr', 'Mtr', 'Sqft', 'Job']);
  useEffect(() => {
    try {
      const custom = JSON.parse(localStorage.getItem('freegstbill_custom_sac') || '[]');
      setHsnMaster(Array.isArray(custom) ? custom.filter(Boolean) : []);
    } catch { /* */ }
    try {
      const u = JSON.parse(localStorage.getItem('freegstbill_custom_units') || '[]');
      if (Array.isArray(u) && u.length) setUnitMaster(prev => [...new Set([...prev, ...u])]);
    } catch { /* */ }
  }, []);

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
      setClients((cs || []).filter(c => !c.isVendor && c.type !== 'vendor'));
      getAllCostCenters().then(setCostCenters).catch(() => {});
    } catch {
      toast('Failed to load Work Orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Auto-sync Approved Budget = taxable + GST whenever lines / rate change
  useEffect(() => {
    if (!form) return;
    const items = form.items || [];
    const t = calcWOTotals(items, form.taxRate ?? 18, form.clientState, form.hostState);
    if (Math.abs((Number(form.approvedBudget) || 0) - t.total) > 0.009) {
      setForm(prev => prev ? { ...prev, approvedBudget: t.total } : prev);
    }
  }, [form?.items, form?.taxRate, form?.clientState, form?.hostState]);


  const openNew = () =>
    setForm({
      id: 'wo_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      woNumber: '',
      clientName: '',
      site: 'Main Site',
      title: '',
      approvedBudget: 0,
      taxRate: 18,
      clientState: '',
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
      const t = calcWOTotals(items, prev.taxRate ?? 18, prev.clientState, prev.hostState);
      return {
        ...prev,
        items,
        approvedBudget: t.total,
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
    const hostState = (typeof window !== 'undefined' && localStorage.getItem('freegstbill_profile_state')) || '';
    const totals = calcWOTotals(items, form.taxRate ?? 18, form.clientState, form.hostState || hostState);
    const budget = totals.total; // always include GST — auto from WO value
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
          <div className="modal" style={{ maxWidth: 'min(1100px, 96vw)', width: '100%', 
            background: 'var(--bg-card, #fff)', borderRadius: 12, padding: '1.5rem',
            width: 'min(960px, 98vw)', maxHeight: '95vh', overflowY: 'auto',
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
                <label className="form-label">Tax Rate %</label>
                <input type="number" className="form-input" value={form.taxRate ?? 18}
                  onChange={e => setForm({ ...form, taxRate: Number(e.target.value) || 0 })} />
                <label className="form-label">Approved Budget (₹) — auto from lines + GST</label>
                <input type="number" className="form-input" value={form.approvedBudget}
                  readOnly title="Auto-calculated from line items + GST"
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
                    <td>
                      <input className="form-input" style={{ width: 100 }} list={`wo-hsn-${idx}`}
                        value={it.hsn || ''} placeholder="Type 3+ chars"
                        onChange={e => updateItem(idx, 'hsn', e.target.value)} />
                      <datalist id={`wo-hsn-${idx}`}>
                        {hsnMaster.map(h => <option key={h} value={h} />)}
                      </datalist>
                    </td>
                      <td>
                        <input className="form-input" list={`wo-unit-${idx}`} value={it.unit || ''}
                          onChange={e => updateItem(idx, 'unit', e.target.value)} style={{ width: 80 }} />
                        <datalist id={`wo-unit-${idx}`}>
                          {unitMaster.map(u => <option key={u} value={u} />)}
                        </datalist>
                      </td>
                      <td><input type="number" className="form-input" value={it.qty}
                        onChange={e => updateItem(idx, 'qty', e.target.value)} style={{ width: 70 }} /></td>
                      <td><input type="number" className="form-input" value={it.rate}
                        onChange={e => updateItem(idx, 'rate', e.target.value)} style={{ width: 90 }} /></td>
                      <td>{formatCurrency(calcItemAmount(it))}</td>
                      <td>
                        <select className="form-input" style={{ width: 130 }}
                          value={it.costCenterId || it.costHead || ''}
                          onChange={e => {
                            updateItem(idx, 'costCenterId', e.target.value);
                            updateItem(idx, 'costHead', e.target.value);
                          }}>
                          <option value="">— Cost center —</option>
                          {(costCenters || []).map(cc => (
                            <option key={cc.id || cc.name} value={cc.id || cc.name}>{cc.name || cc.id}</option>
                          ))}
                        </select>
                      </td>
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
              {(() => {
                const t = calcWOTotals(form.items, form.taxRate ?? 18, form.clientState, form.hostState);
                return (
                  <div style={{ marginRight: 'auto', fontSize: '0.9rem', lineHeight: 1.55, textAlign: 'left' }}>
                    <div>Taxable: <b>{formatCurrency(t.sub)}</b> · GST rate {form.taxRate ?? 18}%</div>
                    {t.isInterstate
                      ? <div>IGST: <b>{formatCurrency(t.igst)}</b></div>
                      : <div>CGST <b>{formatCurrency(t.cgst)}</b> + SGST <b>{formatCurrency(t.sgst)}</b></div>}
                    <div><b>Approved Budget (incl. GST): {formatCurrency(t.total)}</b></div>
                  </div>
                );
              })()}
              <button className="btn btn-primary" onClick={save}>Save Work Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
