import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, FileText, Printer } from 'lucide-react';
import {
  getAllPurchaseOrders,
  savePurchaseOrder,
  deletePurchaseOrder,
  getAllClients,
  getProfile,
  getAllCostCenters,
} from '../store';
import { emptyWOItem, calcItemAmount } from '../utils/workOrder';
import { formatCurrency } from '../utils';
import { toast } from './Toast';
import ActionMenu from './ActionMenu';
function downloadRowsCsv(filename, rows, cols) {
  const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const headers = cols.map(c => c.label);
  const body = rows.map(r => cols.map(c => esc(c.get ? c.get(r) : r[c.key])).join(','));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([[headers.join(',')].concat(body).join('\n')], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}

function fyLabel(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth();
  return m >= 3 ? `${String(y).slice(-2)}-${String(y + 1).slice(-2)}` : `${String(y - 1).slice(-2)}-${String(y).slice(-2)}`;
}

function nextPONumber(list) {
  const fy = fyLabel();
  const prefix = `PO/${fy}/`;
  let max = 0;
  (list || []).forEach(p => {
    const s = String(p.poNumber || '');
    if (s.startsWith(prefix)) {
      const n = parseInt(s.slice(prefix.length), 10);
      if (!isNaN(n)) max = Math.max(max, n);
    }
  });
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

/** GST split like SD Dynamics: same state → CGST+SGST else IGST */
function calcPOTotals(items, taxRate, vendorState, hostState) {
  const sub = (items || []).reduce((s, it) => s + calcItemAmount(it), 0);
  const rate = Number(taxRate) || 0;
  const gst = +(sub * rate / 100).toFixed(2);
  const same =
    (vendorState || '').trim().toLowerCase() === (hostState || '').trim().toLowerCase() &&
    !!(vendorState || '').trim();
  let cgst = 0, sgst = 0, igst = 0;
  if (same) {
    cgst = +(gst / 2).toFixed(2);
    sgst = +(gst - cgst).toFixed(2);
  } else {
    igst = gst;
  }
  return { sub, gst, cgst, sgst, igst, total: +(sub + gst).toFixed(2), isInterstate: !same };
}

async function sha256Hex(text) {
  try {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = ((h << 5) - h) + text.charCodeAt(i) | 0;
    return 'local-' + Math.abs(h).toString(16);
  }
}

function printPO(po, profile, fingerprint) {
  const t = calcPOTotals(po.items, po.taxRate, po.vendorState, profile?.state);
  const rows = (po.items || []).map((it, i) =>
    `<tr>
      <td style="border:1px solid #333;padding:6px;text-align:center">${i + 1}</td>
      <td style="border:1px solid #333;padding:6px">${it.description || ''}</td>
      <td style="border:1px solid #333;padding:6px;text-align:center">${it.hsn || ''}</td>
      <td style="border:1px solid #333;padding:6px;text-align:center">${it.qty || 0}</td>
      <td style="border:1px solid #333;padding:6px;text-align:center">${it.unit || ''}</td>
      <td style="border:1px solid #333;padding:6px;text-align:right">${Number(it.rate || 0).toFixed(2)}</td>
      <td style="border:1px solid #333;padding:6px;text-align:right">${calcItemAmount(it).toFixed(2)}</td>
    </tr>`
  ).join('');
  const taxRows = t.isInterstate
    ? `<tr><td colspan="6" style="text-align:right;padding:4px">IGST @ ${po.taxRate || 0}%</td><td style="text-align:right;padding:4px">${t.igst.toFixed(2)}</td></tr>`
    : `<tr><td colspan="6" style="text-align:right;padding:4px">CGST</td><td style="text-align:right;padding:4px">${t.cgst.toFixed(2)}</td></tr>
       <tr><td colspan="6" style="text-align:right;padding:4px">SGST</td><td style="text-align:right;padding:4px">${t.sgst.toFixed(2)}</td></tr>`;
  const html = `<!DOCTYPE html><html><head><title>${po.poNumber}</title>
    <style>
      body{font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#111;padding:16px}
      h1{margin:0 0 4px;font-size:20px} h2{margin:0 0 12px;font-size:14px;color:#444}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      .meta td{padding:3px 8px 3px 0}
      .footer{margin-top:24px;font-size:10px;color:#666;border-top:1px dashed #ccc;padding-top:8px;text-align:center;font-style:italic}
    </style></head><body>
    <h1>${profile?.businessName || 'Business'}</h1>
    <div style="font-size:11px;color:#555">${[profile?.address, profile?.city, profile?.state, profile?.gstin].filter(Boolean).join(' · ')}</div>
    <h2 style="margin-top:16px">PURCHASE ORDER — ${po.poNumber}</h2>
    <table class="meta">
      <tr><td><b>Date</b></td><td>${po.date || ''}</td><td><b>Vendor</b></td><td>${po.vendorName || ''}</td></tr>
      <tr><td><b>Ship To / Site</b></td><td>${po.site || ''}</td><td><b>Vendor GSTIN</b></td><td>${po.vendorGstin || '—'}</td></tr>
      <tr><td><b>Vendor State</b></td><td>${po.vendorState || '—'}</td><td><b>Status</b></td><td>${po.status || ''}</td></tr>
    </table>
    <table>
      <thead><tr style="background:#f4f4f4">
        <th style="border:1px solid #333;padding:6px">#</th>
        <th style="border:1px solid #333;padding:6px">Description</th>
        <th style="border:1px solid #333;padding:6px">HSN/SAC</th>
        <th style="border:1px solid #333;padding:6px">Qty</th>
        <th style="border:1px solid #333;padding:6px">Unit</th>
        <th style="border:1px solid #333;padding:6px">Rate</th>
        <th style="border:1px solid #333;padding:6px">Amount</th>
      </tr></thead>
      <tbody>${rows}
        <tr><td colspan="6" style="text-align:right;padding:6px;font-weight:600">Taxable</td><td style="text-align:right;padding:6px;font-weight:600">${t.sub.toFixed(2)}</td></tr>
        ${taxRows}
        <tr><td colspan="6" style="text-align:right;padding:6px;font-weight:700">Grand Total</td><td style="text-align:right;padding:6px;font-weight:700">${t.total.toFixed(2)}</td></tr>
      </tbody>
    </table>
    ${po.notes ? `<p style="margin-top:12px"><b>Notes:</b> ${po.notes}</p>` : ''}
    <div class="footer">
      This is a Computer Generated Transaction — Generated on ${new Date().toLocaleString('en-IN')}<br/>
      🔒 SHA-256 Digital Fingerprint: <span style="font-family:monospace">${fingerprint || '—'}</span>
    </div>
    </body></html>`;
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return toast('Allow pop-ups to print PO', 'error');
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}

export default function PurchaseOrdersView() {
  const [list, setList] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [pos, clients, prof] = await Promise.all([
        getAllPurchaseOrders(),
        getAllClients(), // filtered to vendors below
        getProfile().catch(() => null),
      ]);
      setList(pos || []);
      setVendors((clients || []).filter(c => c.isVendor || c.type === 'vendor'));
      setProfile(prof);
    } catch {
      toast('Failed to load Purchase Orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllCostCenters().then(setCostCenters).catch(() => {});
  }, []);
  useEffect(() => { load(); }, []);

  const openNew = () =>
    setForm({
      id: 'po_' + Date.now().toString(36),
      poNumber: '',
      vendorName: '',
      vendorGstin: '',
      vendorState: '',
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

  const t = useMemo(
    () => (form ? calcPOTotals(form.items, form.taxRate, form.vendorState, profile?.state) : null),
    [form, profile]
  );

  const save = async () => {
    if (!form.vendorName?.trim()) return toast('Vendor required', 'error');
    if (!(form.costCenterId || '').trim()) return toast('Cost Center is required', 'error');
    if (!form.poNumber?.trim()) form.poNumber = nextPONumber(list);
    const items = (form.items || []).map(it => ({ ...it, amount: calcItemAmount(it) }));
    const totals = calcPOTotals(items, form.taxRate, form.vendorState, profile?.state);
    const payload = {
      ...form,
      items,
      ...totals,
      fingerprint: await sha256Hex(JSON.stringify({
        po: form.poNumber, vendor: form.vendorName, items, totals, date: form.date,
      })),
      updatedAt: new Date().toISOString(),
    };
    try {
      await savePurchaseOrder(payload, { overwrite: true });
      toast(`PO ${payload.poNumber} saved`, 'success');
      setForm(null);
      load();
    } catch (e) {
      toast(e?.message || 'Save failed', 'error');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this Purchase Order?')) return;
    await deletePurchaseOrder(id);
    toast('Deleted', 'success');
    load();
  };

  if (loading) return <div className="page"><p>Loading…</p></div>;

  if (form) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>{form.poNumber ? `Edit ${form.poNumber}` : 'New Purchase Order'}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={save}>Save PO</button>
          </div>
        </div>
        <div className="glass-panel p-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">PO Number</label>
            <input className="form-input" value={form.poNumber} placeholder="Auto on save"
              onChange={e => setForm({ ...form, poNumber: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Vendor</label>
            <input className="form-input" list="po-vendors" value={form.vendorName}
              onChange={e => {
                const name = e.target.value;
                const v = vendors.find(x => x.name === name);
                setForm({
                  ...form,
                  vendorName: name,
                  vendorGstin: v?.gstin || form.vendorGstin,
                  vendorState: v?.state || form.vendorState,
                  site: v?.site || (Array.isArray(v?.sites) && v.sites[0]) || form.site || '',
                });
              }} />
            <datalist id="po-vendors">{vendors.map(v => <option key={v.id || v.name} value={v.name} />)}</datalist>
          </div>
          <div className="form-group">
            <label className="form-label">Vendor GSTIN</label>
            <input className="form-input" value={form.vendorGstin || ''}
              onChange={e => setForm({ ...form, vendorGstin: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Vendor State</label>
            <input className="form-input" value={form.vendorState || ''}
              onChange={e => setForm({ ...form, vendorState: e.target.value })}
              placeholder="For CGST/SGST vs IGST" />
          </div>
          <div className="form-group">
            <label className="form-label">Ship To (Site)</label>
            <input className="form-input" list="po-sites" value={form.site || ''}
              onChange={e => setForm({ ...form, site: e.target.value })}
              placeholder="Delivery site" />
            <datalist id="po-sites">
              {(form.site ? [form.site] : []).map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="form-group">
            <label className="form-label">Cost Center *</label>
            <select className="form-input" value={form.costCenterId || ''}
              onChange={e => setForm({ ...form, costCenterId: e.target.value })}>
              <option value="">Select cost center…</option>
              {(costCenters || []).map(cc => (
                <option key={cc.id || cc.name} value={cc.id || cc.name}>{cc.name || cc.id}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">GST %</label>
            <input type="number" className="form-input" value={form.taxRate}
              onChange={e => setForm({ ...form, taxRate: e.target.value })} />
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

        <div className="glass-panel p-4 mt-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Line items</h3>
            <button type="button" className="btn btn-sm btn-secondary"
              onClick={() => setForm({ ...form, items: [...(form.items || []), emptyWOItem()] })}>
              <Plus size={14} /> Add row
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Description</th><th>HSN</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th><th></th>
                </tr>
              </thead>
              <tbody>
                {(form.items || []).map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td><input className="form-input" value={it.description || ''}
                      onChange={e => updateItem(idx, 'description', e.target.value)} /></td>
                    <td><input className="form-input" style={{ width: 90 }} value={it.hsn || ''}
                      onChange={e => updateItem(idx, 'hsn', e.target.value)} /></td>
                    <td><input type="number" className="form-input" style={{ width: 70 }} value={it.qty}
                      onChange={e => updateItem(idx, 'qty', e.target.value)} /></td>
                    <td><input className="form-input" style={{ width: 70 }} value={it.unit || ''}
                      onChange={e => updateItem(idx, 'unit', e.target.value)} /></td>
                    <td><input type="number" className="form-input" style={{ width: 90 }} value={it.rate}
                      onChange={e => updateItem(idx, 'rate', e.target.value)} /></td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(calcItemAmount(it))}</td>
                    <td>
                      <button type="button" className="btn-icon" onClick={() =>
                        setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {t && (
            <div style={{ marginTop: 12, textAlign: 'right', lineHeight: 1.7 }}>
              <div>Taxable: <b>{formatCurrency(t.sub)}</b></div>
              {t.isInterstate
                ? <div>IGST: <b>{formatCurrency(t.igst)}</b></div>
                : <><div>CGST: <b>{formatCurrency(t.cgst)}</b></div><div>SGST: <b>{formatCurrency(t.sgst)}</b></div></>}
              <div style={{ fontSize: '1.1rem' }}>Total: <b>{formatCurrency(t.total)}</b></div>
            </div>
          )}
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} value={form.notes || ''}
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Purchase Orders</h2>
          <p className="page-subtitle" style={{ margin: 0 }}>SD-style PO with GST bifurcation & digitally fingerprinted print</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}><Plus size={16} /> New PO</button>
      </div>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>PO #</th><th>Date</th><th>Vendor</th><th>Site</th><th>Status</th>
            <th className="text-end">Taxable</th><th className="text-end">GST</th><th className="text-end">Total</th><th></th>
          </tr>
        </thead>
        <tbody>
          {list.map(po => (
            <tr key={po.id}>
              <td>{po.poNumber}</td>
              <td>{po.date}</td>
              <td>{po.vendorName}</td>
              <td>{po.site}</td>
              <td>{po.status}</td>
              <td className="text-end">{formatCurrency(po.sub || 0)}</td>
              <td className="text-end">{formatCurrency(po.gst || 0)}</td>
              <td className="text-end">{formatCurrency(po.total || 0)}</td>
              <td>
                <ActionMenu items={[
                  { label: 'Edit', onClick: () => setForm({ ...po }) },
                  { label: 'Copy', onClick: () => setForm({ ...po, id: undefined, poNumber: '' }) },
                  { label: 'Print / PDF', onClick: () => printPO(po, profile, po.fingerprint) },
                  { label: 'Export CSV', onClick: () => downloadRowsCsv(`PO-${po.poNumber || po.id}.csv`, [po], [
                    { key: 'poNumber', label: 'PO No' }, { key: 'date', label: 'Date' },
                    { key: 'vendorName', label: 'Vendor' }, { key: 'site', label: 'Site' },
                    { key: 'status', label: 'Status' }, { key: 'total', label: 'Total' },
                  ]) },
                  { label: 'Delete', danger: true, onClick: () => remove(po.id) },
                ]} />
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr><td colSpan={9} style={{ textAlign: 'center', color: '#94a3b8' }}>No purchase orders yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
