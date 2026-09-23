# Changelog

All notable changes to **SD dynamics** are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning: [Semantic Versioning](https://semver.org/).

**Repository:** https://github.com/veeranki97/Bharatbill2.git 

This project is a **fork** of Free GST Billing Software.  
- **2.0.0+** = SD dynamics custom ERP releases  
- **1.10.x** entries below (if retained) = upstream history for reference only  

---

## [2.0.0] - 2026-09-23

### Initial SD dynamics ERP release

First versioned release of the customized fork. Base: Free GST Billing Software ~1.10.x, plus SD Dynamics–oriented ERP modules and UI.

#### Added
- **Work Orders** — numbering, budget ceiling, invoice link, auto-fill client/site/items
- **Purchase Orders** — GST split, cost center (required), print/export, ⋮ actions
- **Vendors** — separate from clients; search; total / paid / outstanding metrics
- **Cost Centers** — master with edit/delete; used on invoice lines, PO, expenses, receipts
- **Chart of Accounts**, **General Ledger** (party/client filter), **Payment Reconciliation**
- **Cash Book** — chronological balance; **Export CSV**
- **Site-wise P&L** and **WO-wise P&L** report tabs (data when Site/WO tagged)
- **Sai Durga** and **Tally Classic** PDF visual styles (Print & PDF settings)
- **ActionMenu** (⋮) on invoices, clients, vendors, WO, PO
- Grouped navigation (Sales / Orders / Parties / Money / Books / Compliance)
- Receipts: Site + Work Order + Cost Center when type is Advance or Vendor
- Expenses: custom categories, Work Order + Cost Center
- Purchase bills: Work Order + Cost Center linking
- Invoice form: State → Client → Site cascade; clients-only (no vendors); due date +30 days; bill period row; SAC save-to-master
- Dashboard charts (Chart.js) and KPI home vs Invoices list split
- Update check pointed at **veeranki97/Bharatbill2** (not upstream)

#### Fixed
- Payment / status change posts **journal + receipt** so GL and Cash Book stay in sync
- Duplicate Site field on invoice form removed
- Client list no longer mixes in vendors
- Action menu visibility (z-index / overflow)
- Line-item column alignment (shared CSS grid)

#### Changed
- Package name / versioning starts at **2.0.0** for this fork
- README and docs index rewritten for SD dynamics
- In-app update endpoint uses this repository’s `package.json` and releases

#### Security / data
- Local `data/` storage unchanged in design; always back up before major upgrades

---

## Upstream reference (pre-fork)

SD dynamics inherits features and bugfixes from **Free GST Billing Software** versions through approximately **1.10.66**. Detailed upstream release notes are available at:

https://github.com/IamRamgarhia/Free-GST-Billing-Software/blob/main/CHANGELOG.md

Those notes are **not** re-published in full here to avoid implying that upstream owns this fork’s roadmap.

---

## Versioning policy (SD dynamics)

| Version | Meaning |
|---------|---------|
| **2.0.x** | Custom ERP surface (WO/PO/ledgers/cost centers/PDF styles) |
| **2.x.0** | Larger module or reporting changes |
| **2.0.x** | Patches and UI fixes |

When publishing a GitHub Release, tag as `v2.0.0`, `v2.0.1`, etc., and bump `package.json` `"version"` so the in-app update checker can detect it.
