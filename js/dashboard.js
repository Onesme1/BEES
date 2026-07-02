// ============================================
// SMART BEEHIVES - Dashboard Logic
// ============================================

let allHives = [];
let notifications = [];
let realtimeInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  await requireAuth();
  loadUserInfo();
  await initDashboard();
  setupSidebar();
  setupModals();
  startRealtimeSimulation();
  subscribeRealtime();
});

// ---- Auth Guard ----
async function requireAuth() {
  const user = await Auth.getUser();
  if (!user) window.location.href = 'index.html';
  return user;
}

// ---- Load User Info ----
function loadUserInfo() {
  const name  = localStorage.getItem('sb_user_name') || 'Admin';
  const role  = localStorage.getItem('sb_user_role') || 'admin';
  const email = localStorage.getItem('sb_user_email') || '';

  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  document.querySelectorAll('.user-name-display').forEach(el => el.textContent = name);
  document.querySelectorAll('.user-role-display').forEach(el => el.textContent = capitalize(role));
  document.querySelectorAll('.user-avatar-text').forEach(el => el.textContent = initials);
}

// ---- Init Dashboard ----
async function initDashboard() {
  const { data, error } = await DB.getHives();
  if (error) { showToast('Failed to load hives: ' + error.message, 'error'); return; }
  allHives = data || [];
  renderStats();
  renderHiveCards();
  await loadNotifications();
}

// ---- Stats ----
function renderStats() {
  const total   = allHives.length;
  const active  = allHives.filter(h => h.status === 'active').length;
  const offline = allHives.filter(h => h.status === 'offline').length;
  const warning = allHives.filter(h => h.status === 'warning').length;

  const totalWeight = allHives.reduce((sum, h) => {
    const s = h.hive_sensors?.[0];
    return sum + (s?.weight || 0);
  }, 0);

  setEl('statTotal',   total);
  setEl('statActive',  active);
  setEl('statOffline', offline);
  setEl('statWeight',  totalWeight.toFixed(1) + ' kg');
  setEl('statWarning', warning);
}

