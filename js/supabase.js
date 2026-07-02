// ============================================
// SMART BEEHIVES - Supabase Configuration
// ============================================
// Replace these values with your actual Supabase project credentials
// Dashboard: https://app.supabase.com

const SUPABASE_CONFIG = {
  url: 'gccmpqgjegevksgiwdnc',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjY21wcWdqZWdldmtzZ2l3ZG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDI1ODAsImV4cCI6MjA5NTIxODU4MH0.33__VgCHChG0xyw52zhCmPf571wQyHxw_KEEZTVk2K0'
};

// Initialize Supabase client
// Import via CDN in HTML: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
let supabase = null;
 
function initSupabase() {
  if (typeof window.supabase !== 'undefined') {
    supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      },
      realtime: {
        params: { eventsPerSecond: 10 }
      }
    });
    console.log('✅ Supabase initialized');
    return supabase;
  } else {
    console.warn('⚠️ Supabase SDK not loaded. Using demo mode.');
    return null;
  }
}

// ---- Auth Helpers ----
const Auth = {
  async signUp(email, password, metadata) {
    if (!supabase) return { error: { message: 'Demo mode - Supabase not connected' } };
    return await supabase.auth.signUp({ email, password, options: { data: metadata } });
  },

  async signIn(email, password) {
    if (!supabase) {
      // Demo mode: accept any credentials
      const demoUser = { id: 'demo-user', email, user_metadata: { full_name: 'Demo Admin', role: 'admin' } };
      sessionStorage.setItem('sb_demo_user', JSON.stringify(demoUser));
      return { data: { user: demoUser }, error: null };
    }
    return await supabase.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    sessionStorage.removeItem('sb_demo_user');
    if (!supabase) return;
    return await supabase.auth.signOut();
  },

  async getUser() {
    const demo = sessionStorage.getItem('sb_demo_user');
    if (demo) return JSON.parse(demo);
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  },

  async resetPassword(email) {
    if (!supabase) return { error: null };
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/index.html`
    });
  }
};

// ---- Database Helpers ----
const DB = {
  async getHives() {
    if (!supabase) return { data: DEMO_DATA.hives, error: null };
    return await supabase.from('beehives').select(`*, hive_sensors(*), gps_locations(*)`).order('created_at', { ascending: false });
  },

  async getHive(id) {
    if (!supabase) return { data: DEMO_DATA.hives.find(h => h.id === id), error: null };
    return await supabase.from('beehives').select(`*, hive_sensors(*), gps_locations(*), hive_logs(*)`).eq('id', id).single();
  },

  async createHive(hiveData) {
    if (!supabase) return { data: { ...hiveData, id: 'demo-' + Date.now() }, error: null };
    return await supabase.from('beehives').insert(hiveData).select().single();
  },

  async updateHive(id, updates) {
    if (!supabase) return { data: updates, error: null };
    return await supabase.from('beehives').update(updates).eq('id', id).select().single();
  },

  async deleteHive(id) {
    if (!supabase) return { error: null };
    return await supabase.from('beehives').delete().eq('id', id);
  },

  async getNotifications(limit = 20) {
    if (!supabase) return { data: DEMO_DATA.notifications, error: null };
    return await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit);
  },

  async getHoneyRecords(hiveId) {
    if (!supabase) return { data: DEMO_DATA.honeyRecords, error: null };
    return await supabase.from('honey_records').select('*').eq('hive_id', hiveId).order('recorded_at', { ascending: true });
  },

  async getHealthReports(hiveId) {
    if (!supabase) return { data: DEMO_DATA.healthReports, error: null };
    return await supabase.from('bee_health_reports').select('*').eq('hive_id', hiveId).order('created_at', { ascending: false }).limit(10);
  },

  async logSprayActivity(data) {
    if (!supabase) return { data, error: null };
    return await supabase.from('spray_activities').insert(data).select().single();
  },

  async getSensorLogs(hiveId, limit = 50) {
    if (!supabase) return { data: DEMO_DATA.sensorLogs, error: null };
    return await supabase.from('hive_logs').select('*').eq('hive_id', hiveId).order('logged_at', { ascending: false }).limit(limit);
  }
};

// ---- Realtime Subscriptions ----
const Realtime = {
  channels: {},

  subscribeToHive(hiveId, callback) {
    if (!supabase) return null;
    const channel = supabase.channel(`hive-${hiveId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hive_sensors', filter: `hive_id=eq.${hiveId}` }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hive_logs',    filter: `hive_id=eq.${hiveId}` }, callback)
      .subscribe();
    this.channels[`hive-${hiveId}`] = channel;
    return channel;
  },

  subscribeToNotifications(callback) {
    if (!supabase) return null;
    const channel = supabase.channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, callback)
      .subscribe();
    this.channels['notifications'] = channel;
    return channel;
  },

  subscribeToAllHives(callback) {
    if (!supabase) return null;
    const channel = supabase.channel('all-hives')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hive_sensors' }, callback)
      .subscribe();
    this.channels['all-hives'] = channel;
    return channel;
  },

  unsubscribe(key) {
    if (this.channels[key]) {
      supabase?.removeChannel(this.channels[key]);
      delete this.channels[key];
    }
  },

  unsubscribeAll() {
    Object.keys(this.channels).forEach(k => this.unsubscribe(k));
  }
};

