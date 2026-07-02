// ============================================
// SMART BEEHIVES - Authentication Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  checkExistingSession();
  setupAuthUI();
});

// Redirect if already logged in
async function checkExistingSession() {
  const user = await Auth.getUser();
  if (user) redirectToDashboard();
}

function redirectToDashboard() {
  window.location.href = 'dashboard.html';
}

// ---- UI Setup ----
function setupAuthUI() {
  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Role selection
  document.querySelectorAll('.role-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.role-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      document.getElementById('selectedRole').value = opt.dataset.role;
    });
  });

  // Password toggle
  document.querySelectorAll('.input-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
      }
    });
  });

  // Forms
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('signupForm')?.addEventListener('submit', handleSignup);
  document.getElementById('forgotLink')?.addEventListener('click', handleForgotPassword);
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signupForm').classList.toggle('hidden', tab !== 'signup');
  clearError();
}

// ---- Login ----
async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn      = document.getElementById('loginBtn');

  if (!email || !password) return showError('Please fill in all fields.');

  setLoading(btn, true);
  clearError();

  const { data, error } = await Auth.signIn(email, password);

  if (error) {
    showError(error.message || 'Login failed. Please check your credentials.');
    setLoading(btn, false);
    return;
  }

  // Store user info
  const user = data?.user;
  if (user) {
    localStorage.setItem('sb_user_name', user.user_metadata?.full_name || email.split('@')[0]);
    localStorage.setItem('sb_user_role', user.user_metadata?.role || 'farmer');
    localStorage.setItem('sb_user_email', user.email);
  }

  showToastGlobal('Welcome back! Loading dashboard...', 'success');
  setTimeout(redirectToDashboard, 800);
}

// ---- Signup ----
async function handleSignup(e) {
  e.preventDefault();
  const name     = document.getElementById('signupName').value.trim();
  const email    = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm  = document.getElementById('signupConfirm').value;
  const role     = document.getElementById('selectedRole').value;
  const btn      = document.getElementById('signupBtn');

  if (!name || !email || !password || !confirm) return showError('Please fill in all fields.');
  if (password !== confirm) return showError('Passwords do not match.');
  if (password.length < 6) return showError('Password must be at least 6 characters.');

  setLoading(btn, true);
  clearError();

  const { data, error } = await Auth.signUp(email, password, { full_name: name, role });

  if (error) {
    showError(error.message || 'Signup failed. Please try again.');
    setLoading(btn, false);
    return;
  }

  // Demo mode: auto login
  if (!supabase) {
    localStorage.setItem('sb_user_name', name);
    localStorage.setItem('sb_user_role', role);
    localStorage.setItem('sb_user_email', email);
    showToastGlobal('Account created! Redirecting...', 'success');
    setTimeout(redirectToDashboard, 800);
    return;
  }

  showError('✅ Account created! Please check your email to verify your account.', 'success');
  setLoading(btn, false);
}

// ---- Forgot Password ----
async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  if (!email) return showError('Enter your email address first.');

  const { error } = await Auth.resetPassword(email);
  if (error) return showError(error.message);
  showError('✅ Password reset email sent! Check your inbox.', 'success');
}

// ---- Helpers ----
function showError(msg, type = 'error') {
  const el = document.getElementById('authError');
  if (!el) return;
  el.textContent = msg;
  el.className = `auth-error show ${type === 'success' ? 'success-msg' : ''}`;
  if (type === 'success') {
    el.style.background = 'rgba(34,197,94,0.1)';
    el.style.borderColor = 'rgba(34,197,94,0.3)';
    el.style.color = 'var(--success)';
  }
}

function clearError() {
  const el = document.getElementById('authError');
  if (el) { el.className = 'auth-error'; el.style = ''; }
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="spinner"></span> Please wait...'
    : btn.dataset.text || 'Submit';
}

function showToastGlobal(msg, type = 'info') {
  const container = document.getElementById('toastContainer') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function createToastContainer() {
  const c = document.createElement('div');
  c.id = 'toastContainer';
  c.className = 'toast-container';
  document.body.appendChild(c);
  return c;
}
