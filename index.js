// .api.* - mirrors REST API endpoints
// .ws.*  - helpers for Console and Stats WebSocket connections

const axios = require('axios');
const WebSocket = require('ws');

class TalorixConnect {
  /**
   * config: { panelUrl, key, timeoutMs }
   */
  constructor(config = {}) {
    if (!config || !config.panelUrl || !config.key) {
      throw new Error('panelUrl and key are required in config');
    }

    this.config = {
      panelUrl: config.panelUrl.replace(/\/$/, ''),
      key: config.key,
      timeoutMs: config.timeoutMs || 5000,
    };

    this._axios = axios.create({
      baseURL: this.config.panelUrl,
      timeout: this.config.timeoutMs,
      headers: {
        Authorization: `Bearer ${this.config.key}`,
        'Content-Type': 'application/json',
      },
    });

    // Namespaces
    this.api = {
      nodes: {},
      images: {},
      servers: {},
      users: {},
      settings: {},
    };

    this.ws = {
      console: (id, handlers = {}) => this._wsConsole(id, handlers),
      stats: (id, handlers = {}) => this._wsStats(id, handlers),
    };

    // bind API implementations
    this._bindApi();
  }

  // allow changing key at runtime
  setKey(key) {
    this.config.key = key;
    this._axios.defaults.headers.Authorization = `Bearer ${key}`;
  }

  setPanelUrl(panelUrl) {
    this.config.panelUrl = panelUrl.replace(/\/$/, '');
    this._axios.defaults.baseURL = this.config.panelUrl;
  }

  // --- Internal helpers ---
  _url(path) {
    if (!path.startsWith('/')) return `/${path}`;
    return path;
  }

  async _request(method, path, data = {}, opts = {}) {
    try {
      const cfg = { method, url: this._url(path) };
      if (method === 'get' || method === 'delete') cfg.params = data;
      else cfg.data = data;
      if (opts.timeout) cfg.timeout = opts.timeout;
      const res = await this._axios.request(cfg);
      return res.data;
    } catch (err) {
      // normalize error
      const e = new Error(err.message || 'Request failed');
      e.original = err;
      if (err.response) {
        e.status = err.response.status;
        e.body = err.response.data;
      }
      throw e;
    }
  }

  _wsUrlFor(path) {
    // convert panel http(s) to ws(s)
    const p = this.config.panelUrl;
    if (p.startsWith('https://')) return p.replace(/^https:/, 'wss:') + path;
    if (p.startsWith('http://')) return p.replace(/^http:/, 'ws:') + path;
    return 'ws://' + p + path;
  }

  _wsAuthHeaders() {
    return { Authorization: `Bearer ${this.config.key}` };
  }