// ---- Storage Helpers ----
const Storage = {
  async uploadHiveImage(hiveId, file) {
    if (!supabase) return { data: null, error: null };
    const ext = file.name.split('.').pop();
    const path = `hives/${hiveId}/image.${ext}`;
    const { data, error } = await supabase.storage.from('hive-images').upload(path, file, { upsert: true });
    if (error) return { data: null, error };
    const { data: urlData } = supabase.storage.from('hive-images').getPublicUrl(path);
    return { data: urlData.publicUrl, error: null };
  }
};

// ============================================
// DEMO DATA (used when Supabase is not connected)
// ============================================
const DEMO_DATA = {
  hives: [
    {
      id: 'hive-001', name: 'Alpha Hive', location_name: 'North Field', status: 'active',
      installation_date: '2024-01-15', assigned_farmer: 'John Mwangi',
      gps_locations: [{ latitude: -1.2921, longitude: 36.8219 }],
      hive_sensors: [{
        temperature: 34.5, humidity: 62, weight: 28.4, battery: 87,
        is_online: true, last_updated: new Date().toISOString()
      }]
    },
    {
      id: 'hive-002', name: 'Beta Hive', location_name: 'South Garden', status: 'active',
      installation_date: '2024-02-10', assigned_farmer: 'Mary Wanjiku',
      gps_locations: [{ latitude: -1.3021, longitude: 36.8319 }],
      hive_sensors: [{
        temperature: 36.1, humidity: 58, weight: 31.2, battery: 72,
        is_online: true, last_updated: new Date().toISOString()
      }]
    },
    {
      id: 'hive-003', name: 'Gamma Hive', location_name: 'East Orchard', status: 'warning',
      installation_date: '2024-03-05', assigned_farmer: 'Peter Kamau',
      gps_locations: [{ latitude: -1.2821, longitude: 36.8419 }],
      hive_sensors: [{
        temperature: 38.9, humidity: 45, weight: 22.1, battery: 31,
        is_online: true, last_updated: new Date().toISOString()
      }]
    },
    {
      id: 'hive-004', name: 'Delta Hive', location_name: 'West Meadow', status: 'offline',
      installation_date: '2024-01-28', assigned_farmer: 'Grace Njeri',
      gps_locations: [{ latitude: -1.2721, longitude: 36.8119 }],
      hive_sensors: [{
        temperature: 0, humidity: 0, weight: 19.8, battery: 5,
        is_online: false, last_updated: new Date(Date.now() - 3600000).toISOString()
      }]
    },
    {
      id: 'hive-005', name: 'Epsilon Hive', location_name: 'Central Farm', status: 'active',
      installation_date: '2024-04-12', assigned_farmer: 'James Ochieng',
      gps_locations: [{ latitude: -1.2621, longitude: 36.8519 }],
      hive_sensors: [{
        temperature: 33.8, humidity: 65, weight: 35.6, battery: 94,
        is_online: true, last_updated: new Date().toISOString()
      }]
    },
    {
      id: 'hive-006', name: 'Zeta Hive', location_name: 'Hilltop Station', status: 'active',
      installation_date: '2024-05-01', assigned_farmer: 'Sarah Akinyi',
      gps_locations: [{ latitude: -1.2521, longitude: 36.8619 }],
      hive_sensors: [{
        temperature: 35.2, humidity: 60, weight: 29.9, battery: 81,
        is_online: true, last_updated: new Date().toISOString()
      }]
    }
  ],

  notifications: [
    { id: 1, type: 'critical', title: 'High Temperature Alert', message: 'Gamma Hive temperature reached 38.9°C', hive_name: 'Gamma Hive', created_at: new Date(Date.now()-300000).toISOString(), is_read: false },
    { id: 2, type: 'warning',  title: 'Low Battery Warning',   message: 'Gamma Hive battery at 31%', hive_name: 'Gamma Hive', created_at: new Date(Date.now()-600000).toISOString(), is_read: false },
    { id: 3, type: 'critical', title: 'Hive Offline',          message: 'Delta Hive has gone offline', hive_name: 'Delta Hive', created_at: new Date(Date.now()-900000).toISOString(), is_read: false },
    { id: 4, type: 'success',  title: 'Harvest Ready',         message: 'Epsilon Hive weight reached 35.6kg - ready for harvest', hive_name: 'Epsilon Hive', created_at: new Date(Date.now()-1800000).toISOString(), is_read: true },
    { id: 5, type: 'info',     title: 'Spray Completed',       message: 'Beta Hive automated spray cycle completed', hive_name: 'Beta Hive', created_at: new Date(Date.now()-3600000).toISOString(), is_read: true }
  ],

  honeyRecords: [
    { recorded_at: '2024-01-01', weight_kg: 12.0 }, { recorded_at: '2024-02-01', weight_kg: 15.5 },
    { recorded_at: '2024-03-01', weight_kg: 19.2 }, { recorded_at: '2024-04-01', weight_kg: 22.8 },
    { recorded_at: '2024-05-01', weight_kg: 26.1 }, { recorded_at: '2024-06-01', weight_kg: 28.4 }
  ],

  healthReports: [
    { id: 1, status: 'healthy', disease_detected: false, confidence: 97, notes: 'Colony strong, queen active', created_at: new Date().toISOString() },
    { id: 2, status: 'healthy', disease_detected: false, confidence: 94, notes: 'Normal activity levels', created_at: new Date(Date.now()-86400000).toISOString() }
  ],

  sensorLogs: Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    temperature: (33 + Math.random() * 5).toFixed(1),
    humidity: (55 + Math.random() * 15).toFixed(0),
    weight: (27 + Math.random() * 3).toFixed(1),
    logged_at: new Date(Date.now() - i * 1800000).toISOString()
  }))
};
