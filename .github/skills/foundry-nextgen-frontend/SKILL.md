---
name: foundry-nextgen-frontend
description: Build elegant frontend UIs following Microsoft Foundry's NextGen Design System using Vite + React + pnpm. Use when creating dashboards, agent builders, data grids, entity management interfaces, or any application matching Foundry's refined dark-themed aesthetic. Triggers on requests for Foundry-style UI, NextGen design system, Microsoft Foundry interfaces, or enterprise admin dashboards with data tables, detail panels, and charts.
---

# Microsoft Foundry NextGen Frontend Skill

Build elegant, production-ready interfaces following Microsoft Foundry's NextGen Design System - a refined **neutral dark-themed** design language with **minimal purple accents** for primary actions only.

## ⚠️ CRITICAL: Color Usage Rules

**Purple (#8251EE / #A37EF5) is ONLY for:**
- Primary action buttons (filled background)
- Active tab indicators (2px underline)
- Row selection indicators (left border bar)
- Active sidebar navigation icons
- Links and interactive text
- Progress indicators and sliders (track fill)
- Focus rings on inputs

**Everything else uses NEUTRAL DARK GREYS:**
- Backgrounds: Near-black and dark greys (#0A0A0A, #141414, #1C1C1C)
- Cards/Surfaces: Dark grey (NOT purple-tinted)
- Text: White (#FFFFFF), grey (#A1A1A1), muted (#6B6B6B)
- Secondary buttons: Grey outline with white text (NOT purple)
- Borders: Subtle dark grey (#2A2A2A, #333333)
- Inactive tabs: Grey text (#6B6B6B)

## Preferred Stack

**Vite + React + pnpm** - Fast, modern, elegant.

```bash
pnpm create vite@latest my-foundry-app --template react-ts
cd my-foundry-app
pnpm install
pnpm add lucide-react recharts
```

## Core Design Tokens

```css
:root {
  /* =================================
     BACKGROUNDS - Neutral Dark Greys
     ================================= */
  --bg-page: #0A0A0A;         /* Page background - near black */
  --bg-sidebar: #0D0D0D;      /* Sidebar and topbar */
  --bg-card: #141414;         /* Cards, panels, dialogs - dark grey */
  --bg-surface: #1C1C1C;      /* Elevated surfaces */
  --bg-elevated: #242424;     /* Dropdowns, popovers */
  --bg-hover: #2A2A2A;        /* Hover states */
  --bg-active: #333333;       /* Pressed states */

  /* =================================
     TEXT - Neutral Whites/Greys
     ================================= */
  --text-primary: #FFFFFF;    /* Main body text - pure white */
  --text-secondary: #A1A1A1;  /* Secondary text - medium grey */
  --text-muted: #6B6B6B;      /* Placeholder, disabled, inactive tabs */
  --text-disabled: #4A4A4A;   /* Disabled text */
  --text-link: #A37EF5;       /* Links - this can be purple */

  /* =================================
     BRAND PURPLE - Use Sparingly!
     ================================= */
  --brand-primary: #8251EE;   /* Primary buttons, active indicators */
  --brand-hover: #9366F5;     /* Hover on purple elements */
  --brand-light: #A37EF5;     /* Links, active sidebar icons */
  --brand-muted: rgba(130, 81, 238, 0.2);  /* Focus shadows */
  --accent-cta: #E91E8C;      /* Magenta for sliders, critical CTAs */

  /* =================================
     BORDERS - Subtle Dark Grey
     ================================= */
  --border-subtle: #1F1F1F;   /* Very subtle dividers */
  --border-default: #2A2A2A;  /* Standard borders */
  --border-strong: #333333;   /* Emphasized borders */
  --border-focus: #8251EE;    /* Focus rings */

  /* =================================
     STATUS COLORS
     ================================= */
  --success: #10B981;
  --success-muted: rgba(16, 185, 129, 0.15);
  --warning: #F59E0B;
  --warning-muted: rgba(245, 158, 11, 0.15);
  --error: #EF4444;
  --error-muted: rgba(239, 68, 68, 0.15);
  --info: #3B82F6;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

## Component Color Summary Table

| Component | Uses Purple? | Actual Colors |
|-----------|--------------|---------------|
| Primary Button | ✅ YES | Purple bg (#8251EE), white text |
| Secondary Button | ❌ NO | Transparent bg, grey border (#333), white text |
| Cards | ❌ NO | Dark grey bg (#141414), grey border (#2A2A2A) |
| Page Background | ❌ NO | Near-black (#0A0A0A) |
| Sidebar | ❌ NO | Dark grey bg (#0D0D0D) |
| Active Tab | ✅ YES | White text + purple underline |
| Inactive Tab | ❌ NO | Grey text (#6B6B6B) |
| Row Selection | ✅ YES | Purple left indicator bar |
| Sidebar Active Icon | ✅ YES | Purple icon color |
| Sidebar Inactive Icon | ❌ NO | Grey icons (#6B6B6B) |
| Input Fields | ❌ NO | Dark grey bg (#1C1C1C), grey border |
| Primary Text | ❌ NO | White (#FFFFFF) |
| Secondary Text | ❌ NO | Grey (#A1A1A1) |
| Data Table Headers | ❌ NO | Grey text (#A1A1A1) |
| Links | ✅ YES | Purple text (#A37EF5) |

## Button Examples

```jsx
{/* ✅ CORRECT: Primary button uses purple */}
<button className="btn-primary">Create</button>

{/* ✅ CORRECT: Secondary button uses GREY, not purple */}
<button className="btn-secondary">Cancel</button>

{/* ❌ WRONG: Don't use purple for secondary buttons! */}
<button className="bg-purple-900 border-purple-700">Cancel</button>
```

```css
.btn-primary {
  background: var(--brand-primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: var(--radius-md);
}
.btn-primary:hover { background: var(--brand-hover); }

.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-strong);
  padding: 8px 16px;
  border-radius: var(--radius-md);
}
.btn-secondary:hover { background: var(--bg-hover); }
```

## Card Examples

```jsx
{/* ✅ CORRECT: Card uses neutral dark grey */}
<div className="card">
  <h3>Card Title</h3>
  <p>Description in grey</p>
</div>

{/* ❌ WRONG: Don't use purple for cards! */}
<div className="bg-purple-900 border-purple-700">...</div>
<div style={{background: '#2B1D44'}}>...</div>
```

```css
/* Cards are NEUTRAL GREY, not purple */
.card {
  background: var(--bg-card);    /* #141414 */
  border: 1px solid var(--border-default);  /* #2A2A2A */
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}
```

## Critical Don'ts ❌

- **Don't use purple backgrounds for cards, panels, or surfaces** - use #141414
- **Don't use purple-tinted backgrounds** (#2B1D44, #1A1326) - use #141414, #1C1C1C
- **Don't use lavender/purple text** (#E1CEFC, #AF86F5) - use white #FFFFFF or grey #A1A1A1
- **Don't use purple borders** except on focused inputs
- **Don't make everything purple** - purple is ONLY for primary CTAs and active indicators
- **Don't use purple for secondary buttons** - use grey outline
- Don't use light backgrounds - dark-theme-only system
- Don't use rounded-full buttons - use 4-8px radius
- Don't over-animate - subtlety is elegance

## Critical Do's ✅

- Use neutral dark greys (#0A0A0A, #141414, #1C1C1C) for ALL backgrounds
- Use white (#FFFFFF) for primary text
- Use grey (#A1A1A1) for secondary/muted text
- Reserve purple (#8251EE) ONLY for:
  - Primary buttons
  - Active tab underlines
  - Active sidebar icons
  - Row selection indicators
  - Links
- Use grey outlines for secondary buttons
- Use subtle grey borders (#2A2A2A) sparingly

## File References

- **Design Tokens**: See `references/design-tokens.md` for complete color, typography, and spacing scales
- **Components**: See `references/components.md` for Badge, Button, DataGrid, Tabs, Input, Panel specs
- **Patterns**: See `references/patterns.md` for page layouts (Entity List, Detail Page, Dashboard)
