(function() {
  if (window.__ALADDIN_PAGE_HOOK_LOADED__) return;
  window.__ALADDIN_PAGE_HOOK_LOADED__ = true;

  function emitTelemetry(payload) {
    try {
      document.dispatchEvent(new CustomEvent('__aladdin_telemetry__', {
        detail: JSON.stringify(payload)
      }));
      window.postMessage({ __aladdin_telemetry_pkt: payload }, '*');
    } catch {}
  }

  function decodeWSPayload(dir, raw) {
    try {
      if (typeof raw === 'string') {
        emitTelemetry({ kind: 'ws', dir, data: raw });
      } else if (raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)) {
        const txt = new TextDecoder('utf-8').decode(raw);
        emitTelemetry({ kind: 'ws', dir, data: txt });
      } else if (typeof Blob !== 'undefined' && raw instanceof Blob) {
        raw.text().then((txt) => emitTelemetry({ kind: 'ws', dir, data: txt })).catch(() => {});
      } else if (raw && typeof raw === 'object' && !raw.nodeType && (raw.candles || raw.history || raw.ticks || raw.quotes || typeof raw.price === 'number' || Array.isArray(raw))) {
        emitTelemetry({ kind: 'ws', dir, data: JSON.stringify(raw) });
      }
    } catch {}
  }

  // 1. Page-World WebSocket + Already-Open Socket + Worker Interceptor
  try {
    const NativeWS = window.WebSocket;
    if (NativeWS && !NativeWS.__aladdinPageHooked) {
      const HookedWS = function(url, protocols) {
        const ws = protocols ? new NativeWS(url, protocols) : new NativeWS(url);
        const origSend = ws.send.bind(ws);
        ws.send = function(data) {
          try { decodeWSPayload('out', data); } catch {}
          return origSend(data);
        };
        ws.addEventListener('message', (event) => decodeWSPayload('in', event.data));
        return ws;
      };
      HookedWS.prototype = NativeWS.prototype;
      HookedWS.CONNECTING = NativeWS.CONNECTING;
      HookedWS.OPEN = NativeWS.OPEN;
      HookedWS.CLOSING = NativeWS.CLOSING;
      HookedWS.CLOSED = NativeWS.CLOSED;
      HookedWS.__aladdinPageHooked = true;
      window.WebSocket = HookedWS;
      window.__ALADDIN_PAGE_WS_HOOKED__ = true;
    }

    if (NativeWS && NativeWS.prototype && !NativeWS.prototype.send.__aladdinWrapped) {
      const origProtoSend = NativeWS.prototype.send;
      const wrappedSend = function(data) {
        try { decodeWSPayload('out', data); } catch {}
        return origProtoSend.apply(this, arguments);
      };
      wrappedSend.__aladdinWrapped = true;
      NativeWS.prototype.send = wrappedSend;
    }

    const meDesc = window.MessageEvent && Object.getOwnPropertyDescriptor(window.MessageEvent.prototype, 'data');
    if (meDesc && meDesc.get && meDesc.configurable && !meDesc.get.__aladdinWrapped) {
      const origMeGet = meDesc.get;
      const seenEvents = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
      const wrappedMeGet = function() {
        const val = origMeGet.call(this);
        try {
          const isWs = this && this.target && typeof WebSocket !== 'undefined' && this.target instanceof WebSocket;
          const isWk = this && this.target && typeof Worker !== 'undefined' && this.target instanceof Worker;
          const isMp = this && this.target && typeof MessagePort !== 'undefined' && this.target instanceof MessagePort;
          if ((isWs || isWk || isMp) && (!seenEvents || !seenEvents.has(this))) {
            if (seenEvents) seenEvents.add(this);
            decodeWSPayload('in', val);
          }
        } catch {}
        return val;
      };
      wrappedMeGet.__aladdinWrapped = true;
      Object.defineProperty(window.MessageEvent.prototype, 'data', {
        get: wrappedMeGet,
        configurable: true,
        enumerable: meDesc.enumerable
      });
    }
  } catch {}

  // 2. Ensure WebGL Canvas Preserves Buffer for Pixel Chart Fallback
  try {
    const CP = window.HTMLCanvasElement && window.HTMLCanvasElement.prototype;
    if (CP && CP.getContext && !CP.getContext.__aladdinGlHook) {
      const origGetCtx = CP.getContext;
      const wrappedGetCtx = function(type, attrs) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          const next = attrs ? Object.assign({}, attrs, { preserveDrawingBuffer: true }) : { preserveDrawingBuffer: true };
          return origGetCtx.call(this, type, next);
        }
        return origGetCtx.apply(this, arguments);
      };
      wrappedGetCtx.__aladdinGlHook = true;
      CP.getContext = wrappedGetCtx;
    }
  } catch {}

  // 3. Page-World DPR, Matrix-Transform & Offscreen Sprite Aware Canvas Live Quote X-Ray Hook
  try {
    const priceSamples = [];
    let lastFlush = 0;

    function inspectCanvasText(ctx, text, x, y) {
      try {
        if (typeof text !== 'string' || text.length < 3 || text.length > 20) return;
        const trimmed = text.trim().replace(/,/g, '');
        if (!/^\d{1,7}\.\d{2,7}$/.test(trimmed)) return;
        const c = ctx.canvas;
        if (!c || c.width < 24 || c.height < 12) return;
        const conn = !!c.isConnected;

        const tr = ctx.getTransform ? ctx.getTransform() : null;
        const px = tr ? (tr.a * x + tr.c * y + tr.e) : x;
        const py = tr ? (tr.b * x + tr.d * y + tr.f) : y;

        if (conn) {
          if (c.height < 60) return;
          const r = c.getBoundingClientRect ? c.getBoundingClientRect() : null;
          const isNarrowAxis = r ? r.width <= 135 : c.width <= 380;
          if (!isNarrowAxis && px < c.width * 0.40) return;
          if (isNarrowAxis && r && r.right < window.innerWidth * 0.40) return;
          if (py < 4 || py > c.height * 0.97) return;
        }

        const val = parseFloat(trimmed);
        if (!(val > 0 && isFinite(val))) return;
        const fill = String(ctx.fillStyle || '').toLowerCase();
        const isBrightLive = fill === '#ffffff' || fill === '#fff' || fill.includes('255, 255, 255') || fill.includes('248, 250') || fill.includes('38bdf8') || fill.includes('000000');
        priceSamples.push({ val, y: py, h: c.height, w: c.width, bright: isBrightLive, offscreen: !conn, t: Date.now() });
        if (priceSamples.length > 56) priceSamples.shift();
        const now = Date.now();
        if (now - lastFlush >= 110) {
          lastFlush = now;
          emitTelemetry({ kind: 'canvas_prices', samples: priceSamples.slice(-28) });
        }
      } catch {}
    }

    function hookCtxProto(Proto) {
      if (!Proto || Proto.__aladdinTextHooked) return;
      Proto.__aladdinTextHooked = true;
      const origFillText = Proto.fillText;
      const origStrokeText = Proto.strokeText;
      Proto.fillText = function(text, x, y) {
        inspectCanvasText(this, text, x, y);
        return origFillText.apply(this, arguments);
      };
      Proto.strokeText = function(text, x, y) {
        inspectCanvasText(this, text, x, y);
        return origStrokeText.apply(this, arguments);
      };
    }

    hookCtxProto(window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype);
    if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
      hookCtxProto(OffscreenCanvasRenderingContext2D.prototype);
    }
  } catch {}
})();
