# Foundry NextGen Patterns

Page layouts and composition patterns for the Foundry design system.

## Page Layout Structure

```
┌────────────────────────────────────────────────────────────────┐
│  Topbar (48px) - #0D0D0D bg                                    │
├────┬───────────────────────────────────────────────────────────┤
│    │  Page Content Area - #0A0A0A bg                           │
│ S  │  ┌──────────────────────────────────────────────────┐    │
│ i  │  │ Page Header (Title + Actions)                    │    │
│ d  │  ├──────────────────────────────────────────────────┤    │
│ e  │  │ Tab Navigation (if any)                          │    │
│ b  │  ├──────────────────────────────────────────────────┤    │
│ a  │  │ Main Content                                     │    │
│ r  │  │ Cards: #141414 bg                               │    │
│    │  └──────────────────────────────────────────────────┘    │
└────┴───────────────────────────────────────────────────────────┘
```

## Entity List Page

Standard pattern for listing resources (agents, models, deployments).

```jsx
function EntityListPage() {
  return (
    <div className="page">
      {/* Page header */}
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Entity list <span className="count">(100)</span></h1>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary">Create</button>
        </div>
      </header>

      {/* Tabs - if needed */}
      <nav className="tabs">
        <button className="tab active">First tab</button>
        <button className="tab">Second tab</button>
        <button className="tab">Third tab</button>
      </nav>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-input">
          <Search className="search-icon" size={16} />
          <input className="search-field" placeholder="Search" />
        </div>
      </div>

      {/* Data table */}
      <table className="data-table">
        <thead>
          <tr>
            <th></th>
            <th>Name ↓</th>
            <th>Description</th>
            <th>Created on</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className={item.selected ? 'selected' : ''}>
              <td><input type="radio" name="row" /></td>
              <td><a className="link">{item.name}</a></td>
              <td className="text-secondary">{item.description}</td>
              <td className="text-secondary">{item.createdAt}</td>
              <td>
                <button className="btn-icon"><MoreVertical size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <span className="pagination-info">1-10 of 100</span>
        <div className="pagination-controls">
          <button className="pagination-page">‹</button>
          <button className="pagination-page active">1</button>
          <button className="pagination-page">2</button>
          <button className="pagination-page">3</button>
          <button className="pagination-page">›</button>
        </div>
      </div>
    </div>
  );
}
```

```css
.page {
  background: var(--bg-page);  /* #0A0A0A */
  min-height: 100vh;
  color: var(--text-primary);  /* #FFFFFF */
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.page-title .count {
  color: var(--text-secondary);
  font-weight: 400;
}

.toolbar {
  padding: 16px 32px;
}

.text-secondary {
  color: var(--text-secondary);  /* #A1A1A1 */
}
```

## Detail Page with Split View

Pattern for viewing an entity with code/config panel.

```jsx
function DetailPage() {
  return (
    <div className="page">
      {/* Header with title and actions */}
      <header className="page-header">
        <h1 className="page-title">Title</h1>
        <div className="page-actions">
          <button className="btn btn-primary">Button</button>
          <button className="btn btn-secondary">Button</button>
          <button className="btn-icon"><MoreVertical size={16} /></button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tabs">
        <button className="tab">First tab</button>
        <button className="tab">Second tab</button>
        <button className="tab active">Third tab</button>
      </nav>

      {/* Split view content */}
      <div className="split-view">
        {/* Left: Info panel */}
        <div className="info-panel">
          <div className="toolbar">
            <button className="btn btn-secondary">Button</button>
            <button className="btn btn-secondary">Button</button>
          </div>
          
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Deployment info</h3>
            </div>
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">Name</span>
                <span className="info-value">GPT-5</span>
              </div>
              <div className="info-row">
                <span className="info-label">Provisioning state</span>
                <span className="info-value">Succeeded</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Code panel */}
        <div className="code-panel">
          <div className="code-header">
            <div className="code-field">
              <label className="code-label">Target URI</label>
              <div className="code-value">
                <code>endpoint-aip-2i93niml...</code>
                <button className="btn-icon"><Copy size={14} /></button>
              </div>
            </div>
            <div className="code-field">
              <label className="code-label">Key</label>
              <div className="code-value">
                <code>••••••••••••••••••••••</code>
                <button className="btn-icon"><Eye size={14} /></button>
                <button className="btn-icon"><Copy size={14} /></button>
              </div>
            </div>
          </div>
          
          <div className="code-tabs">
            <button className="code-tab active">Python</button>
            <button className="code-tab">Azure Foundry ADK</button>
          </div>
          
          <pre className="code-block">
            <code>{codeSnippet}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
```

