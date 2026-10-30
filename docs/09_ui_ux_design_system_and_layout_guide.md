# UI/UX Design System & Layout Architecture Guide

## 1. Overview & Reference Blueprint

This document specifies the exact visual language, layout structure, and responsive design system for **My Edu Care**, modelled after modern enterprise SaaS dashboards (MeloSalon, FinTrack Premium, and Fitness Analytics benchmarks).

---

## 2. Core Layout Architecture (Modern SaaS App Shell)

```
┌────────────────────────────────────────────────────────────────────────┐
│                               APP SHELL                                │
├──────────────┬─────────────────────────────────────────────────────────┤
│   SIDEBAR    │                      TOPBAR                             │
│ (W: 260px)   │ [🔍 Search...]   [🏫 Active School ▼]   [🔔] [👤 Profile]│
│              ├─────────────────────────────────────────────────────────┤
│ [Logo & Name]│                                                         │
│              │ MAIN CONTENT CANVAS (Responsive Grid, Max-W: 1400px)   │
│ • Main       │                                                         │
│   - Dashboard│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│   - Students │ │ Metric 1 │ │ Metric 2 │ │ Metric 3 │ │ Metric 4 │     │
│   - Courses  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│              │                                                         │
│ • Governance │ ┌─────────────────────────┐ ┌─────────────────────────┐ │
│   - School IAM│ │ Quick Actions / Summary │ │ Analytics / Breakdown   │ │
│   - Platform │ └─────────────────────────┘ └─────────────────────────┘ │
│              │                                                         │
│ • System     │ ┌─────────────────────────────────────────────────────┐ │
│   - Settings │ │ Data Table / Management View (Filters + Actions)    │ │
│   - Logout   │ └─────────────────────────────────────────────────────┘ │
└──────────────┴─────────────────────────────────────────────────────────┘
```

---

## 3. Visual Design Tokens

### 3.1 Color Palette
- **Canvas Backdrop:** `#f8fafc` (Soft off-white canvas preventing eye strain).
- **Surface / Card Background:** `#ffffff` (Pure white card containers).
- **Borders:** `#e2e8f0` (Crisp 1px subtle boundary).
- **Primary Accent:** `#0284c7` (Light Sky Blue / Deep Cyan interactive primary).
- **Secondary Accent:** `#db2777` (Subtle Rose / Pink highlight for governance & alerts).
- **Pastel Icon Badges (From Samples):**
  - **Sky Blue:** `#e0f2fe` background, `#0369a1` icon.
  - **Soft Rose:** `#fce7f3` background, `#be185d` icon.
  - **Mint Green:** `#dcfce7` background, `#15803d` icon.
  - **Warm Amber:** `#fef3c7` background, `#b45309` icon.

### 3.2 Border Radius System (Smooth Experience)
- **Small Pills & Badges:** `border-radius: 9999px`
- **Buttons & Form Inputs:** `border-radius: 12px`
- **Standard Cards & Containers:** `border-radius: 18px`
- **Large Hero & Dashboard Banners:** `border-radius: 24px`

### 3.3 Elevation & Shadows
- **Card Shadow:** `0 4px 20px -2px rgba(15, 23, 42, 0.05)`
- **Hover Elevation:** `0 10px 28px -4px rgba(15, 23, 42, 0.09)`
- **Modal Overlay:** `0 25px 50px -12px rgba(15, 23, 42, 0.25)`

### 3.4 Typography & Content Standards
- **Font Stack:** System Sans-Serif (`-apple-system`, `BlinkMacSystemFont`, `Inter`, `Segoe UI`).
- **Headings:** Always **Title case** or **Sentence case**. **Zero All-Caps titles**.
- **Hero Numbers:** `24px - 30px` bold weights (`700`).
- **Body Text:** `14px - 15px` neutral slate (`#334155`).
- **Muted Labels:** `12px - 13px` (`#64748b`).

---

## 4. Responsive Breakpoint Strategy

1. **Desktop (> 1024px):**
   - Fixed 260px left sidebar.
   - 4-column metric cards row.
   - Split 2-column middle analytics row.
   - Full data table with sticky headers.
2. **Tablet (768px - 1024px):**
   - Compact collapsible sidebar (icon + flyout).
   - 2x2 metric cards grid.
   - Stacked analytics and action cards.
3. **Mobile (< 768px):**
   - Hidden sidebar replaced with hamburger menu and animated slide-over drawer.
   - 1-column stacked metric cards.
   - Horizontally scrollable data tables with clean swipe indicators.
