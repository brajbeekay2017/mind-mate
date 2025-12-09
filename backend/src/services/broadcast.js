// Simple SSE broadcaster
class Broadcaster {
  constructor() {
    this.clients = new Map();
  }

  subscribe(res, meta = {}) {
    const id = Math.random().toString(36).slice(2);
    this.clients.set(id, { res, meta });
    // Send initial connected message
    try { res.write(`data: ${JSON.stringify({ type: 'connected', meta })}\n\n`); } catch (e) {}
    return id;
  }

  unsubscribeById(id) {
    const entry = this.clients.get(id);
    if (entry) {
      try { entry.res.end(); } catch (e) {}
      this.clients.delete(id);
    }
  }

  unsubscribe(res) {
    for (const [id, entry] of this.clients) {
      if (entry.res === res) {
        try { entry.res.end(); } catch (e) {}
        this.clients.delete(id);
      }
    }
  }

  publish(channel, data, filterFn = null) {
    for (const [id, entry] of this.clients) {
      try {
        if (typeof filterFn === 'function') {
          try {
            if (!filterFn(entry.meta)) continue;
          } catch (e) { continue; }
        }
        const payload = { channel, ...data };
        entry.res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch (e) {
        // On error, remove client
        try { entry.res.end(); } catch (err) {}
        this.clients.delete(id);
      }
    }
  }
}

module.exports = new Broadcaster();