```css
.split-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--border-subtle);
}

.info-panel,
.code-panel {
  background: var(--bg-page);  /* #0A0A0A */
  padding: 24px;
}

.card {
  background: var(--bg-card);  /* #141414 - NOT purple */
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.info-label { color: var(--text-secondary); }
.info-value { color: var(--text-primary); }

.code-panel {
  background: var(--bg-card);  /* #141414 */
}

.code-block {
  background: var(--bg-surface);  /* #1C1C1C */
  padding: 16px;
  border-radius: var(--radius-md);
  font-family: 'SF Mono', monospace;
  font-size: 13px;
  color: var(--text-primary);
}
```

## Modal Form Pattern

Standard modal with form fields.

```jsx
function CreateModal({ onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Create a knowledge source</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        
        <div className="modal-body">
          {/* Source type indicator */}
          <div className="source-indicator">
            <DatabaseIcon size={20} />
            <div>
              <div className="source-name">Microsoft OneLake</div>
              <div className="source-desc">Retrieve from Microsoft OneLake unstructured data</div>
            </div>
          </div>
          
          {/* Form fields */}
          <div className="form-field">
            <label className="form-label">Name <span className="required">*</span></label>
            <input className="input" placeholder="thoa-onelake" />
          </div>
          
          <div className="form-field">
            <label className="form-label">Paste any Lakehouse URL <span className="required">*</span></label>
            <input className="input" placeholder="Enter Lakehouse URL..." />
            <span className="form-hint">Paste the full Lakehouse URL including workspaceId parameter.</span>
          </div>
          
          <div className="form-field">
            <label className="form-label">Content extraction mode</label>
            <select className="input">
              <option>Minimal</option>
              <option>Standard</option>
              <option>Full</option>
            </select>
          </div>
          
          <div className="checkbox-field">
            <input type="checkbox" className="checkbox" />
            <label>Include embedding model</label>
            <span className="badge badge-brand">Recommended</span>
          </div>
          
          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea className="input textarea" placeholder="e.g., October 2025 retail metrics..." />
          </div>
          
          <details className="advanced-toggle">
            <summary>Show advanced options</summary>
            {/* Advanced fields */}
          </details>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-primary">Create</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
```

```css
.modal {
  background: var(--bg-card);  /* #141414 - NOT purple */
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  max-width: 540px;
}

.source-indicator {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-surface);  /* #1C1C1C */
  border-radius: var(--radius-md);
  margin-bottom: 24px;
}

.source-name {
  font-weight: 500;
  color: var(--text-primary);
}

.source-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.advanced-toggle {
  color: var(--text-secondary);
  cursor: pointer;
}

.advanced-toggle summary {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

## Sidebar Navigation

```jsx
function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <FoundryLogo />
      </div>
      
      <nav className="sidebar-nav">
        <SidebarItem icon={Home} active />
        <SidebarItem icon={Layers} />
        <SidebarItem icon={Box} />
        <SidebarItem icon={Database} />
        <SidebarItem icon={Settings} />
      </nav>
    </aside>
  );
}
```

```css
.sidebar {
  width: 56px;
  background: var(--bg-sidebar);  /* #0D0D0D */
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  padding: 12px 0;
}

.sidebar-logo {
  padding: 12px;
  margin-bottom: 8px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px;
}

.sidebar-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  color: var(--text-muted);  /* #6B6B6B - grey */
  cursor: pointer;
}

.sidebar-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.sidebar-item.active {
  background: var(--bg-surface);
  color: var(--brand-light);  /* #A37EF5 - purple for active */
}
```

## Color Application Summary

### Pages and Containers
| Element | Background | Border |
|---------|------------|--------|
| Page | #0A0A0A | none |
| Sidebar | #0D0D0D | #1F1F1F right |
| Topbar | #0D0D0D | #1F1F1F bottom |
| Card | #141414 | #2A2A2A |
| Modal | #141414 | #2A2A2A |
| Code block | #1C1C1C | none |

### Interactive Elements
| Element | Default | Hover | Active/Selected |
|---------|---------|-------|-----------------|
| Primary btn | #8251EE bg | #9366F5 bg | - |
| Secondary btn | transparent, #333 border | #2A2A2A bg | - |
| Sidebar icon | #6B6B6B | #FFFFFF | #A37EF5 (purple) |
| Tab | #6B6B6B text | #FFFFFF text | #FFFFFF + purple underline |
| Table row | transparent | #1C1C1C | #1C1C1C + purple left bar |

### Text
| Usage | Color |
|-------|-------|
| Primary (titles, body) | #FFFFFF |
| Secondary (labels, hints) | #A1A1A1 |
| Muted (placeholders, disabled) | #6B6B6B |
| Links | #A37EF5 |