  _createWs(url, handlers = {}) {
    const ws = new WebSocket(url, { headers: this._wsAuthHeaders() });

    if (handlers.open) ws.on('open', handlers.open);
    if (handlers.message) ws.on('message', handlers.message);
    if (handlers.error) ws.on('error', handlers.error);
    if (handlers.close) ws.on('close', handlers.close);

    // convenience: return an object that can send/close
    return {
      raw: ws,
      send: (data) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      },
      close: (code, reason) => ws.close(code, reason),
    };
  }

  // --- WebSocket helpers (Console + Stats) ---
  _wsConsole(serverId, handlers = {}) {
    const path = `/api/ws/console/${encodeURIComponent(serverId)}`;
    const url = this._wsUrlFor(path);
    return this._createWs(url, handlers);
  }

  _wsStats(serverId, handlers = {}) {
    const path = `/api/ws/stats/${encodeURIComponent(serverId)}`;
    const url = this._wsUrlFor(path);

    // wrap message to only forward parsed payload (server sends {event: 'stats', payload: {..}} )
    const wrappedHandlers = Object.assign({}, handlers);

    const messageCb = (raw) => {
      try {
        const s = raw instanceof Buffer ? raw.toString() : raw;
        const parsed = JSON.parse(s);
        if (parsed && parsed.event === 'stats') {
          if (handlers.stats) handlers.stats(parsed.payload);
          if (handlers.message) handlers.message(parsed.payload);
        } else {
          // ignore other events
          if (handlers.other) handlers.other(parsed);
        }
      } catch (e) {
        // ignore invalid JSON
        if (handlers.error) handlers.error(e);
      }
    };

    wrappedHandlers.message = messageCb;
    return this._createWs(url, wrappedHandlers);
  }

  // --- Bind API endpoints to this.api namespace ---
  _bindApi() {
    // --- Nodes ---
    this.api.nodes.create = async (name, ip, port) => {
      if (!name || !ip || !port) throw new Error('Missing fields');
      return this._request('post', '/api/v1/node/create', { name, ip, port });
    };

    this.api.nodes.list = async () => this._request('get', '/api/v1/nodes');

    this.api.nodes.get = async (id) => this._request('post', `/api/v1/node/${encodeURIComponent(id)}`);

    this.api.nodes.version = async (id) => this._request('get', `/api/v1/node/ver/${encodeURIComponent(id)}`);

    this.api.nodes.configureKey = async (id) => this._request('post', `/api/v1/node/${encodeURIComponent(id)}/configure-key`);

    this.api.nodes.delete = async (id) => this._request('post', `/api/v1/node/${encodeURIComponent(id)}/delete`);

    this.api.nodes.allocations = {
      add: async (nodeId, { ip, domain, port }) => this._request('post', `/api/v1/node/${encodeURIComponent(nodeId)}/allocations/add`, { ip, domain, port }),
      edit: async (nodeId, allocationId, { ip, domain, port }) => this._request('post', `/api/v1/node/${encodeURIComponent(nodeId)}/allocations/edit/${encodeURIComponent(allocationId)}`, { ip, domain, port }),
      delete: async (nodeId, allocationId) => this._request('delete', `/api/v1/node/${encodeURIComponent(nodeId)}/allocations/delete/${encodeURIComponent(allocationId)}`),
    };

    this.api.nodes.stats = async (id) => this._request('get', `/api/v1/node/stats/${encodeURIComponent(id)}`);

    // --- Images ---
    this.api.images.list = async () => this._request('get', '/api/v1/images');
    this.api.images.create = async (imageObj) => this._request('post', '/api/v1/images/new', imageObj);
    this.api.images.delete = async (id) => this._request('post', `/api/v1/images/delete/${encodeURIComponent(id)}`);

    // --- Servers ---
    this.api.servers.list = async () => this._request('get', '/api/v1/servers');

    this.api.servers.create = async (serverObj) => this._request('post', '/api/v1/servers/new', serverObj);

    this.api.servers.edit = async (serverId, edits) => this._request('post', `/api/v1/edit/${encodeURIComponent(serverId)}`, edits);

    this.api.servers.suspend = async (id) => this._request('post', `/api/v1/servers/suspend/${encodeURIComponent(id)}`);

    this.api.servers.unsuspend = async (id) => this._request('post', `/api/v1/servers/unsuspend/${encodeURIComponent(id)}`);

    this.api.servers.delete = async (id) => this._request('delete', `/api/v1/servers/delete/${encodeURIComponent(id)}`);

    // --- Users ---
    this.api.users.list = async () => this._request('get', '/api/v1/users');
    this.api.users.get = async (id) => this._request('get', `/api/v1/user/${encodeURIComponent(id)}`);
    this.api.users.edit = async (id, edits) => this._request('post', `/api/v1/user/${encodeURIComponent(id)}/edit`, edits);
    this.api.users.create = async (userObj) => this._request('post', '/api/v1/users/new', userObj);
    this.api.users.delete = async (id) => this._request('post', `/api/v1/user/${encodeURIComponent(id)}/delete`);

    // --- Settings ---
    this.api.settings.get = async () => this._request('get', '/api/v1/settings');
    this.api.settings.update = async (payload) => this._request('post', '/api/v1/settings', payload);
  }
}

module.exports = TalorixConnect;
