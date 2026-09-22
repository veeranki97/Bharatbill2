import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Store } from 'lucide-react';
import { getAllClients, saveClient, deleteClient, getProfile } from '../store';
import { toast } from './Toast';
import ActionMenu from './ActionMenu';

/** Vendors = clients marked isVendor or type vendor; stored in clients with flag */
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
          <p className="page-subtitle">Sub-contractors & suppliers (outsourced labour = Vendor)</p>
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
                  { label: 'Delete', danger: true, onClick: async () => { await deleteClient(v.id); load(); } },
                ]} />
              </td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>No vendors yet</td></tr>}
        </tbody>
      </table>

      {form && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal" style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', width: 'min(480px, 95vw)' }}>
            <h3>{form.id?.startsWith('ven_') && !list.find(x => x.id === form.id) ? 'New' : 'Edit'} Vendor</h3>
            {['name', 'gstin', 'state', 'city', 'phone', 'email', 'address'].map(f => (
              <div className="form-group" key={f}>
                <label className="form-label" style={{ textTransform: 'capitalize' }}>{f}</label>
                <input className="form-input" value={form[f] || ''} onChange={e => setForm({ ...form, [f]: e.target.value })} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
