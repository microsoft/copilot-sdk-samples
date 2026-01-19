# Foundry NextGen Components

## Buttons

### Primary Button
Purple background - use for main actions only.

```jsx
<button className="btn btn-primary">Create Agent</button>
```

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.btn-primary {
  background: var(--brand-primary);  /* #8251EE */
  color: white;
  border: none;
}
.btn-primary:hover { background: var(--brand-hover); }
```

### Secondary Button
Grey outline - NOT purple.

```jsx
<button className="btn btn-secondary">Cancel</button>
```

```css
.btn-secondary {
  background: transparent;
  color: var(--text-primary);  /* white */
  border: 1px solid var(--border-strong);  /* #333333 */
}
.btn-secondary:hover {
  background: var(--bg-hover);  /* #2A2A2A */
}
```

### Ghost Button

```css
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);  /* #A1A1A1 */
  border: none;
}
.btn-ghost:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
```

### Icon Button

```css
.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  border: none;
}
.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
```

## Data Table

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);  /* #A1A1A1 - NOT lavender */
  border-bottom: 1px solid var(--border-default);
  background: transparent;
}

.data-table td {
  padding: 12px 16px;
  color: var(--text-primary);  /* #FFFFFF */
  border-bottom: 1px solid var(--border-subtle);
  background: transparent;
}

.data-table tbody tr:hover td {
  background: var(--bg-surface);  /* #1C1C1C */
}

/* Selected row - purple indicator on LEFT EDGE only */
.data-table tbody tr.selected td {
  background: var(--bg-surface);
}
.data-table tbody tr.selected td:first-child {
  box-shadow: inset 3px 0 0 var(--brand-primary);  /* Purple bar */
}

.link {
  color: var(--text-link);  /* #A37EF5 - links can be purple */
  text-decoration: none;
}
.link:hover { text-decoration: underline; }
```

## Tabs

```css
.tabs {
  display: flex;
  gap: 24px;
  border-bottom: 1px solid var(--border-default);
}

.tab {
  padding: 12px 0;
  font-size: 14px;
  color: var(--text-secondary);  /* #A1A1A1 - grey for inactive */
  background: none;
  border: none;
  cursor: pointer;
  position: relative;
}

.tab:hover { color: var(--text-primary); }

.tab.active {
  color: var(--text-primary);  /* #FFFFFF */
  font-weight: 500;
}

/* Purple underline for active tab */
.tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--brand-primary);  /* #8251EE */
}
```

## Cards

**Cards use NEUTRAL GREY, not purple.**

```css
.card {
  background: var(--bg-card);  /* #141414 - NOT purple */
  border: 1px solid var(--border-default);  /* #2A2A2A */
  border-radius: var(--radius-lg);
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-subtle);
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);  /* #FFFFFF */
  margin: 0;
}

.card-content {
  padding: 16px 20px;
}
```

## Form Inputs

```css
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);  /* #FFFFFF */
}

.required { color: var(--error); }

.input {
  padding: 10px 12px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-surface);  /* #1C1C1C */
  border: 1px solid var(--border-default);  /* #2A2A2A */
  border-radius: var(--radius-md);
}

.input::placeholder { color: var(--text-muted); }
.input:hover { border-color: var(--border-strong); }
.input:focus {
  border-color: var(--brand-primary);  /* Purple focus ring */
  box-shadow: var(--shadow-focus);
  outline: none;
}

.form-hint {
  font-size: 12px;
  color: var(--text-muted);  /* #6B6B6B */
}
```

## Modal / Dialog

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--bg-card);  /* #141414 - NOT purple */
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  max-width: 540px;
  width: 100%;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-body { padding: 24px; }

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-subtle);
}
```

## Sidebar Navigation

```css
.sidebar {
  width: 56px;
  background: var(--bg-sidebar);  /* #0D0D0D */
  border-right: 1px solid var(--border-subtle);
}

.sidebar-item {
  width: 40px;
  height: 40px;
  margin: 4px auto;
  border-radius: var(--radius-lg);
  color: var(--text-muted);  /* #6B6B6B - grey icons */
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* Active - purple icon only */
.sidebar-item.active {
  background: var(--bg-surface);
  color: var(--brand-light);  /* #A37EF5 - purple for active */
}
```

## Search Input

```css
.search-input {
  position: relative;
  width: 240px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-field {
  width: 100%;
  padding: 8px 12px 8px 36px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
}

.search-field:focus {
  border-color: var(--brand-primary);
  box-shadow: var(--shadow-focus);
}
```

## Pagination

```css
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.pagination-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.pagination-page {
  min-width: 32px;
  height: 32px;
  font-size: 13px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
}

.pagination-page:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.pagination-page.active {
  background: var(--bg-surface);
  color: var(--text-primary);
}
```

## Badge / Tag

```css
.badge {
  display: inline-flex;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-sm);
}

.badge-default {
  background: var(--bg-surface);  /* Grey, NOT purple */
  color: var(--text-secondary);
}

.badge-success {
  background: var(--success-muted);
  color: var(--success);
}

.badge-warning {
  background: var(--warning-muted);
  color: var(--warning);
}

.badge-error {
  background: var(--error-muted);
  color: var(--error);
}

/* Purple badge - use sparingly for special emphasis */
.badge-brand {
  background: var(--brand-muted);
  color: var(--brand-light);
}
```

## Checkbox and Radio

```css
.checkbox,
.radio {
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);  /* Grey */
}

.checkbox { border-radius: var(--radius-sm); }
.radio { border-radius: 50%; }

/* Checked state - purple */
.checkbox:checked,
.radio:checked {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
}
```

## Color Usage Summary

| Component | Purple? | Colors |
|-----------|---------|--------|
| Primary Button | ✅ | bg: #8251EE |
| Secondary Button | ❌ | border: #333333, text: #FFFFFF |
| Card | ❌ | bg: #141414 |
| Modal | ❌ | bg: #141414 |
| Table Header | ❌ | text: #A1A1A1 |
| Table Row | ❌ | bg: transparent / #1C1C1C hover |
| Selected Row | ✅ | left border: #8251EE |
| Active Tab | ✅ | underline: #8251EE |
| Inactive Tab | ❌ | text: #6B6B6B |
| Active Sidebar | ✅ | icon: #A37EF5 |
| Inactive Sidebar | ❌ | icon: #6B6B6B |
| Input Focus | ✅ | border: #8251EE |
| Links | ✅ | text: #A37EF5 |
