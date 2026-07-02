// ============================================
// SMART BEEHIVES - Shared Layout Components
// ============================================

function buildSidebar(activePage = '') {
  const navItems = [
    { href: 'dashboard.html',          icon: '🏠', label: 'Dashboard',        section: 'main' },
    { href: 'pages/hive-monitoring.html', icon: '🐝', label: 'Hive Monitoring',  section: 'main' },
    { href: 'pages/bee-health.html',   icon: '🏥', label: 'Bee Health',        section: 'main' },
    { href: 'pages/honey-analytics.html', icon: '📊', label: 'Honey Analytics',  section: 'main' },
    { href: 'pages/notifications.html',icon: '🔔', label: 'Notifications',     section: 'main', badge: true },
    { href: 'pages/hive-map.html',     icon: '🗺️', label: 'Hive Map',          section: 'main' },
    { href: 'pages/reports.html',      icon: '📋', label: 'Reports',           section: 'manage' },
    { href: 'pages/farmers.html',      icon: '👨‍🌾', label: 'Farmer Management', section: 'manage' },
    { href: 'pages/sensors.html',      icon: '📡', label: 'Sensor Status',     section: 'manage' },
    { href: 'pages/ai-center.html',    icon: '🤖', label: 'AI Center',         section: 'manage' },
    { href: 'pages/settings.html',     icon: '⚙️', label: 'Settings',          section: 'system' },
  ];

  const mainItems   = navItems.filter(n => n.section === 'main');
  const manageItems = navItems.filter(n => n.section === 'manage');
  const systemItems = navItems.filter(n => n.section === 'system');

  const renderItems = items => items.map(item => {
    const isActive = activePage === item.href || window.location.pathname.endsWith(item.href.replace('pages/', ''));
    return `<a href="${item.href}" class="nav-item ${isActive ? 'active' : ''}">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
      ${item.badge ? '<span class="nav-badge hidden" id="navNotifBadge">0</span>' : ''}
    </a>`;
  }).join('');

  return `
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">🍯</div>
      <div class="sidebar-logo-text">
        <h2>SmartHives</h2>
        <span>IoT Platform v2.0</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section-label">Overview</div>
      ${renderItems(mainItems)}
      <div class="nav-section-label">Management</div>
      ${renderItems(manageItems)}
      <div class="nav-section-label">System</div>
      ${renderItems(systemItems)}
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="user-avatar"><span class="user-avatar-text">AD</span></div>
        <div class="user-info">
          <div class="user-name user-name-display">Admin User</div>
          <div class="user-role user-role-display">Administrator</div>
        </div>
        <button id="logoutBtn" title="Logout" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">🚪</button>
      </div>
    </div>
  </aside>`;
}

function buildTopbar(title, subtitle = '') {
  return `
  <header class="topbar">
    <div class="topbar-left">
      <button class="sidebar-toggle" id="sidebarToggle">☰</button>
      <div>
        <div class="topbar-title">${title}</div>
        ${subtitle ? `<div class="topbar-subtitle">${subtitle}</div>` : ''}
      </div>
    </div>
    <div class="topbar-right">
      <div class="realtime-indicator">
        <span class="pulse-dot online"></span>
        <span id="realtimeStatus">Live</span>
      </div>
      <button class="topbar-btn" onclick="window.location.href='pages/notifications.html'" title="Notifications">
        🔔 <span class="notif-count hidden">0</span>
      </button>
      <button class="topbar-btn" onclick="window.location.href='pages/settings.html'" title="Settings">⚙️</button>
    </div>
  </header>`;
}

function injectLayout(activePage, title, subtitle) {
  const app = document.getElementById('app');
  if (!app) return;
  const sidebar = buildSidebar(activePage);
  const topbar  = buildTopbar(title, subtitle);
  app.insertAdjacentHTML('afterbegin', sidebar);
  document.getElementById('mainContent')?.insertAdjacentHTML('afterbegin', topbar);
}

// Sidebar overlay for mobile
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('sidebarOverlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }
});
