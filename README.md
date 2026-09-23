<div align="center">

# SD dynamics

### GST billing + service ERP for India — Work Orders, Purchase Orders, ledgers, Cost Centers

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.0.0-blue.svg)](https://github.com/veeranki97/Bharatbill2/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](#quick-start)
[![PWA](https://img.shields.io/badge/PWA-installable-purple.svg)](#install-as-pwa)

**Repository:** [github.com/veeranki97/Bharatbill2](https://github.com/veeranki97/Bharatbill2)

Offline-first · Local data in `./data/` · No mandatory cloud · React + Vite + Express

</div>

---

## What is SD dynamics?

**SD dynamics** is a customized ERP built on top of [Free GST Billing Software](https://github.com/IamRamgarhia/Free-GST-Billing-Software) (DiceCodes / IamRamgarhia), extended for **service-oriented operations** (SD Dynamics–style workflows):

| Layer | Capability |
|--------|------------|
| **Upstream base** | Tax Invoice, Credit Note, DC, Proforma, GSTR helpers, multi-currency, inventory, PWA |
| **SD dynamics ERP** | Work Orders, Purchase Orders, Vendors, Cost Centers, Chart of Accounts, General Ledger, Cash Book, Payment Reconciliation, Site/WO P&L, Sai Durga & Tally PDF templates |

**Current version: `2.0.0`** — first versioned release of this fork’s custom ERP feature set (based on upstream ~1.10.x).

> Software updates check **this** repository (`veeranki97/Bharatbill2`), not the upstream Free GST Billing repo, so customizations are not overwritten by upstream releases.

---

## Quick start

```bash
git clone https://github.com/veeranki97/Bharatbill2.git
cd SD dynamics
npm install
npm run build
npm start
```

Open the URL printed in the terminal (or see `data/port.txt`).  
**Keep the `data/` folder** — that is your invoices, clients, journals, and backups.

Dev mode:

```bash
npm run dev          # Unix
npm run dev:win      # Windows
```

---

## Key features (Bharatbill2)

### Sales & documents
- Tax Invoice, Credit Note, Delivery Challan, Quotation, Proforma, Debit Note  
- **Per-type document numbers** (independent series, e.g. `TAX/…` and `QUO/…`)  
- **Work Order** link with budget ceiling and auto-fill of client, site, line items, SAC/unit/rate  
- Bill period, place of supply (from client GSTIN/state), due date default **+30 days**  
- **Sai Durga** and **Tally Classic** PDF styles (Print & PDF settings)

### Parties & orders
- **Clients** (GSTIN → state) and **Vendors** (separate list, paid/outstanding metrics)  
- **Work Orders** and **Purchase Orders** with cost centers, export, ⋮ actions  

### Money & books
- Receipts (invoice / advance / vendor) with optional **Site + WO + Cost Center**  
- Expenses with categories, WO, cost center  
- **Cash Book** (running balance) + **Export CSV**  
- Journals, **Chart of Accounts**, **General Ledger** (party filter), Payment Recon  
- Site-wise and **WO-wise P&L** (requires Site/WO on documents)

### Compliance
- GSTR-oriented flows from upstream (GSTR-1 / 3B data, 2B-style reconciliation where enabled)  
- GST bifurcation CGST/SGST vs IGST by place of supply  

### UX
- Grouped sidebar (Sales / Orders / Parties / Money / Books / Compliance)  
- Compact **ActionMenu** (⋮) on list screens  
- Dense SD-style invoice form (cascade State → Client → Site)

---

## Upstream Free GST Billing features (retained)

Still included from the base project: multi-business profiles, inventory/products, recurring invoices, OCR helper, Control Panel, backups, Google Drive optional sync, multi-currency, thermal/A4 print options, user guide, and offline PWA install.

Full historical upstream notes remain in older changelog sections and upstream docs.

---

## Data & updates

| Topic | Detail |
|--------|--------|
| **Data** | JSON files under `data/` (bills, clients, journals, …) |
| **Backups** | Control Panel / `data/backups` |
| **Updates** | App checks `https://github.com/veeranki97/Bharatbill2` for newer `package.json` / releases |
| **Do not** | Replace `data/` when unzipping code updates |

---

## Documentation

| File | Purpose |
|------|---------|
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history starting at **2.0.0** for this fork |
| **[CUSTOM_CHANGES_README.txt](./CUSTOM_CHANGES_README.txt)** | Short list of custom modules vs upstream |
| **[docs/README.md](./docs/README.md)** | Index of deeper docs |
| **[docs/USER_GUIDE.md](./docs/USER_GUIDE.md)** | End-user handbook (upstream + notes) |
| **[SECURITY.md](./SECURITY.md)** | Security policy |

---

## Attribution

- **SD dynamics custom ERP layer** — maintained in [veeranki97/Bharatbill2](https://github.com/veeranki97/Bharatbill2)  
- **Base application** — [Free GST Billing Software](https://github.com/IamRamgarhia/Free-GST-Billing-Software) by DiceCodes (MIT)  

License: **MIT** (see [LICENSE](./LICENSE)).

---

## Support

- Issues: [github.com/veeranki97/Bharatbill2/issues](https://github.com/veeranki97/Bharatbill2/issues)  
- Prefer describing: steps, screenshot, `npm run build` errors, and whether `data/bills` has files  

---

<div align="center">

**SD dynamics v2.0.0** · Built for service GST operations in India

</div>
