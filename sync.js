/* NSUPURE field-app synchronization.
   Data always saves locally first. Network failure leaves the event in the
   queue, so a poor connection never discards work. */
const Sync = {
  CONFIG_KEY: 'nsupure_sync_config',
  QUEUE_KEY: 'nsupure_sync_queue',
  DEVICE_KEY: 'nsupure_device_id',
  TOKEN_KEY: 'nsupure_sync_token',
  CURSOR_KEY: 'nsupure_sync_cursor',
  get config() { return JSON.parse(localStorage.getItem(this.CONFIG_KEY) || '{"apiUrl":""}'); },
  get token() { return sessionStorage.getItem(this.TOKEN_KEY) || ''; },
  get deviceId() {
    let value = localStorage.getItem(this.DEVICE_KEY);
    if (!value) { value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; localStorage.setItem(this.DEVICE_KEY, value); }
    return value;
  },
  get queue() { try { return JSON.parse(localStorage.getItem(this.QUEUE_KEY) || '[]'); } catch { return []; } },
  set queue(items) { localStorage.setItem(this.QUEUE_KEY, JSON.stringify(items)); },
  baseUrl() { return (this.config.apiUrl || '').replace(/\/$/, ''); },
  status() {
    if (!navigator.onLine) return 'Offline — saved on this device';
    if (!this.baseUrl()) return 'Offline-ready — connect this device to sync';
    if (!this.token) return 'Connection needs sign-in';
    return this.queue.length ? `${this.queue.length} change(s) waiting to sync` : 'Synced and ready';
  },
  enqueue(entity, action, payload) {
    const event = { eventId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, entity, entityId: payload.id, action, payload, occurredAt: new Date().toISOString() };
    this.queue = [...this.queue, event];
    this.renderStatus();
  },
  renderStatus() {
    const node = document.getElementById('sync-status');
    if (node) node.textContent = `☁️ ${this.status()}`;
  },
  async login(apiUrl, username, password) {
    const base = apiUrl.replace(/\/$/, '');
    const response = await fetch(`${base}/api/v1/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password}) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.data?.token) throw new Error(result?.message || 'Sign-in failed');
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify({apiUrl:base}));
    sessionStorage.setItem(this.TOKEN_KEY, result.data.token);
    await this.sync();
  },
  async request(path, options={}) {
    const response = await fetch(`${this.baseUrl()}${path}`, { ...options, headers:{'Content-Type':'application/json', Authorization:`Bearer ${this.token}`, ...(options.headers || {})} });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.message || 'Sync request failed');
    return result;
  },
  async sync() {
    if (!navigator.onLine || !this.baseUrl() || !this.token) { this.renderStatus(); return; }
    const queued = this.queue;
    try {
      if (queued.length) {
        await this.request('/api/v1/mobile-sync/events', {method:'POST', body:JSON.stringify({deviceId:this.deviceId, events:queued})});
        this.queue = this.queue.filter(item => !queued.some(sent => sent.eventId === item.eventId));
      }
      const result = await this.request(`/api/v1/mobile-sync/events?after=${encodeURIComponent(localStorage.getItem(this.CURSOR_KEY) || new Date(0).toISOString())}`);
      for (const event of result.data.events || []) DB.applyRemote(event);
      localStorage.setItem(this.CURSOR_KEY, result.data.serverTime || new Date().toISOString());
      this.renderStatus();
      if (typeof renderSection === 'function') renderSection(currentSection);
    } catch (error) {
      console.warn('NSUPURE sync deferred:', error.message);
      this.renderStatus();
    }
  }
};

window.addEventListener('online', () => Sync.sync());