// ---- Hive Cards ----
function renderHiveCards(filter = 'all') {
  const container = document.getElementById('hivesGrid');
  if (!container) return;

  const filtered = filter === 'all' ? allHives : allHives.filter(h => h.status === filter);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="glass-card p-24 text-center" style="grid-column:1/-1">
      <div style="font-size:48px;margin-bottom:12px">🐝</div>
      <p class="text-secondary">No hives found. Add your first hive!</p>
      <button class="btn btn-primary mt-16" onclick="openAddHiveModal()">+ Add Hive</button>
    </div>`;
    return;
  }

  container.innerHTML = filtered.map(hive => buildHiveCard(hive)).join('');
}

function buildHiveCard(hive) {
  const sensor  = hive.hive_sensors?.[0] || {};
  const gps     = hive.gps_locations?.[0] || {};
  const status  = hive.status || 'unknown';
  const online  = sensor.is_online !== false;
  const battery = sensor.battery || 0;
  const temp    = sensor.temperature || 0;
  const humid   = sensor.humidity || 0;
  const weight  = sensor.weight || 0;

  const statusBadge = {
    active:  '<span class="badge badge-success"><span class="pulse-dot online"></span> Active</span>',
    warning: '<span class="badge badge-warning"><span class="pulse-dot warning"></span> Warning</span>',
    offline: '<span class="badge badge-danger">⚫ Offline</span>',
    inactive:'<span class="badge badge-muted">⚪ Inactive</span>'
  }[status] || '<span class="badge badge-muted">Unknown</span>';

  const batteryColor = battery > 50 ? 'green' : battery > 20 ? 'honey' : 'red';
  const tempColor    = temp > 37 ? 'red' : temp > 35 ? 'honey' : 'green';

  return `
  <div class="glass-card hive-card" onclick="openHiveDetail('${hive.id}')" data-hive-id="${hive.id}">
    <div class="hive-card-header">
      <div class="hive-card-icon">🍯</div>
      <div>${statusBadge}</div>
    </div>
    <div class="hive-card-name">${hive.name}</div>
    <div class="hive-card-location">📍 ${hive.location_name || 'Unknown Location'}</div>
    <div class="hive-metrics">
      <div class="hive-metric">
        <div class="hive-metric-value" style="color:var(--${tempColor === 'green' ? 'success' : tempColor === 'red' ? 'danger' : 'honey'})">${online ? temp + '°C' : '--'}</div>
        <div class="hive-metric-label">🌡️ Temp</div>
      </div>
      <div class="hive-metric">
        <div class="hive-metric-value">${online ? humid + '%' : '--'}</div>
        <div class="hive-metric-label">💧 Humid</div>
      </div>
      <div class="hive-metric">
        <div class="hive-metric-value">${weight > 0 ? weight + 'kg' : '--'}</div>
        <div class="hive-metric-label">⚖️ Weight</div>
      </div>
    </div>
    <div class="hive-card-footer">
      <div style="flex:1">
        <div class="flex items-center gap-8 mb-8">
          <span class="text-xs text-muted">🔋 Battery</span>
          <span class="text-xs" style="color:var(--${batteryColor === 'green' ? 'success' : batteryColor === 'red' ? 'danger' : 'honey'})">${battery}%</span>
        </div>
        <div class="progress-bar"><div class="progress-fill ${batteryColor}" style="width:${battery}%"></div></div>
      </div>
      <div style="margin-left:16px;display:flex;gap:6px">
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();editHive('${hive.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();confirmDeleteHive('${hive.id}','${hive.name}')">🗑️</button>
      </div>
    </div>
    <div style="margin-top:10px;font-size:11px;color:var(--text-muted)">
      👤 ${hive.assigned_farmer || 'Unassigned'} &nbsp;|&nbsp; 📅 ${formatDate(hive.installation_date)}
    </div>
  </div>`;
}

// ---- Notifications ----
async function loadNotifications() {
  const { data } = await DB.getNotifications();
  notifications = data || [];
  renderNotifications();
  updateNotifBadge();
}

function renderNotifications() {
  const container = document.getElementById('alertList');
  if (!container) return;

  const icons = { critical: '🚨', warning: '⚠️', info: 'ℹ️', success: '✅' };
  const classes = { critical: 'critical', warning: 'warning', info: 'info', success: 'success' };

  container.innerHTML = notifications.slice(0, 8).map(n => `
    <div class="alert-item ${classes[n.type] || 'info'}">
      <span class="alert-icon">${icons[n.type] || 'ℹ️'}</span>
      <div class="alert-content">
        <div class="alert-title">${n.title}</div>
        <div class="alert-desc">${n.message} ${n.hive_name ? `<span class="text-honey">(${n.hive_name})</span>` : ''}</div>
      </div>
      <span class="alert-time">${timeAgo(n.created_at)}</span>
    </div>`).join('');
}

function updateNotifBadge() {
  const unread = notifications.filter(n => !n.is_read).length;
  document.querySelectorAll('.notif-count').forEach(el => {
    el.textContent = unread;
    el.style.display = unread > 0 ? 'flex' : 'none';
  });
  document.querySelectorAll('#navNotifBadge').forEach(el => {
    el.textContent = unread;
    el.style.display = unread > 0 ? 'inline' : 'none';
  });
}

// ---- Hive Detail Navigation ----
function openHiveDetail(hiveId) {
  window.location.href = `hive-detail.html?id=${hiveId}`;
}

// ---- Filter Hives ----
function filterHives(status) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === status));
  renderHiveCards(status);
}

// ---- Search ----
function searchHives(query) {
  const q = query.toLowerCase();
  const filtered = allHives.filter(h =>
    h.name.toLowerCase().includes(q) ||
    (h.location_name || '').toLowerCase().includes(q) ||
    (h.assigned_farmer || '').toLowerCase().includes(q)
  );
  const container = document.getElementById('hivesGrid');
  if (container) container.innerHTML = filtered.map(buildHiveCard).join('');
}

// ---- Add/Edit Hive Modal ----
function openAddHiveModal() {
  document.getElementById('hiveModalTitle').textContent = 'Add New Hive';
  document.getElementById('hiveForm').reset();
  document.getElementById('hiveIdField').value = '';
  openModal('hiveModal');
}

function editHive(hiveId) {
  const hive = allHives.find(h => h.id === hiveId);
  if (!hive) return;
  document.getElementById('hiveModalTitle').textContent = 'Edit Hive';
  document.getElementById('hiveIdField').value = hive.id;
  document.getElementById('hiveName').value = hive.name;
  document.getElementById('hiveLocation').value = hive.location_name || '';
  document.getElementById('hiveFarmer').value = hive.assigned_farmer || '';
  document.getElementById('hiveStatus').value = hive.status || 'active';
  document.getElementById('hiveLat').value = hive.gps_locations?.[0]?.latitude || '';
  document.getElementById('hiveLng').value = hive.gps_locations?.[0]?.longitude || '';
  openModal('hiveModal');
}

async function saveHive(e) {
  e.preventDefault();
  const id = document.getElementById('hiveIdField').value;
  const data = {
    name: document.getElementById('hiveName').value,
    location_name: document.getElementById('hiveLocation').value,
    assigned_farmer: document.getElementById('hiveFarmer').value,
    status: document.getElementById('hiveStatus').value,
    installation_date: document.getElementById('hiveInstallDate').value || new Date().toISOString().split('T')[0]
  };

  const btn = document.getElementById('saveHiveBtn');
  setLoading(btn, true);

  let result;
  if (id) {
    result = await DB.updateHive(id, data);
  } else {
    result = await DB.createHive(data);
  }

  setLoading(btn, false);

  if (result.error) { showToast('Error: ' + result.error.message, 'error'); return; }

  showToast(id ? 'Hive updated successfully!' : 'Hive added successfully!', 'success');
  closeModal('hiveModal');
  await initDashboard();
}

// ---- Delete Hive ----
function confirmDeleteHive(id, name) {
  document.getElementById('deleteHiveName').textContent = name;
  document.getElementById('confirmDeleteBtn').onclick = () => deleteHive(id);
  openModal('deleteModal');
}

async function deleteHive(id) {
  const { error } = await DB.deleteHive(id);
  if (error) { showToast('Delete failed: ' + error.message, 'error'); return; }
  showToast('Hive deleted.', 'success');
  closeModal('deleteModal');
  await initDashboard();
}

// ---- Sidebar ----
function setupSidebar() {
  const toggle  = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  toggle?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await Auth.signOut();
    window.location.href = 'index.html';
  });

  // Active nav
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('href') === currentPage);
  });
}

// ---- Modals ----
function setupModals() {
  document.querySelectorAll('.modal-close, [data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) modal.classList.remove('active');
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });
}

function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

// ---- Realtime Simulation (demo mode) ----
function startRealtimeSimulation() {
  if (supabase) return; // Use real Supabase realtime instead
  realtimeInterval = setInterval(() => {
    allHives.forEach(hive => {
      const s = hive.hive_sensors?.[0];
      if (!s || !s.is_online) return;
      s.temperature = +(s.temperature + (Math.random() - 0.5) * 0.4).toFixed(1);
      s.humidity    = Math.max(30, Math.min(90, +(s.humidity + (Math.random() - 0.5) * 1).toFixed(0)));
      s.weight      = +(s.weight + (Math.random() - 0.48) * 0.05).toFixed(1);
      s.last_updated = new Date().toISOString();
    });
    renderHiveCards();
    renderStats();
    updateRealtimeIndicator();
  }, 5000);
}

function updateRealtimeIndicator() {
  const el = document.getElementById('realtimeStatus');
  if (el) el.textContent = 'Live • ' + new Date().toLocaleTimeString();
}

// ---- Supabase Realtime ----
function subscribeRealtime() {
  Realtime.subscribeToAllHives(payload => {
    const updated = payload.new;
    const hive = allHives.find(h => h.id === updated.hive_id);
    if (hive && hive.hive_sensors?.[0]) {
      Object.assign(hive.hive_sensors[0], updated);
      renderHiveCards();
      renderStats();
    }
  });

  Realtime.subscribeToNotifications(payload => {
    notifications.unshift(payload.new);
    renderNotifications();
    updateNotifBadge();
    showToast(`🔔 ${payload.new.title}`, payload.new.type === 'critical' ? 'error' : 'warning');
  });
}

// ---- Toast ----
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ---- Utilities ----
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.text = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span>';
  } else {
    btn.innerHTML = btn.dataset.text || 'Save';
  }
}
