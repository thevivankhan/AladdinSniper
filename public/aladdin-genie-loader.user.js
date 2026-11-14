// ==UserScript==
// @name         Aladdin Genie (Auto-Updating Loader) -> Pocket Option
// @namespace    https://aladdinsniper.io
// @version      7.7.0
// @description  Permanent Auto-Loader v7.7.0 for AladdinGenie. Loads Full Trade Manager (Tools, Audio/Voice Synth, Fireworks, HD Share Card, Fullscreen S.Log & P&L) + Universal Sniper Action Dock (BUY/SELL <-> WIN/LOSS) + 333/444 Mode + Paradox Matrix + Viewfinder 60-Candle Hybrid Fusion Scanner.
// @match        https://*.p.finance/*
// @match        https://m.p.finance/*
// @match        https://*.pocketoption.com/*
// @match        https://*.pocket-friends.co/*
// @match        https://*.po.trade/*
// @match        https://*.pocketoption.trade/*
// @match        https://*.po8.cash/*
// @match        https://*.po2.cash/*
// @match        https://*.po-trade.com/*
// @match        https://*.pocketoption.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @connect      *
// @updateURL    https://raw.githubusercontent.com/thevivankhan/AladdinSniper/main/public/aladdin-genie-loader.user.js
// @downloadURL  https://raw.githubusercontent.com/thevivankhan/AladdinSniper/main/public/aladdin-genie-loader.user.js
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';
  const pageWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  if (pageWin.__ALADDIN_LOADER_ACTIVE__) return;
  pageWin.__ALADDIN_LOADER_ACTIVE__ = true;

  const LIVE_SOURCE_URL = 'https://raw.githubusercontent.com/thevivankhan/AladdinSniper/main/public/aladdin-pocket-bridge.user.js';
  const CACHE_KEY = 'aladdin_genie_live_cache_v7';

  pageWin.__ALADDIN_WS_BUFFER__ = pageWin.__ALADDIN_WS_BUFFER__ || [];
  pageWin.__ALADDIN_CANVAS_SAMPLES__ = pageWin.__ALADDIN_CANVAS_SAMPLES__ || [];

  function pushTelemetry(type, dir, text) {
    if (!text || typeof text !== 'string') return;
    if (typeof pageWin.__ALADDIN_WS_LISTENER__ === 'function') {
      try { pageWin.__ALADDIN_WS_LISTENER__(dir, text, type); } catch {}
    } else {
      pageWin.__ALADDIN_WS_BUFFER__.push({ type, dir, data: text });
      if (pageWin.__ALADDIN_WS_BUFFER__.length > 360) pageWin.__ALADDIN_WS_BUFFER__.shift();
    }
    try {
      const pkt = { kind: 'ws', dir, data: text };
      document.dispatchEvent(new CustomEvent('__aladdin_telemetry__', { detail: JSON.stringify(pkt) }));
      pageWin.postMessage({ __aladdin_telemetry_pkt: pkt }, '*');
    } catch {}
  }

  function pushCanvasSamples(samples) {
    pageWin.__ALADDIN_CANVAS_SAMPLES__ = samples;
    try {
      const pkt = { kind: 'canvas_prices', samples };
      document.dispatchEvent(new CustomEvent('__aladdin_telemetry__', { detail: JSON.stringify(pkt) }));
      pageWin.postMessage({ __aladdin_telemetry_pkt: pkt }, '*');
    } catch {}
  }

  // 0. Inject Pure Page-World Script Hook via GM_addElement (Bypasses strict CSP & Xray/Sandbox barriers)
  try {
    const pageHookSource = `(function(){
        if(window.__ALADDIN_PAGE_HOOK_LOADED__)return;
        window.__ALADDIN_PAGE_HOOK_LOADED__=true;
        window.__ALADDIN_WS_BUFFER__=window.__ALADDIN_WS_BUFFER__||[];
        window.__ALADDIN_CANVAS_SAMPLES__=window.__ALADDIN_CANVAS_SAMPLES__||[];
        function emit(p){
          try{
            if(p.kind==='ws'){
              if(typeof window.__ALADDIN_WS_LISTENER__==='function'){window.__ALADDIN_WS_LISTENER__(p.dir,p.data);}
              else{window.__ALADDIN_WS_BUFFER__.push({type:'ws',dir:p.dir,data:p.data});if(window.__ALADDIN_WS_BUFFER__.length>360)window.__ALADDIN_WS_BUFFER__.shift();}
            }else if(p.kind==='canvas_prices'){
              window.__ALADDIN_CANVAS_SAMPLES__=p.samples;
            }
            document.dispatchEvent(new CustomEvent('__aladdin_telemetry__',{detail:JSON.stringify(p)}));
            window.postMessage({__aladdin_telemetry_pkt:p},'*');
          }catch{}
        }
        function decodePayload(dir,raw){
          try{
            if(typeof raw==='string'){emit({kind:'ws',dir:dir,data:raw});}
            else if(raw instanceof ArrayBuffer||ArrayBuffer.isView(raw)){emit({kind:'ws',dir:dir,data:new TextDecoder('utf-8').decode(raw)});}
            else if(typeof Blob!=='undefined'&&raw instanceof Blob){raw.text().then(function(t){emit({kind:'ws',dir:dir,data:t});}).catch(function(){});}
            else if(raw&&typeof raw==='object'&&!raw.nodeType&&(raw.candles||raw.history||raw.ticks||raw.quotes||typeof raw.price==='number'||Array.isArray(raw))){
              emit({kind:'ws',dir:dir,data:JSON.stringify(raw)});
            }
          }catch{}
        }
        try{
          var N=window.WebSocket;
          if(N&&!N.__aladdinPageHooked){
            var H=function(u,p){
              var w=p?new N(u,p):new N(u);
              var os=w.send.bind(w);
              w.send=function(d){try{decodePayload('out',d);}catch{}return os(d);};
              w.addEventListener('message',function(e){decodePayload('in',e.data);});
              return w;
            };
            H.prototype=N.prototype;H.CONNECTING=N.CONNECTING;H.OPEN=N.OPEN;H.CLOSING=N.CLOSING;H.CLOSED=N.CLOSED;
            H.__aladdinPageHooked=true;window.WebSocket=H;window.__ALADDIN_PAGE_WS_HOOKED__=true;
          }
          if(N&&N.prototype&&!N.prototype.send.__aladdinWrapped){
            var origProtoSend=N.prototype.send;
            var wrappedProtoSend=function(d){try{decodePayload('out',d);}catch{}return origProtoSend.apply(this,arguments);};
            wrappedProtoSend.__aladdinWrapped=true;
            N.prototype.send=wrappedProtoSend;
          }
          var meDesc=window.MessageEvent&&Object.getOwnPropertyDescriptor(window.MessageEvent.prototype,'data');
          if(meDesc&&meDesc.get&&meDesc.configurable&&!meDesc.get.__aladdinWrapped){
            var origMeGet=meDesc.get;
            var seenMe=typeof WeakSet!=='undefined'?new WeakSet():null;
            var wrappedMeGet=function(){
              var v=origMeGet.call(this);
              try{
                var isWs=this&&this.target&&typeof WebSocket!=='undefined'&&this.target instanceof WebSocket;
                var isWk=this&&this.target&&typeof Worker!=='undefined'&&this.target instanceof Worker;
                var isMp=this&&this.target&&typeof MessagePort!=='undefined'&&this.target instanceof MessagePort;
                if((isWs||isWk||isMp)&&(!seenMe||!seenMe.has(this))){
                  if(seenMe)seenMe.add(this);
                  decodePayload('in',v);
                }
              }catch{}
              return v;
            };
            wrappedMeGet.__aladdinWrapped=true;
            Object.defineProperty(window.MessageEvent.prototype,'data',{get:wrappedMeGet,configurable:true,enumerable:meDesc.enumerable});
          }
        }catch{}
        try{
          var CP=window.HTMLCanvasElement&&window.HTMLCanvasElement.prototype;
          if(CP&&CP.getContext&&!CP.getContext.__aladdinGlHook){
            var origGetCtx=CP.getContext;
            var wrappedGetCtx=function(type,attrs){
              if(type==='webgl'||type==='webgl2'||type==='experimental-webgl'){
                var next=attrs?Object.assign({},attrs,{preserveDrawingBuffer:true}):{preserveDrawingBuffer:true};
                return origGetCtx.call(this,type,next);
              }
              return origGetCtx.apply(this,arguments);
            };
            wrappedGetCtx.__aladdinGlHook=true;
            CP.getContext=wrappedGetCtx;
          }
        }catch{}
        try{
          var buf=[];var lf=0;
          function cap(ctx,t,x,y){
            try{
              if(typeof t!=='string'||t.length<3||t.length>20)return;
              var s=t.trim().replace(/,/g,'');
              if(!/^\\d{1,7}\\.\\d{2,7}$/.test(s))return;
              var c=ctx.canvas;
              if(!c||c.width<24||c.height<12)return;
              var conn=!!c.isConnected;
              var tr=ctx.getTransform?ctx.getTransform():null;
              var px=tr?(tr.a*x+tr.c*y+tr.e):x;
              var py=tr?(tr.b*x+tr.d*y+tr.f):y;
              if(conn){
                if(c.height<60)return;
                var r=c.getBoundingClientRect?c.getBoundingClientRect():null;
                var isNarrowAxis=r?r.width<=135:c.width<=380;
                if(!isNarrowAxis&&px<c.width*0.40)return;
                if(isNarrowAxis&&r&&r.right<window.innerWidth*0.40)return;
                if(py<4||py>c.height*0.97)return;
              }
              var v=parseFloat(s);if(!(v>0&&isFinite(v)))return;
              var f=String(ctx.fillStyle||'').toLowerCase();
              var b=(f==='#ffffff'||f==='#fff'||f.indexOf('255, 255, 255')!==-1||f.indexOf('248, 250')!==-1||f.indexOf('38bdf8')!==-1||f.indexOf('000000')!==-1);
              buf.push({val:v,y:py,h:c.height,w:c.width,bright:b,offscreen:!conn,t:Date.now()});
              if(buf.length>56)buf.shift();
              var now=Date.now();
              if(now-lf>=110){lf=now;emit({kind:'canvas_prices',samples:buf.slice(-28)});}
            }catch{}
          }
          function hookCtxProto(P){
            if(!P||P.__aladdinTextHooked)return;
            P.__aladdinTextHooked=true;
            var of=P.fillText;var os2=P.strokeText;
            P.fillText=function(t,x,y){cap(this,t,x,y);return of.apply(this,arguments);};
            P.strokeText=function(t,x,y){cap(this,t,x,y);return os2.apply(this,arguments);};
          }
          hookCtxProto(window.CanvasRenderingContext2D&&window.CanvasRenderingContext2D.prototype);
          if(typeof OffscreenCanvasRenderingContext2D!=='undefined'){
            hookCtxProto(OffscreenCanvasRenderingContext2D.prototype);
          }
        }catch{}
      })();`;

    const injectPageHook = () => {
      if (document.getElementById('aladdin-loader-page-hook')) return;
      const rootTarget = document.head || document.documentElement;
      if (!rootTarget) return;
      if (typeof GM_addElement === 'function') {
        const s = GM_addElement(rootTarget, 'script', { id: 'aladdin-loader-page-hook', textContent: pageHookSource });
        if (s && s.remove) s.remove();
      } else {
        const s = document.createElement('script');
        s.id = 'aladdin-loader-page-hook';
        s.textContent = pageHookSource;
        rootTarget.appendChild(s);
        s.remove();
      }
    };
    injectPageHook();
  } catch {}

  // 1. unsafeWindow WebSocket & Canvas Hook Fallback (if inline script blocked by strict CSP)
  try {
    const NativeWS = pageWin.WebSocket;
    if (NativeWS && !NativeWS.__aladdinPageHooked && !NativeWS.__aladdinHooked) {
      const HookedWS = function(url, protocols) {
        const ws = protocols ? new NativeWS(url, protocols) : new NativeWS(url);
        const origSend = ws.send.bind(ws);
        ws.send = function(data) {
          try { if (typeof data === 'string') pushTelemetry('ws', 'out', data); } catch {}
          return origSend(data);
        };
        ws.addEventListener('message', (event) => {
          try {
            if (typeof event.data === 'string') pushTelemetry('ws', 'in', event.data);
            else if (event.data instanceof ArrayBuffer) pushTelemetry('ws', 'in', new TextDecoder('utf-8').decode(event.data));
            else if (ArrayBuffer.isView(event.data)) pushTelemetry('ws', 'in', new TextDecoder('utf-8').decode(event.data));
            else if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
              event.data.text().then((txt) => pushTelemetry('ws', 'in', txt)).catch(() => {});
            }
          } catch {}
        });
        return ws;
      };
      HookedWS.prototype = NativeWS.prototype;
      HookedWS.CONNECTING = NativeWS.CONNECTING;
      HookedWS.OPEN = NativeWS.OPEN;
      HookedWS.CLOSING = NativeWS.CLOSING;
      HookedWS.CLOSED = NativeWS.CLOSED;
      HookedWS.__aladdinHooked = true;
      pageWin.WebSocket = HookedWS;
      pageWin.__ALADDIN_PAGE_WS_HOOKED__ = true;
    }
  } catch {}

  try {
    const Proto = pageWin.CanvasRenderingContext2D && pageWin.CanvasRenderingContext2D.prototype;
    if (Proto && !Proto.__aladdinTextHooked) {
      Proto.__aladdinTextHooked = true;
      const origFillText = Proto.fillText;
      const origStrokeText = Proto.strokeText;
      const buf = [];
      let lastFlush = 0;

      function inspectCanvasText(ctx, t, x, y) {
        try {
          if (typeof t !== 'string' || t.length < 3 || t.length > 20) return;
          const s = t.trim().replace(/,/g, '');
          if (!/^\d{1,7}\.\d{2,7}$/.test(s)) return;
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
          const v = parseFloat(s);
          if (!(v > 0 && isFinite(v))) return;
          const f = String(ctx.fillStyle || '').toLowerCase();
          const b = f === '#ffffff' || f === '#fff' || f.includes('255, 255, 255') || f.includes('248, 250') || f.includes('38bdf8') || f.includes('000000');
          buf.push({ val: v, y: py, h: c.height, w: c.width, bright: b, offscreen: !conn, t: Date.now() });
          if (buf.length > 56) buf.shift();
          const now = Date.now();
          if (now - lastFlush >= 110) {
            lastFlush = now;
            pushCanvasSamples(buf.slice(-28));
          }
        } catch {}
      }

      Proto.fillText = function(t, x, y) {
        inspectCanvasText(this, t, x, y);
        return origFillText.apply(this, arguments);
      };
      Proto.strokeText = function(t, x, y) {
        inspectCanvasText(this, t, x, y);
        return origStrokeText.apply(this, arguments);
      };
    }
  } catch {}

  // Listen for page-world CustomEvent relays as well
  document.addEventListener('__aladdin_telemetry__', (e) => {
    try {
      const pkt = typeof e.detail === 'string' ? JSON.parse(e.detail) : e.detail;
      if (pkt && pkt.kind === 'ws') pushTelemetry('ws', pkt.dir, pkt.data);
    } catch {}
  });

  // 2. Execute fetched Genie script cleanly
  let executed = false;
  function runGenieCode(codeText, sourceLabel) {
    if (executed || !codeText || !codeText.includes('ALADDIN_GENIE_INJECTED')) return;
    executed = true;
    try {
      const fn = new Function(codeText);
      fn();
      console.log('[AladdinGenie Loader v7.7.0] Mounted from:', sourceLabel);
    } catch (e) {
      executed = false;
      console.error('[Aladdin Genie Loader] Execution error:', e);
    }
  }

  function runCachedFallback(label) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) runGenieCode(cached, label);
    } catch {}
  }

  function fetchFallback() {
    const bustUrl = `${LIVE_SOURCE_URL}?t=${Date.now()}&r=${Math.random().toString(36).slice(2, 7)}`;
    fetch(bustUrl, { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))))
      .then((txt) => {
        if (txt && txt.includes('ALADDIN_GENIE_INJECTED')) {
          try { localStorage.setItem(CACHE_KEY, txt); } catch {}
          runGenieCode(txt, 'FETCH LIVE');
        } else {
          runCachedFallback('CACHE FALLBACK');
        }
      })
      .catch(() => runCachedFallback('OFFLINE CACHE'));
  }

  // 3. Fetch latest live build on every refresh (cache-busted + 15s timeout + fetch fallback)
  const bustUrl = `${LIVE_SOURCE_URL}?t=${Date.now()}&r=${Math.random().toString(36).slice(2, 7)}`;
  if (typeof GM_xmlhttpRequest === 'function') {
    GM_xmlhttpRequest({
      method: 'GET',
      url: bustUrl,
      nocache: true,
      headers: {
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      },
      timeout: 15000,
      onload: function(res) {
        if (res.status >= 200 && res.status < 300 && res.responseText && res.responseText.includes('ALADDIN_GENIE_INJECTED')) {
          try { localStorage.setItem(CACHE_KEY, res.responseText); } catch {}
          runGenieCode(res.responseText, 'LIVE GITHUB');
        } else {
          fetchFallback();
        }
      },
      onerror: fetchFallback,
      ontimeout: fetchFallback
    });
  } else {
    fetchFallback();
  }
})();
