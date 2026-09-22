import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ShoppingBag } from 'lucide-react';
import {
  getAllPurchaseOrders,
  savePurchaseOrder,
  deletePurchaseOrder,
  getAllClients,
} from '../store';
import { emptyWOItem, calcItemAmount } from '../utils/workOrder';
import { formatCurrency } from '../utils';
import { toast } from './Toast';

export default function PurchaseOrdersView() {
  const [list, setList] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [pos, clients] = await Promise.all([
        getAllPurchaseOrders(),
        getAllClients(),
      ]);
      setList(pos || []);
      // clients used as vendor directory fallback
      setVendors(clients || []);
    } catch {
      toast('Failed to load Purchase Orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () =>
    setForm({
      id: 'po_' + Date.now().toString(36),
      poNumber: '',
      vendorName: '',
      site: 'Main Site',
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      taxRate: 18,
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
      return { ...prev, items };
    });
  };

  const totals = () => {
    const sub = (form?.items || []).reduce((s, it) => s + calcItemAmount(it), 0);
    const rate = Number(form?.taxRate) || 0;
    const gst = +(sub * rate / 100).toFixed(2);
    return { sub, gst, total: +(sub + gst).toFixed(2) };
  };

  const save = async () => {
    if (!form.poNumber?.trim()) {
      const n = list.length + 1;
      const y = new Date().getFullYear();
      const fy = new Date().getMonth() >= 3 ? `${String(y).slice(-2)}-${String(y+1).slice(-2)}` : `${String(y-1).slice(-2)}-${String(y).slice(-2)}`;
      form.poNumber = `PO/${fy}/${String(n).padStart(3, '0')}`;
    }
    if (!form.vendorName?.trim()) return toast('Vendor required', 'error');
    const items = (form.items || []).map(it => ({ ...it, amount: calcItemAmount(it) }));
    const t = totals();
    try {
      await savePurchaseOrder({
        ...form,
        items,
        subtotal: t.sub,
        gstAmt: t.gst,
        total: t.total,
      }, { overwrite: true });
      toast('Purchase Order saved', 'success');
      setForm(null);
      load();
    } catch (e) {
      toast(e.message || 'Save failed', 'error');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this PO?')) return;
    try {
      await deletePurchaseOrder(id);
      toast('Deleted', 'success');
      load();
    } catch {
      toast('Delete failed', 'error');
    }
  };

  if (loading) return <div className="page" style={{ padding: '2rem' }}>Loading…</div>;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={22} /> Purchase Orders
          </h2>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0' }}>Vendor POs with line items</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> New PO</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>PO #</th><th>Date</th><th>Vendor</th><th>Site</th><th>Total</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(po => (
              <tr key={po.id}>
                <td><strong>{po.poNumber}</strong></td>
                <td>{po.date}</td>
                <td>{po.vendorName}</td>
                <td>{po.site || '—'}</td>
                <td>{formatCurrency(po.total)}</td>
                <td>{po.status}</td>
                <td>
                  <button className="btn-icon" onClick={() => setForm({
                    ...po,
                    items: po.items?.length ? po.items : [emptyWOItem()],
                  })}><Edit2 size={14} /></button>
                  <button className="btn-icon" onClick={() => remove(po.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8' }}>No purchase orders yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="modal" style={{
            background: '#fff', borderRadius: 12, padding: '1.5rem',
            width: 'min(720px, 96vw)', maxHeight: '92vh', overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0 }}>{list.some(p => p.id === form.id) ? 'Edit' : 'New'} Purchase Order</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">PO Number *</label>
                <input className="form-input" value={form.poNumber}
                  onChange={e => setForm({ ...form, poNumber: e.target.value })}
                  placeholder="PO/2026-27/0001" />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={form.date || ''}
                  onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Vendor *</label>
                <input className="form-input" value={form.vendorName}
                  onChange={e => setForm({ ...form, vendorName: e.target.value })}
                  list="po-vendor-list" placeholder="Vendor name" />
                <datalist id="po-vendor-list">
                  {vendors.map(v => <option key={v.id || v.name} value={v.name} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="form-label">Ship To (Site)</label>
                <select className="form-input" value={form.site || 'Main Site'}
                  onChange={e => setForm({ ...form, site: e.target.value })}>
                  <option value="Main Site">Main Site</option>
                  {(vendors || []).flatMap(v => v.sites || []).filter((s,i,a) => a.indexOf(s)===i).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tax %</label>
                <input type="number" className="form-input" value={form.taxRate}
                  onChange={e => setForm({ ...form, taxRate: Number(e.target.value) || 0 })} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="issued">Issued</option>
                  <option value="partial">Partial</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <h4 style={{ margin: '1rem 0 0.5rem' }}>Items</h4>
            <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th><th></th>
                </tr>
              </thead>
              <tbody>
                {(form.items || []).map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td><input className="form-input" value={it.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)} /></td>
                    <td><input type="number" className="form-input" value={it.qty}
                      onChange={e => updateItem(idx, 'qty', e.target.value)} style={{ width: 70 }} /></td>
                    <td><input type="number" className="form-input" value={it.rate}
                      onChange={e => updateItem(idx, 'rate', e.target.value)} style={{ width: 90 }} /></td>
                    <td>{formatCurrency(calcItemAmount(it))}</td>
                    <td>
                      <button type="button" className="btn-icon"
                        onClick={() => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}
              onClick={() => setForm(p => ({ ...p, items: [...(p.items || []), emptyWOItem()] }))}>
              <Plus size={14} /> Add line
            </button>

            <div style={{ marginTop: '1rem', textAlign: 'right', fontWeight: 600 }}>
              Subtotal {formatCurrency(totals().sub)} · GST {formatCurrency(totals().gst)} ·
              Total {formatCurrency(totals().total)}
            </div>

            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes || ''}
                onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save PO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
