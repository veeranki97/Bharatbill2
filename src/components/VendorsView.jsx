import { useState, useEffect } from 'react';
import { Plus, Store } from 'lucide-react';
import { getAllClients, saveClient, deleteClient } from '../store';
import { toast } from './Toast';
import ActionMenu from './ActionMenu';

/** Vendors = clients marked isVendor; side-by-side form like ERPNext */
export default function VendorsView() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(null);

  const load = async () => {
    const all = await getAllClients();
    setList((all || []).filter(c => c.isVendor || c.type === 'vendor'));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => setForm({
    id: 'ven_' + Date.now().toString(36),
    name: '', gstin: '', state: '', city: '', phone: '', email: '', address: '',
    isVendor: true, type: 'vendor', sites: ['Main Site'],
  });

  // GSTIN first 2 digits → state (SD Dynamics parity)
  const STATE_BY_CODE = {
    '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
    '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
    '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
    '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '32': 'Kerala', '33': 'Tamil Nadu',
    '34': 'Puducherry', '36': 'Telangana', '37': 'Andhra Pradesh',
  };

  const onGstin = (gstin) => {
    const g = (gstin || '').toUpperCase().trim();
    const patch = { gstin: g };
    if (g.length >= 2 && STATE_BY_CODE[g.slice(0, 2)]) patch.state = STATE_BY_CODE[g.slice(0, 2)];
    setForm(prev => ({ ...prev, ...patch }));
  };

  const save = async () => {
    if (!form.name?.trim()) return toast('Vendor name required', 'error');
    if (form.gstin && form.gstin.length !== 15) return toast('GSTIN must be 15 characters', 'error');
    try {
      await saveClient({ ...form, isVendor: true, type: 'vendor' });
      toast('Vendor saved', 'success');
      setForm(null);
      load();
    } catch (e) {
      toast(e.message || 'Save failed', 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Store size={22} /> Vendors</h2>
          <p className="page-subtitle">Suppliers & sub-contractors</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Add Vendor</button>
      </div>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr><th>Name</th><th>GSTIN</th><th>State</th><th>Phone</th><th></th></tr>
        </thead>
        <tbody>
          {list.map(v => (
            <tr key={v.id}>
              <td>{v.name}</td><td>{v.gstin || '—'}</td><td>{v.state || '—'}</td><td>{v.phone || '—'}</td>
              <td>
                <ActionMenu items={[
                  { label: 'Edit', onClick: () => setForm({ ...v }) },
                  { label: 'Copy', onClick: () => setForm({ ...v, id: undefined, name: (v.name || '') + ' (Copy)' }) },
                  { label: 'Delete', danger: true, onClick: async () => {
                    if (!confirm('Delete vendor?')) return;
                    await deleteClient(v.id);
                    toast('Deleted', 'success');
                    load();
                  }},
                ]} />
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>No vendors yet</td></tr>
          )}
        </tbody>
      </table>

      {form && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
        }}>
          <div className="modal" style={{
            background: 'var(--card, #fff)', borderRadius: 14, padding: '1.25rem 1.5rem',
            width: 'min(720px, 96vw)', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h3 style={{ marginTop: 0 }}>{list.some(x => x.id === form.id) ? 'Edit' : 'New'} Vendor</h3>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem',
            }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Vendor Name *</label>
                <input className="form-input" value={form.name || ''}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">GSTIN</label>
                <input className="form-input" maxLength={15} value={form.gstin || ''}
                  onChange={e => onGstin(e.target.value)} placeholder="15 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={form.state || ''}
                  onChange={e => setForm({ ...form, state: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={form.city || ''}
                  onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone || ''}
                  onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email || ''}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Address</label>
                <textarea className="form-input" rows={2} value={form.address || ''}
                  onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={save}>Save Vendor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
