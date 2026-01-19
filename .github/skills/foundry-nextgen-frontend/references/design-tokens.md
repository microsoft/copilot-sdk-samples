# Foundry NextGen Design Tokens

## Color System

### Background Colors (Neutral Darks)

**CRITICAL: Backgrounds are neutral grey, NOT purple-tinted.**

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-page` | #0A0A0A | Main page background |
| `--bg-sidebar` | #0D0D0D | Sidebar and top bar |
| `--bg-card` | #141414 | Cards, panels, dialogs |
| `--bg-surface` | #1C1C1C | Table rows, nested surfaces |
| `--bg-elevated` | #242424 | Dropdowns, popovers |
| `--bg-hover` | #2A2A2A | Hover states |
| `--bg-active` | #333333 | Pressed/active backgrounds |

### Text Colors (White and Greys)

**CRITICAL: Text is white/grey, NOT lavender/purple-tinted.**

| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | #FFFFFF | Main body text, headings |
| `--text-secondary` | #A1A1A1 | Secondary text, labels |
| `--text-muted` | #6B6B6B | Placeholder, disabled hints |
| `--text-disabled` | #4A4A4A | Disabled text |
| `--text-link` | #A37EF5 | Links and interactive text |

### Border Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--border-subtle` | #1F1F1F | Subtle dividers |
| `--border-default` | #2A2A2A | Standard borders |
| `--border-strong` | #333333 | Emphasized borders |
| `--border-focus` | #8251EE | Focus rings |

### Brand Colors (Use Sparingly)

**Purple is ONLY for primary actions and active indicators.**

| Token | Value | Usage |
|-------|-------|-------|
| `--brand-primary` | #8251EE | Primary buttons, active indicators |
| `--brand-hover` | #9366F5 | Primary button hover |
| `--brand-light` | #A37EF5 | Links, active sidebar icons |
| `--brand-muted` | rgba(130,81,238,0.2) | Focus shadows, selection hints |
| `--accent-cta` | #E91E8C | Sliders, critical CTAs |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--success` | #10B981 | Success states |
| `--success-muted` | rgba(16,185,129,0.15) | Success backgrounds |
| `--warning` | #F59E0B | Warning states |
| `--warning-muted` | rgba(245,158,11,0.15) | Warning backgrounds |
| `--error` | #EF4444 | Error states |
| `--error-muted` | rgba(239,68,68,0.15) | Error backgrounds |
| `--info` | #3B82F6 | Info states |

## Spacing Scale

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Small elements, tags |
| `--radius-md` | 6px | Buttons, inputs |
| `--radius-lg` | 8px | Cards, panels |
| `--radius-xl` | 12px | Modals, large cards |
| `--radius-full` | 9999px | Pills, avatars |

## Typography Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `--text-xs` | 12px | 400 | Captions, timestamps |
| `--text-sm` | 13px | 400 | Table headers, labels |
| `--text-base` | 14px | 400 | Body text |
| `--text-lg` | 16px | 500 | Subheadings |
| `--text-xl` | 20px | 600 | Section headings |
| `--text-2xl` | 24px | 600 | Page titles |

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | 0 1px 2px rgba(0,0,0,0.3) | Subtle elevation |
| `--shadow-md` | 0 4px 12px rgba(0,0,0,0.4) | Cards, dropdowns |
| `--shadow-lg` | 0 8px 24px rgba(0,0,0,0.5) | Modals, popovers |
| `--shadow-focus` | 0 0 0 2px rgba(130,81,238,0.25) | Focus rings |

## Complete CSS Variables

```css
:root {
  /* Backgrounds - Neutral Darks (NOT purple) */
  --bg-page: #0A0A0A;
  --bg-sidebar: #0D0D0D;
  --bg-card: #141414;
  --bg-surface: #1C1C1C;
  --bg-elevated: #242424;
  --bg-hover: #2A2A2A;
  --bg-active: #333333;
  
  /* Text - White and Greys (NOT lavender) */
  --text-primary: #FFFFFF;
  --text-secondary: #A1A1A1;
  --text-muted: #6B6B6B;
  --text-disabled: #4A4A4A;
  --text-link: #A37EF5;
  
  /* Borders */
  --border-subtle: #1F1F1F;
  --border-default: #2A2A2A;
  --border-strong: #333333;
  --border-focus: #8251EE;
  
  /* Brand - Use Sparingly! */
  --brand-primary: #8251EE;
  --brand-hover: #9366F5;
  --brand-light: #A37EF5;
  --brand-muted: rgba(130, 81, 238, 0.2);
  --accent-cta: #E91E8C;
  
  /* Semantic */
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
  
  /* Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  
  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

## Color Usage Summary

### ✅ Where Purple IS Used
- Primary button backgrounds (#8251EE)
- Active tab underlines
- Row selection left border bars
- Active sidebar icons
- Links (#A37EF5)
- Focus ring shadows
- Progress/slider fills

### ❌ Where Purple is NOT Used
- Card backgrounds → use #141414
- Surface backgrounds → use #1C1C1C
- Page backgrounds → use #0A0A0A
- Text colors → use #FFFFFF, #A1A1A1, #6B6B6B
- Secondary buttons → use grey outline (#333333)
- Standard borders → use #2A2A2A
- Table headers → use #A1A1A1 text
