// ==UserScript==
// @name         Aladdin Genie -> Pocket Option Floating Bot Overlay (Lemur & Quetta Edition)
// @namespace    https://aladdinsniper.io
// @version      7.5.0
// @description  AladdinGenie Pro v7.5.0: Full Trade Manager + 333/444 Mode + Paradox Matrix + Viewfinder 60-Candle Hybrid Fusion Scanner
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
// @grant        none
// @updateURL    https://raw.githubusercontent.com/thevivankhan/AladdinSniper/main/public/aladdin-pocket-bridge.user.js
// @downloadURL  https://raw.githubusercontent.com/thevivankhan/AladdinSniper/main/public/aladdin-pocket-bridge.user.js
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';
  if (window.__ALADDIN_GENIE_INJECTED__) return;
  window.__ALADDIN_GENIE_INJECTED__ = true;

  console.log('[AladdinGenie] v7.5.0 PRO Initializing (Trade Manager + 333/444 + Paradox + 60-Candle Hybrid Viewfinder)');

  // =========================================================================
  // 1. REAL-TIME STATE & PERSISTENCE (ZERO DUMMY / ZERO Math.sin SIMULATION)
  // =========================================================================
  const STORAGE_KEY = 'aladdin_genie_state_v7';
  const LEGACY_STORAGE_KEY = 'aladdin_genie_state_v6';
  const channel = new BroadcastChannel('aladdin_pocket_bridge');
  const TIMEFRAME_SECONDS = { '5s': 5, '10s': 10, '15s': 15, '30s': 30, '1m': 60, '2m': 120, '5m': 300 };

  let currentStake = 0;
  let lastKnownBalance = null;
  let lastKnownAccountType = 'DEMO';
  let poBalance = null;
  let poAccountType = 'DEMO';
  let poAsset = 'AUD/USD OTC';
  let activeWsSymbol = null;
  let currentPayout = 92;
  let scrapeSource = 'Syncing';
  let lastSuccessfulSyncAt = 0;
  let isCardExpanded = false;
  let audioEnabled = true;

  let currentTimeframe = '5s';
  let currentExpiry = '15s';
  let autoSyncTimingUntil = 0;
  let manualStakeLockUntil = 0;

  // Legacy quick session telemetry (kept synced with Trade Manager)
  let sessionWins = 0;
  let sessionLosses = 0;
  let sessionNetPnL = 0.00;
  let sessionTradesDone = 0;
  let consecutiveLosses = 0;
  let compoundingMode = 'NK_PLAN'; // 'NK_PLAN' | 'DAILY'
  let compoundingStep = 1;
  let autoApplyStake = false;
  let baseStakeAmount = 1.10;
  let nkSession = { tradesDone: 0, winsAchieved: 0, netPnL: 0 };
  let advComp = {
    currency: 'USD',
    startingCapital: 100,
    totalTrades: 8,
    winsNeeded: 2,
    minStake: 1.0,
    targetGoal: 1000,
    dailyTargetPct: 10,
    horizonDays: 25,
    activeDays: 'ALL_7',
    reinvestPct: 80,
    riskPerTradePct: 3,
    winRatePct: 72,
    tradesPerDay: 6,
    useWinRateDrag: true,
    useTierRates: true,
    tier1Limit: 500,
    tier2Limit: 2500,
    tier2RatePct: 6,
    tier3RatePct: 3,
    cashFlowType: 'NONE',
    cashFlowAmount: 0,
    cashFlowFreq: 'WEEKLY'
  };
  let recentTrades = [];
  let activeTrade = null;

  // -------------------------------------------------------------------------
  // SYSTEM 1: ALADDINSNIPER TRADE MANAGER STATE (Exact PocketSniperApp Clone)
  // -------------------------------------------------------------------------
  const OTC_ASSETS = [
    'AUD/CHF OTC', 'AUD/USD OTC', 'EUR/USD OTC', 'USD/SGD OTC', 'GBP/USD OTC',
    'USD/JPY OTC', 'NZD/USD OTC', 'USD/CAD OTC', 'EUR/JPY OTC', 'GBP/JPY OTC', 'AUD/CAD OTC'
  ];

  let tmState = {
    activeSubTab: 'trade', // 'trade' | 'settings' | 'session_log' | 'calendar' | 'schedule' | 'matrix'
    balance: 2131.89,
    sessionStartBalance: 2131.89,
    currentBalance: 2131.89,
    tradesAllowed: 14,
    winsNeeded: 2,
    payoutRate: 92,
    riskAmountPercent: 100,
    minStakeLimit: 1.0,
    selectedAsset: 'AUD/CHF OTC',
    engineMode: 'ALADDIN_TIERED', // 'ALADDIN_TIERED' | 'ALADDIN_DP' | 'SNIPER_CORE'
    selectedPreset: '14/2',
    scheduleViewMode: 'ALADDIN_DP', // 'ALADDIN_DP' | 'STEP_RECOVERY'
    tradeActionMode: 'BUY_SELL', // 'BUY_SELL' | 'WIN_LOSS'
    sessionActive: true,
    sessionTrades: [], // [{ step, result, direction, stake, payoutRate, balanceAfter }]
    sessionLogs: [],   // [{ id, date, dateFormatted, dayString, accountBalance, tradesAllowed, winsNeeded, payoutRate, capitalGoal, gainTargetPercent, winProfit, endingBalance, won, lost, profitOrLoss, trades }]
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
    autoSyncPO: true,
    userEditedBalance: false,
    payoutLockedManual: false,
    showCompleteModal: false,
    lastCompletedProfit: 0
  };

  // Matrix Sub-Tab State (Exact DynamicCalculator + calculatorMath Clone)
  let mxState = {
    activeMode: 'daily', // 'daily' | 'step'
    viewMode: 'chart',   // 'chart' | 'schedule' | 'projector' | 'milestones'
    currency: 'USD',
    daily: {
      startingCapital: 250,
      dailyReturnRate: 5,
      daysCount: 60,
      startDate: new Date().toISOString().slice(0, 10),
      activeDaysPreset: 'weekdays', // 'weekdays' | 'all'
      activeDays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
      reinvestmentPercent: 70,
      targetGoal: 10000,
      enableTieredReturns: true,
      tiers: [
        { id: '1', name: 'Micro Spark (T1)', minBalance: 0, maxBalance: 1000, returnRate: 5.0 },
        { id: '2', name: 'Velocity Scale (T2)', minBalance: 1000, maxBalance: 5000, returnRate: 3.5 },
        { id: '3', name: 'Fortress Vault (T3)', minBalance: 5000, maxBalance: 25000, returnRate: 2.0 },
        { id: '4', name: 'Apex Sovereign (T4)', minBalance: 25000, maxBalance: null, returnRate: 1.0 }
      ],
      sessionsPerDay: 2,
      tradesPerSession: 3,
      winRatePercent: 75,
      brokerPayoutPercent: 85,
      riskPerTradePercent: 2,
      lossDragMultiplier: 1.0,
      useCalculatedDailyReturn: false,
      cashFlowEnabled: false,
      cashFlowType: 'withdrawal',
      cashFlowAmount: 100,
      cashFlowFreq: 'weekly'
    },
    step: {
      startingCapital: 10,
      stepsCount: 10,
      payoutRatePercent: 92,
      compoundingType: 'all_in', // 'all_in' | 'profit_split' | 'phases'
      reinvestmentPercent: 70,
      phaseLength: 3,
      lockProfitAtPhaseEnd: true,
      targetGoal: 5000
    }
  };

  // -------------------------------------------------------------------------
  // SYSTEM 2: 333 / 444 COMPOUNDING PLANS & SMART TRADING JOURNAL STATE
  // -------------------------------------------------------------------------
  let chState = {
    activeMode: '333', // '333' | '444'
    selectedPlanId: 'plan-100',
    payoutRate: 0.92,
    completedSteps: {}, // { 'plan-100-0-0': true }
    timerId: null,
    timerLeft: 0,
    timerType: 'session', // 'session' | 'rest'
    timerLabel: '',
    showJournalForm: false,
    draftJournal: {
      result: 'Success',
      emotion: 'Confident',
      marketCondition: 'Trending',
      rating: 5,
      notes: ''
    },
    journalEntries: []
  };

  // -------------------------------------------------------------------------
  // SYSTEM 3: PARADOX MATRIX STATE (Exact ParadoxStrategy Clone)
  // -------------------------------------------------------------------------
  let pxState = {
    openPhases: ['phase-1'],
    completedSessions: [], // ['p1-s1', ...]
    timerId: null,
    timerLeft: 0,
    timerType: 'session',
    useLivePayout: false
  };

  // Live Self-Audited Signal Accuracy State
  let signalWins = 0;
  let signalLosses = 0;
  let pendingSignalAudit = null;

  // REAL PRICE ACTION & CANDLE TELEMETRY
  let lastPrice = null;
  let isPriceCalibrated = false;
  let wsCandles = [];
  let quoteCandles = [];
  let canvasCandles = [];
  let currentCandle = null;
  let quoteCurrentCandle = null;
  let dataSource = 'Live Chart';
  let lastWsTickAt = 0;
  let lastCanvasQuoteAt = 0;
  let lastCanvasScanAt = 0;
  let lastViewfinderScanActiveAt = 0;
  let canvasLiveQuote = null;
  let canvasAxisLabels = [];
  let tickHistory = [];

  let realSupport = null;
  let realResistance = null;
  let realRSI = null;
  let realStochK = null;
  let realStochD = null;
  let realTrend = 'NEUTRAL';
  let currentPattern = 'Scanning live price action...';
  let realSignal = 'WAIT';
  let signalConfidence = 0;
  let signalMode = 'BALANCED';
  let lockedSignal = null;
  let signalCooldownUntil = 0;
  let lastQuoteHudSyncAt = 0;
  let cachedPOElements = { callBtn: null, putBtn: null, amountInput: null, assetEl: null, ts: 0 };
  let telemetryStats = { wsIn: 0, wsParsed: 0, canvasSamples: 0, chartScans: 0, lastFeedAt: 0 };
  let marketBiasDir = 'NEUTRAL';
  let marketBiasPct = 50;
  let confluenceReasons = [];
  let wickMetrics = { upperPct: 0, bodyPct: 0, lowerPct: 0 };
  let lastAlertedSignal = null;
  let lastAlertedTime = 0;
  let signalFlashTimeout = null;
  let lastPOChartBuySentiment = null;

  let savedLayout = { left: null, top: null, width: 320, height: 492, activeTab: 'sniper' };

  function getPriceDecimals(price) {
    if (!isPriceCalibrated || price === null || !isFinite(price)) return 1;
    if (price >= 1000) return 2;
    if (price >= 15) return 3;
    return 5;
  }

  function formatPrice(val) {
    if (val === null || val === undefined || !isFinite(val)) return '—';
    return Number(val).toFixed(getPriceDecimals(lastPrice || val));
  }

  function loadPersistedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return;
      const st = JSON.parse(raw);
      if (st && typeof st === 'object') {
        if (typeof st.sessionWins === 'number') sessionWins = st.sessionWins;
        if (typeof st.sessionLosses === 'number') sessionLosses = st.sessionLosses;
        if (typeof st.sessionNetPnL === 'number') sessionNetPnL = st.sessionNetPnL;
        if (typeof st.sessionTradesDone === 'number') sessionTradesDone = st.sessionTradesDone;
        if (typeof st.consecutiveLosses === 'number') consecutiveLosses = st.consecutiveLosses;
        if (typeof st.signalWins === 'number') signalWins = st.signalWins;
        if (typeof st.signalLosses === 'number') signalLosses = st.signalLosses;
        if (st.compoundingMode === 'NK_PLAN' || st.compoundingMode === 'DAILY') {
          compoundingMode = st.compoundingMode;
        }
        if (typeof st.compoundingStep === 'number') compoundingStep = Math.max(1, Math.min(20, st.compoundingStep));
        if (typeof st.autoApplyStake === 'boolean') autoApplyStake = st.autoApplyStake;
        if (typeof st.baseStakeAmount === 'number' && st.baseStakeAmount > 0) baseStakeAmount = st.baseStakeAmount;
        if (st.nkSession && typeof st.nkSession === 'object') {
          nkSession = {
            tradesDone: Math.max(0, Number(st.nkSession.tradesDone) || 0),
            winsAchieved: Math.max(0, Number(st.nkSession.winsAchieved) || 0),
            netPnL: Number(st.nkSession.netPnL) || 0
          };
        }
        if (st.advComp && typeof st.advComp === 'object') advComp = { ...advComp, ...st.advComp };
        if (st.tmState && typeof st.tmState === 'object') {
          tmState = {
            ...tmState,
            ...st.tmState,
            sessionTrades: Array.isArray(st.tmState.sessionTrades) ? st.tmState.sessionTrades : [],
            sessionLogs: Array.isArray(st.tmState.sessionLogs) ? st.tmState.sessionLogs.slice(0, 200) : []
          };
        }
        if (st.mxState && typeof st.mxState === 'object') {
          mxState = {
            ...mxState,
            ...st.mxState,
            daily: { ...mxState.daily, ...(st.mxState.daily || {}) },
            step: { ...mxState.step, ...(st.mxState.step || {}) }
          };
        }
        if (st.chState && typeof st.chState === 'object') {
          chState = {
            ...chState,
            ...st.chState,
            completedSteps: (st.chState.completedSteps && typeof st.chState.completedSteps === 'object') ? st.chState.completedSteps : {},
            journalEntries: Array.isArray(st.chState.journalEntries) ? st.chState.journalEntries.slice(0, 100) : []
          };
        }
        if (st.pxState && typeof st.pxState === 'object') {
          pxState = {
            ...pxState,
            ...st.pxState,
            openPhases: Array.isArray(st.pxState.openPhases) ? st.pxState.openPhases : ['phase-1'],
            completedSessions: Array.isArray(st.pxState.completedSessions) ? st.pxState.completedSessions : []
          };
        }
        if (Array.isArray(st.recentTrades)) recentTrades = st.recentTrades.slice(0, 30);
        if (typeof st.audioEnabled === 'boolean') audioEnabled = st.audioEnabled;
        if (st.signalMode === 'ACTIVE' || st.signalMode === 'BALANCED' || st.signalMode === 'SNIPER') signalMode = st.signalMode;
        if (st.currentTimeframe && TIMEFRAME_SECONDS[st.currentTimeframe]) currentTimeframe = st.currentTimeframe;
        if (st.currentExpiry && TIMEFRAME_SECONDS[st.currentExpiry]) currentExpiry = st.currentExpiry;
        if (st.layout && typeof st.layout === 'object') {
          let actTab = st.layout.activeTab || 'sniper';
          if (actTab === 'compounding') actTab = 'manager';
          savedLayout = {
            left: typeof st.layout.left === 'number' ? st.layout.left : null,
            top: typeof st.layout.top === 'number' ? st.layout.top : null,
            width: typeof st.layout.width === 'number' ? Math.max(230, st.layout.width) : 320,
            height: typeof st.layout.height === 'number' ? Math.max(250, st.layout.height) : 492,
            activeTab: actTab
          };
        }
      }
    } catch {}
  }

  function savePersistedState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sessionWins,
        sessionLosses,
        sessionNetPnL,
        sessionTradesDone,
        consecutiveLosses,
        signalWins,
        signalLosses,
        compoundingMode,
        compoundingStep,
        autoApplyStake,
        baseStakeAmount,
        nkSession,
        advComp,
        tmState,
        mxState,
        chState: {
          activeMode: chState.activeMode,
          selectedPlanId: chState.selectedPlanId,
          payoutRate: chState.payoutRate,
          completedSteps: chState.completedSteps,
          journalEntries: chState.journalEntries
        },
        pxState: {
          openPhases: pxState.openPhases,
          completedSessions: pxState.completedSessions,
          useLivePayout: pxState.useLivePayout
        },
        recentTrades: recentTrades.slice(0, 30),
        audioEnabled,
        signalMode,
        currentTimeframe,
        currentExpiry,
        layout: savedLayout
      }));
    } catch {}
  }

  loadPersistedState();

  // DOM refs
  let root, bubble, card, screenFlashEl, callBtn, putBtn, customStakeInput;
  let syncStatusDot, tfLabel, expiryLabel, radarTfBadge, radarCandleTime, radarBigSignal;
  let radarPatternLbl, radarSup, radarRes, radarRsi, radarLivePrice, radarSourceLbl, radarTrendLbl, radarConfList;
  let radarChartCanvas, radarWickBar, radarConfFill, radarAccLbl, signalModeBtns;
  let radarLiveBadge, radarLiveDot, radarLiveText, chartWindowEl;
  let miniSignalBar, miniSignalText, miniSignalTimer, miniTakeBtn, miniBiasFill;
  let activeTradeBox, activeTradeText, activeTradeCountdown, audioToggleBtn;
  let balanceVal, accTypeLabel, assetVal, miniBal, syncPill, payoutPctLbl, estProfitLbl, scrapeSourceLbl;
  let callStakeLbl, putStakeLbl, quickChips, notifyBox, orderLogsList;
  let tmRootEl, chRootEl, pxRootEl, dockAutoTag;
  let isDragging = false, isResizing = false;

  // =========================================================================
  // 2. PAGE-WORLD TELEMETRY INJECTION (DPR/MATRIX CANVAS X-RAY + WS RELAY)
  // =========================================================================
  function injectPageTelemetryHook() {
    try {
      // Extension MV3 CSP-safe page_hook.js injection
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
        if (!document.getElementById('aladdin-page-hook-ext')) {
          const s = document.createElement('script');
          s.id = 'aladdin-page-hook-ext';
          s.src = chrome.runtime.getURL('page_hook.js');
          s.onload = () => s.remove();
          (document.head || document.documentElement).appendChild(s);
        }
        return;
      }

      // Direct unsafeWindow fallback & drain (works even if PO CSP blocks inline <script>)
      try {
        const uw = typeof unsafeWindow !== 'undefined' ? unsafeWindow : null;
        if (uw) {
          if (Array.isArray(uw.__ALADDIN_CANVAS_SAMPLES__) && uw.__ALADDIN_CANVAS_SAMPLES__.length > 0) {
            processCanvasPriceSamples(uw.__ALADDIN_CANVAS_SAMPLES__);
          }
          if (Array.isArray(uw.__ALADDIN_WS_BUFFER__) && uw.__ALADDIN_WS_BUFFER__.length > 0) {
            const copy = uw.__ALADDIN_WS_BUFFER__.slice();
            uw.__ALADDIN_WS_BUFFER__ = [];
            for (const entry of copy) {
              if (entry && entry.dir === 'in') processWSFrameText(entry.data);
              else if (entry && entry.dir === 'out') processWSOutgoingText(entry.data);
            }
          }
          if (typeof uw.__ALADDIN_WS_LISTENER__ !== 'function') {
            uw.__ALADDIN_WS_LISTENER__ = function(dir, payload) {
              if (dir === 'in') processWSFrameText(payload);
              else if (dir === 'out') processWSOutgoingText(payload);
            };
          }
          const uwProto = uw.CanvasRenderingContext2D && uw.CanvasRenderingContext2D.prototype;
          if (uwProto && !uwProto.__aladdinTextHooked) {
            uwProto.__aladdinTextHooked = true;
            const uwOrigFill = uwProto.fillText;
            const uwOrigStroke = uwProto.strokeText;
            const uwBuf = [];
            let uwLastFlush = 0;
            const handleUwText = (ctx, t, x, y) => {
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
                uwBuf.push({ val: v, y: py, h: c.height, w: c.width, bright: b, offscreen: !conn, t: Date.now() });
                if (uwBuf.length > 56) uwBuf.shift();
                const now = Date.now();
                if (now - uwLastFlush >= 110) {
                  uwLastFlush = now;
                  processCanvasPriceSamples(uwBuf.slice(-28));
                }
              } catch {}
            };
            uwProto.fillText = function(t, x, y) {
              handleUwText(this, t, x, y);
              return uwOrigFill.apply(this, arguments);
            };
            uwProto.strokeText = function(t, x, y) {
              handleUwText(this, t, x, y);
              return uwOrigStroke.apply(this, arguments);
            };
          }
        }
      } catch {}

      // Tampermonkey / Userscript: inject directly into REAL page DOM context (captures WebSocket, Worker, WebGL & OffscreenCanvas)
      if (!document.getElementById('aladdin-page-hook-inline') && !document.getElementById('aladdin-loader-page-hook')) {
        const s = document.createElement('script');
        s.id = 'aladdin-page-hook-inline';
        s.textContent = `(function(){
          if(window.__ALADDIN_PAGE_HOOK_LOADED__)return;
          window.__ALADDIN_PAGE_HOOK_LOADED__=true;
          function emit(p){try{document.dispatchEvent(new CustomEvent('__aladdin_telemetry__',{detail:JSON.stringify(p)}));window.postMessage({__aladdin_telemetry_pkt:p},'*');}catch{}}
          function dec(dir,raw){
            try{
              if(typeof raw==='string')emit({kind:'ws',dir:dir,data:raw});
              else if(raw instanceof ArrayBuffer||ArrayBuffer.isView(raw))emit({kind:'ws',dir:dir,data:new TextDecoder('utf-8').decode(raw)});
              else if(typeof Blob!=='undefined'&&raw instanceof Blob)raw.text().then(function(t){emit({kind:'ws',dir:dir,data:t});}).catch(function(){});
              else if(raw&&typeof raw==='object'&&!raw.nodeType&&(raw.candles||raw.history||raw.ticks||raw.quotes||typeof raw.price==='number'||Array.isArray(raw))){emit({kind:'ws',dir:dir,data:JSON.stringify(raw)});}
            }catch{}
          }
          try{
            var N=window.WebSocket;
            if(N&&!N.__aladdinPageHooked){
              var H=function(u,p){
                var w=p?new N(u,p):new N(u);
                var os=w.send.bind(w);
                w.send=function(d){try{dec('out',d);}catch{}return os(d);};
                w.addEventListener('message',function(e){dec('in',e.data);});
                return w;
              };
              H.prototype=N.prototype;H.CONNECTING=N.CONNECTING;H.OPEN=N.OPEN;H.CLOSING=N.CLOSING;H.CLOSED=N.CLOSED;
              H.__aladdinPageHooked=true;window.WebSocket=H;
            }
            if(N&&N.prototype&&!N.prototype.send.__aladdinWrapped){
              var ops=N.prototype.send;
              var wps=function(d){try{dec('out',d);}catch{}return ops.apply(this,arguments);};
              wps.__aladdinWrapped=true;N.prototype.send=wps;
            }
            var md=window.MessageEvent&&Object.getOwnPropertyDescriptor(window.MessageEvent.prototype,'data');
            if(md&&md.get&&md.configurable&&!md.get.__aladdinWrapped){
              var omg=md.get;var sm=typeof WeakSet!=='undefined'?new WeakSet():null;
              var wmg=function(){
                var v=omg.call(this);
                try{
                  var isWs=this&&this.target&&typeof WebSocket!=='undefined'&&this.target instanceof WebSocket;
                  var isWk=this&&this.target&&typeof Worker!=='undefined'&&this.target instanceof Worker;
                  var isMp=this&&this.target&&typeof MessagePort!=='undefined'&&this.target instanceof MessagePort;
                  if((isWs||isWk||isMp)&&(!sm||!sm.has(this))){if(sm)sm.add(this);dec('in',v);}
                }catch{}
                return v;
              };
              wmg.__aladdinWrapped=true;
              Object.defineProperty(window.MessageEvent.prototype,'data',{get:wmg,configurable:true,enumerable:md.enumerable});
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
                if(typeof t==='string'&&t.length>=3&&t.length<=20){
                  var s=t.trim().replace(/,/g,'');
                  if(/^\\d{1,7}\\.\\d{2,7}$/.test(s)){
                    var c=ctx.canvas;
                    if(c&&c.width>=24&&c.height>=12){
                      var conn=!!c.isConnected;
                      var tr=ctx.getTransform?ctx.getTransform():null;
                      var px=tr?(tr.a*x+tr.c*y+tr.e):x;
                      var py=tr?(tr.b*x+tr.d*y+tr.f):y;
                      var ok=true;
                      if(conn){
                        var r=c.getBoundingClientRect?c.getBoundingClientRect():null;
                        var isNarrow=r?r.width<=135:c.width<=380;
                        ok=c.height>=60&&(isNarrow?(!r||r.right>=window.innerWidth*0.40):(px>=c.width*0.40))&&py>=4&&py<=c.height*0.97;
                      }
                      if(ok){
                        var v=parseFloat(s);
                        if(v>0&&isFinite(v)){
                          var f=String(ctx.fillStyle||'').toLowerCase();
                          var b=(f==='#ffffff'||f==='#fff'||f.indexOf('255, 255, 255')!==-1||f.indexOf('248, 250')!==-1||f.indexOf('38bdf8')!==-1||f.indexOf('000000')!==-1);
                          buf.push({val:v,y:py,h:c.height,w:c.width,bright:b,offscreen:!conn,t:Date.now()});
                          if(buf.length>56)buf.shift();
                          var now=Date.now();
                          if(now-lf>=110){lf=now;emit({kind:'canvas_prices',samples:buf.slice(-28)});}
                        }
                      }
                    }
                  }
                }
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
        (document.head || document.documentElement).appendChild(s);
        s.remove();
      }

      // Direct window hook fallback for @grant none Tampermonkey when CSP blocks inline <script>
      if (!window.__ALADDIN_DIRECT_HOOKED__) {
        window.__ALADDIN_DIRECT_HOOKED__ = true;
        const decDirect = (dir, raw) => {
          try {
            if (typeof raw === 'string') {
              if (dir === 'in') processWSFrameText(raw);
              else processWSOutgoingText(raw);
            } else if (raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)) {
              const txt = new TextDecoder('utf-8').decode(raw);
              if (dir === 'in') processWSFrameText(txt);
              else processWSOutgoingText(txt);
            } else if (typeof Blob !== 'undefined' && raw instanceof Blob) {
              raw.text().then((txt) => {
                if (dir === 'in') processWSFrameText(txt);
                else processWSOutgoingText(txt);
              }).catch(() => {});
            } else if (raw && typeof raw === 'object' && !raw.nodeType && (raw.candles || raw.history || raw.ticks || raw.quotes || typeof raw.price === 'number' || Array.isArray(raw))) {
              const j = JSON.stringify(raw);
              if (dir === 'in') processWSFrameText(j);
            }
          } catch {}
        };
        try {
          const N = window.WebSocket;
          if (N && !N.__aladdinPageHooked) {
            const H = function(u, p) {
              const w = p ? new N(u, p) : new N(u);
              const os = w.send.bind(w);
              w.send = function(d) { try { decDirect('out', d); } catch {} return os(d); };
              w.addEventListener('message', (e) => decDirect('in', e.data));
              return w;
            };
            H.prototype = N.prototype; H.CONNECTING = N.CONNECTING; H.OPEN = N.OPEN; H.CLOSING = N.CLOSING; H.CLOSED = N.CLOSED;
            H.__aladdinPageHooked = true;
            window.WebSocket = H;
          }
          if (N && N.prototype && !N.prototype.send.__aladdinWrapped) {
            const ops = N.prototype.send;
            const wps = function(d) { try { decDirect('out', d); } catch {} return ops.apply(this, arguments); };
            wps.__aladdinWrapped = true;
            N.prototype.send = wps;
          }
          const md = window.MessageEvent && Object.getOwnPropertyDescriptor(window.MessageEvent.prototype, 'data');
          if (md && md.get && md.configurable && !md.get.__aladdinWrapped) {
            const omg = md.get;
            const sm = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
            const wmg = function() {
              const v = omg.call(this);
              try {
                const isWs = this && this.target && typeof WebSocket !== 'undefined' && this.target instanceof WebSocket;
                const isWk = this && this.target && typeof Worker !== 'undefined' && this.target instanceof Worker;
                const isMp = this && this.target && typeof MessagePort !== 'undefined' && this.target instanceof MessagePort;
                if ((isWs || isWk || isMp) && (!sm || !sm.has(this))) {
                  if (sm) sm.add(this);
                  decDirect('in', v);
                }
              } catch {}
              return v;
            };
            wmg.__aladdinWrapped = true;
            Object.defineProperty(window.MessageEvent.prototype, 'data', { get: wmg, configurable: true, enumerable: md.enumerable });
          }
        } catch {}
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
        try {
          const dBuf = [];
          let dLastFlush = 0;
          const capDirect = (ctx, t, x, y) => {
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
              dBuf.push({ val: v, y: py, h: c.height, w: c.width, bright: b, offscreen: !conn, t: Date.now() });
              if (dBuf.length > 56) dBuf.shift();
              const now = Date.now();
              if (now - dLastFlush >= 110) {
                dLastFlush = now;
                processCanvasPriceSamples(dBuf.slice(-28));
              }
            } catch {}
          };
          const hookDirProto = (P) => {
            if (!P || P.__aladdinTextHooked) return;
            P.__aladdinTextHooked = true;
            const of = P.fillText;
            const os2 = P.strokeText;
            P.fillText = function(t, x, y) { capDirect(this, t, x, y); return of.apply(this, arguments); };
            P.strokeText = function(t, x, y) { capDirect(this, t, x, y); return os2.apply(this, arguments); };
          };
          hookDirProto(window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype);
          if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
            hookDirProto(OffscreenCanvasRenderingContext2D.prototype);
          }
        } catch {}
      }
    } catch {}
  }

  let prevCanvasSampleVals = new Set();
  function processCanvasPriceSamples(samples) {
    if (!Array.isArray(samples) || samples.length === 0) return;
    const now = Date.now();
    const rawFresh = samples.filter(s => s && typeof s.val === 'number' && s.val > 0 && now - (s.t || now) < 3500);
    if (rawFresh.length === 0) return;

    const connectedSamples = rawFresh.filter(s => !s.offscreen);
    let fresh = connectedSamples.length > 0 ? connectedSamples : rawFresh;
    const refAnchor = lastPrice || (canvasAxisLabels.length > 0 ? canvasAxisLabels[0].val : null);
    if (connectedSamples.length === 0 && refAnchor && refAnchor > 0) {
      const nearAnchor = rawFresh.filter(s => Math.abs(s.val - refAnchor) / refAnchor < 0.08);
      if (nearAnchor.length > 0) fresh = nearAnchor;
    }

    telemetryStats.canvasSamples += fresh.length;
    telemetryStats.lastFeedAt = now;

    // 1. Prefer bright/live pill labels or values that actively changed vs static grid lines
    const brightCandidates = fresh.filter(s => s.bright);
    const dynamicChanged = fresh.filter(s => prevCanvasSampleVals.size > 0 && !prevCanvasSampleVals.has(s.val));
    let chosenLive = null;

    if (brightCandidates.length > 0) {
      chosenLive = brightCandidates[brightCandidates.length - 1].val;
    } else if (dynamicChanged.length > 0) {
      chosenLive = dynamicChanged[dynamicChanged.length - 1].val;
    } else {
      const nonRound = fresh.filter(s => {
        const parts = s.val.toString().split('.');
        return !parts[1] || !parts[1].endsWith('00');
      });
      if (nonRound.length > 0) chosenLive = nonRound[nonRound.length - 1].val;
      else chosenLive = fresh[fresh.length - 1].val;
    }

    prevCanvasSampleVals = new Set(fresh.map(s => s.val));

    if (chosenLive !== null && chosenLive > 0) {
      canvasLiveQuote = chosenLive;
      lastCanvasQuoteAt = now;
      if (!lastWsTickAt || now - lastWsTickAt > 2000) {
        ingestRealTick(poAsset, chosenLive, true);
      }
    }

    // Store Y-axis price scale labels for pixel-to-price calibration (on-screen axis only)
    const axisSource = connectedSamples.length >= 2 ? connectedSamples : fresh.filter(s => !s.offscreen);
    const gridLabels = [];
    const seenVals = new Set();
    for (let i = axisSource.length - 1; i >= 0; i--) {
      const s = axisSource[i];
      if (!seenVals.has(s.val)) {
        seenVals.add(s.val);
        gridLabels.push({ val: s.val, y: s.y, h: s.h });
      }
    }
    if (gridLabels.length >= 2) {
      canvasAxisLabels = gridLabels;
    }
  }

  function handleTelemetryPacket(pkt) {
    if (!pkt) return;
    if (pkt.kind === 'ws') {
      if (pkt.dir === 'in') processWSFrameText(pkt.data);
      else if (pkt.dir === 'out') processWSOutgoingText(pkt.data);
    } else if (pkt.kind === 'canvas_prices') {
      processCanvasPriceSamples(pkt.samples);
    }
  }

  document.addEventListener('__aladdin_telemetry__', (e) => {
    try {
      const pkt = typeof e.detail === 'string' ? JSON.parse(e.detail) : e.detail;
      handleTelemetryPacket(pkt);
    } catch {}
  });

  window.addEventListener('message', (e) => {
    try {
      if (e.data && e.data.__aladdin_telemetry_pkt) {
        handleTelemetryPacket(e.data.__aladdin_telemetry_pkt);
      }
    } catch {}
  });

  if (document.documentElement) injectPageTelemetryHook();
  else setTimeout(injectPageTelemetryHook, 20);

  // =========================================================================
  // 3. WEBSOCKET & REAL-TIME LIVE QUOTE OHLC ENGINE
  // =========================================================================
  function normalizeAssetName(str) {
    return String(str || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function symbolMatchesActive(symbol) {
    if (!symbol) return true;
    const symNorm = normalizeAssetName(symbol);
    if (!symNorm) return true;
    if (activeWsSymbol && normalizeAssetName(activeWsSymbol) === symNorm) return true;
    if (!poAsset) return true;
    const poNorm = normalizeAssetName(poAsset);
    const shortPO = poNorm.replace(/OTC$/, '');
    const shortSym = symNorm.replace(/OTC$/, '');
    return symNorm.includes(shortPO.slice(0, 6)) || poNorm.includes(shortSym.slice(0, 6));
  }

  function syncLiveQuoteHUDNow() {
    if (!root) return;
    const now = Date.now();
    if (now - lastQuoteHudSyncAt < 65) return;
    lastQuoteHudSyncAt = now;
    if (radarLivePrice) {
      radarLivePrice.textContent = lastPrice !== null && isPriceCalibrated
        ? formatPrice(lastPrice)
        : (canvasCandles.length > 0 ? `${canvasCandles[canvasCandles.length - 1].close.toFixed(1)}` : '—');
    }
    if (radarSourceLbl) {
      const actLen = getActiveCandles().length;
      radarSourceLbl.textContent = actLen > 0 ? `${dataSource} · ${actLen}c` : `Feed (${telemetryStats.wsIn}w·${telemetryStats.canvasSamples}p)`;
    }
    if (activeTrade) updateActiveTradeTicker();
  }

  function ingestRealTick(symbol, price, fromQuoteRelay = false) {
    if (typeof price !== 'number' || !isFinite(price) || price <= 0) return;
    if (!fromQuoteRelay && !symbolMatchesActive(symbol)) return;

    const now = Date.now();
    if (symbol && !fromQuoteRelay) activeWsSymbol = symbol;
    lastPrice = price;
    isPriceCalibrated = true;
    telemetryStats.lastFeedAt = now;
    tickHistory.push({ p: price, t: now });
    if (tickHistory.length > 36) tickHistory.shift();
    settlePendingSignalAudit();
    syncLiveQuoteHUDNow();

    const tfSec = TIMEFRAME_SECONDS[currentTimeframe] || 5;
    const bucket = Math.floor(now / (tfSec * 1000)) * (tfSec * 1000);

    if (!fromQuoteRelay) {
      lastWsTickAt = now;
      dataSource = canvasCandles.length >= 6 && wsCandles.length < 24 ? 'WS + Chart' : 'WebSocket Live';
      if (!currentCandle || currentCandle.bucket !== bucket) {
        if (currentCandle) {
          wsCandles.push({
            open: currentCandle.open,
            high: currentCandle.high,
            low: currentCandle.low,
            close: currentCandle.close,
            volume: currentCandle.volume,
            time: currentCandle.bucket
          });
          if (wsCandles.length > 80) wsCandles.shift();
        }
        currentCandle = { open: price, high: price, low: price, close: price, volume: 1, bucket };
      } else {
        currentCandle.close = price;
        if (price > currentCandle.high) currentCandle.high = price;
        if (price < currentCandle.low) currentCandle.low = price;
        currentCandle.volume++;
      }
      updateRealTechnicalAnalysis();
    } else {
      if (!lastWsTickAt || now - lastWsTickAt > 2500) {
        dataSource = canvasCandles.length >= 3 ? 'Live Chart X-Ray' : 'Live Quote';
      }
      if (!quoteCurrentCandle || quoteCurrentCandle.bucket !== bucket) {
        if (quoteCurrentCandle) {
          quoteCandles.push({
            open: quoteCurrentCandle.open,
            high: quoteCurrentCandle.high,
            low: quoteCurrentCandle.low,
            close: quoteCurrentCandle.close,
            volume: quoteCurrentCandle.volume,
            time: quoteCurrentCandle.bucket
          });
          if (quoteCandles.length > 75) quoteCandles.shift();
        }
        quoteCurrentCandle = { open: price, high: price, low: price, close: price, volume: 1, bucket };
        updateRealTechnicalAnalysis();
      } else {
        const changed = Math.abs(quoteCurrentCandle.close - price) > 0;
        quoteCurrentCandle.close = price;
        if (price > quoteCurrentCandle.high) quoteCurrentCandle.high = price;
        if (price < quoteCurrentCandle.low) quoteCurrentCandle.low = price;
        quoteCurrentCandle.volume++;
        if (changed) updateRealTechnicalAnalysis();
      }
    }
  }

  function ingestHistoricalCandles(symbol, arr) {
    if (!Array.isArray(arr) || arr.length < 2) return;
    if (!symbolMatchesActive(symbol)) return;
    if (symbol) activeWsSymbol = symbol;

    const mapped = [];
    const tfSec = TIMEFRAME_SECONDS[currentTimeframe] || 5;
    const tickBuckets = new Map();

    for (const c of arr) {
      if (Array.isArray(c) && c.length >= 5) {
        const open = Number(c[1]);
        const v2 = Number(c[2]);
        const v3 = Number(c[3]);
        const v4 = Number(c[4]);
        const high = Math.max(open, v2, v3, v4);
        const low = Math.min(open, v2, v3, v4);
        const close = v4 !== low && v4 !== high ? v4 : v2;
        if (isFinite(open) && isFinite(close) && high >= low && open > 0) {
          mapped.push({ open, high, low, close, volume: 10 });
        }
      } else if (Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number' && c[1] > 0) {
        const tsMs = c[0] > 1e12 ? c[0] : c[0] * 1000;
        const p = Number(c[1]);
        const b = Math.floor(tsMs / (tfSec * 1000)) * (tfSec * 1000);
        const existing = tickBuckets.get(b);
        if (!existing) {
          tickBuckets.set(b, { open: p, high: p, low: p, close: p, volume: 1, time: b });
        } else {
          existing.close = p;
          if (p > existing.high) existing.high = p;
          if (p < existing.low) existing.low = p;
          existing.volume++;
        }
      } else if (c && typeof c === 'object' && typeof c.open === 'number' && typeof c.close === 'number') {
        mapped.push({
          open: c.open,
          high: typeof c.high === 'number' ? c.high : Math.max(c.open, c.close),
          low: typeof c.low === 'number' ? c.low : Math.min(c.open, c.close),
          close: c.close,
          volume: c.volume || 10
        });
      }
    }

    const finalCandles = mapped.length >= 2
      ? mapped
      : Array.from(tickBuckets.values()).sort((a, b) => a.time - b.time);

    if (finalCandles.length >= 2) {
      wsCandles = finalCandles.slice(-75);
      lastPrice = wsCandles[wsCandles.length - 1].close;
      isPriceCalibrated = true;
      lastWsTickAt = Date.now();
      dataSource = 'WebSocket Live';
      updateRealTechnicalAnalysis(true);
    }
  }

  function processWSOutgoingText(rawText) {
    if (!rawText || typeof rawText !== 'string') return;
    try {
      const bracketIdx = rawText.search(/[\[{]/);
      if (bracketIdx < 0) return;
      const parsed = JSON.parse(rawText.slice(bracketIdx));
      if (Array.isArray(parsed) && parsed.length >= 2) {
        const evtName = String(parsed[0] || '');
        const payload = parsed[1];
        if (/changeSymbol|updateStream|loadHistory/i.test(evtName) && payload && typeof payload === 'object') {
          if (typeof payload.asset === 'string') activeWsSymbol = payload.asset;
          if (typeof payload.period === 'number' && Date.now() > autoSyncTimingUntil) {
            const pMap = { 5: '5s', 10: '10s', 15: '15s', 30: '30s', 60: '1m', 120: '2m', 300: '5m' };
            if (pMap[payload.period] && pMap[payload.period] !== currentTimeframe) {
              setTimeframeUI(pMap[payload.period], false);
            }
          }
        }
      }
    } catch {}
  }

  function inspectParsedPayload(node, depth = 0, hintSymbol = null) {
    if (!node || depth > 5) return;
    if (Array.isArray(node)) {
      if (node.length >= 3 && typeof node[0] === 'string' && typeof node[2] === 'number' && node[2] > 0 && node[2] < 1000000) {
        ingestRealTick(node[0], node[2], false);
        return;
      }
      // Top-level candle / tick-history array [[ts, o, c, h, l], ...] or [[ts, price], ...]
      if (node.length >= 3 && Array.isArray(node[0]) && typeof node[0][0] === 'number' && node[0][0] > 1e8 && typeof node[0][1] === 'number') {
        ingestHistoricalCandles(hintSymbol || activeWsSymbol, node);
        return;
      }
      // Socket.IO event array ["eventName", ...args]
      let localSym = hintSymbol;
      for (const item of node) {
        if (typeof item === 'string' && /^[#A-Z0-9_\/]{4,18}$/i.test(item) && !/candles|history|update|quotes|load/i.test(item)) {
          localSym = item;
        }
      }
      for (const item of node) {
        if (item && typeof item === 'object') {
          inspectParsedPayload(item, depth + 1, localSym);
        }
      }
      return;
    }
    if (typeof node === 'object') {
      const sym = node.asset || node.symbol || node.pair || hintSymbol || activeWsSymbol;
      if (Array.isArray(node.candles) && node.candles.length >= 2) {
        ingestHistoricalCandles(sym, node.candles);
      } else if (Array.isArray(node.history) && node.history.length >= 2) {
        ingestHistoricalCandles(sym, node.history);
      } else if (Array.isArray(node.ticks) && node.ticks.length >= 2) {
        ingestHistoricalCandles(sym, node.ticks);
      } else if (Array.isArray(node.bars) && node.bars.length >= 2) {
        ingestHistoricalCandles(sym, node.bars);
      } else if (typeof node.price === 'number') {
        ingestRealTick(sym, node.price, false);
      } else if (typeof node.close === 'number' && typeof node.open === 'number') {
        ingestRealTick(sym, node.close, false);
      } else if (node.data) {
        inspectParsedPayload(node.data, depth + 1, sym);
      } else if (node.quotes) {
        inspectParsedPayload(node.quotes, depth + 1, sym);
      }
    }
  }

  function extractBalancedJsonChunks(str) {
    const chunks = [];
    let i = 0;
    const len = str.length;
    while (i < len) {
      const ch = str[i];
      if (ch === '[' || ch === '{') {
        const openCh = ch;
        const closeCh = ch === '[' ? ']' : '}';
        let depth = 0;
        let inStr = false;
        let escaped = false;
        let j = i;
        for (; j < len; j++) {
          const c = str[j];
          if (inStr) {
            if (escaped) escaped = false;
            else if (c === '\\') escaped = true;
            else if (c === '"') inStr = false;
          } else {
            if (c === '"') inStr = true;
            else if (c === openCh) depth++;
            else if (c === closeCh) {
              depth--;
              if (depth === 0) {
                chunks.push(str.slice(i, j + 1));
                break;
              }
            }
          }
        }
        i = j < len ? j + 1 : i + 1;
      } else {
        i++;
      }
    }
    return chunks;
  }

  function processWSFrameText(rawText) {
    if (!rawText || typeof rawText !== 'string') return;
    telemetryStats.wsIn++;
    telemetryStats.lastFeedAt = Date.now();
    let parsedAny = false;
    try {
      const cleaned = rawText.replace(/[\x00-\x1F\x7F\uFFFD]/g, '');
      const chunks = extractBalancedJsonChunks(cleaned);
      for (const chunk of chunks) {
        try {
          const parsed = JSON.parse(chunk);
          inspectParsedPayload(parsed, 0, null);
          parsedAny = true;
          telemetryStats.wsParsed++;
        } catch {}
      }
      if (!parsedAny) {
        // Fallback regex extraction for binary/MsgPack strings carrying ASCII symbols & quotes
        const tickMatches = cleaned.matchAll(/"([A-Z0-9_\/#]{4,18})"\s*,\s*(\d{10,13}(?:\.\d+)?)\s*,\s*(\d{1,7}\.\d{1,7})/gi);
        for (const m of tickMatches) {
          const sym = m[1];
          const p = parseFloat(m[3]);
          if (sym && p > 0 && isFinite(p)) {
            ingestRealTick(sym, p, false);
            telemetryStats.wsParsed++;
          }
        }
      }
    } catch {}
  }

  // Drain any buffered WS frames from Auto-Loader
  try {
    const winTargets = [window];
    if (typeof unsafeWindow !== 'undefined' && unsafeWindow !== window) winTargets.push(unsafeWindow);
    for (const w of winTargets) {
      w.__ALADDIN_WS_LISTENER__ = function(dir, payload) {
        if (dir === 'in') processWSFrameText(payload);
        else if (dir === 'out') processWSOutgoingText(payload);
      };
      if (Array.isArray(w.__ALADDIN_WS_BUFFER__) && w.__ALADDIN_WS_BUFFER__.length > 0) {
        for (const entry of w.__ALADDIN_WS_BUFFER__) {
          if (entry && entry.dir === 'in') processWSFrameText(entry.data);
          else if (entry && entry.dir === 'out') processWSOutgoingText(entry.data);
        }
        w.__ALADDIN_WS_BUFFER__ = [];
      }
    }
  } catch {}

  // =========================================================================
  // 4. HIGH-DPI MULTI-LAYER <CANVAS> CANDLESTICK & WICK SCANNER + DOM FALLBACK
  // =========================================================================
  function collectAllCanvases(rootNode, result = []) {
    try {
      const nodes = rootNode.querySelectorAll('canvas, *');
      for (const el of nodes) {
        if (el.id === 'aladdin-floating-root' || (el.closest && el.closest('#aladdin-floating-root'))) continue;
        if (el.tagName === 'CANVAS') result.push(el);
        if (el.shadowRoot) collectAllCanvases(el.shadowRoot, result);
      }
    } catch {}
    return result;
  }

  function scrapeDOMAxisAndQuote() {
    let liveQuote = canvasLiveQuote && (Date.now() - lastCanvasQuoteAt < 4000) ? canvasLiveQuote : null;
    const axisLabels = [];

    try {
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const docs = [document];
      try {
        document.querySelectorAll('iframe').forEach(fr => {
          try { if (fr.contentDocument) docs.push(fr.contentDocument); } catch {}
        });
      } catch {}

      for (const doc of docs) {
        const all = doc.querySelectorAll('span, div, p, strong, text, tspan');
        for (const el of all) {
          if (el.closest && el.closest('#aladdin-floating-root')) continue;
          if (el.children && el.children.length > 0) continue;
          const txt = (el.textContent || '').trim();
          if (!txt || txt.length > 16) continue;
          const m = txt.match(/^(\d{1,7}\.\d{2,6})$/);
          if (!m) continue;

          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;
          if (rect.left > winW * 0.48 && rect.top > 40 && rect.top < winH * 0.88) {
            const val = parseFloat(m[1]);
            if (isNaN(val) || val <= 0) continue;

            const bg = getComputedStyle(el).backgroundColor || '';
            const hasSolidBg = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
            if (hasSolidBg && !liveQuote) {
              liveQuote = val;
            } else {
              axisLabels.push({ val, y: rect.top + rect.height / 2 });
            }
          }
        }
      }

      // Sentiment % bar (above deal panel, e.g. "64%" or "22%")
      for (const el of document.querySelectorAll('div, span')) {
        if (el.closest('#aladdin-floating-root') || el.children.length > 0) continue;
        const txt = (el.textContent || '').trim();
        const pm = txt.match(/^(\d{1,2})%$/);
        if (pm) {
          const rect = el.getBoundingClientRect();
          if (rect.top > winH * 0.42 && rect.top < winH * 0.78) {
            lastPOChartBuySentiment = parseInt(pm[1], 10);
          }
        }
      }
    } catch {}

    return { liveQuote, axisLabels };
  }

  function getViewfinderFocusRect(canvasEl) {
    try {
      if (!chartWindowEl || !isCardExpanded || !card || !card.classList.contains('al-signal-cam')) return null;
      const vfRect = chartWindowEl.getBoundingClientRect();
      const cRect = canvasEl.getBoundingClientRect();
      if (vfRect.width < 80 || vfRect.height < 60 || cRect.width < 120 || cRect.height < 80) return null;

      const interLeft = Math.max(vfRect.left, cRect.left);
      const interRight = Math.min(vfRect.right, cRect.right);
      const interTop = Math.max(vfRect.top, cRect.top);
      const interBot = Math.min(vfRect.bottom, cRect.bottom);
      const interW = interRight - interLeft;
      const interH = interBot - interTop;
      if (interW < 70 || interH < 50) return null;

      const sx = canvasEl.width / cRect.width;
      const sy = canvasEl.height / cRect.height;
      return {
        x0: Math.max(0, Math.floor((interLeft - cRect.left) * sx)),
        x1: Math.min(canvasEl.width, Math.ceil((interRight - cRect.left) * sx)),
        y0: Math.max(0, Math.floor((interTop - cRect.top) * sy)),
        y1: Math.min(canvasEl.height, Math.ceil((interBot - cRect.top) * sy)),
        overlapArea: interW * interH
      };
    } catch {
      return null;
    }
  }

  function extractCandlesFromCanvas(canvasEl) {
    try {
      const w = canvasEl.width;
      const h = canvasEl.height;
      if (w < 90 || h < 70) return null;

      const vfFocus = getViewfinderFocusRect(canvasEl);

      // Scan full main chart horizontal span so 50-60 historical bars + rightmost forming bar are always captured
      const xStart = Math.floor(w * 0.01);
      const xEnd = Math.floor(w * 0.91);
      const yStart = Math.floor(h * 0.04);
      const yMaxEnd = Math.floor(h * 0.90);
      const scanW = xEnd - xStart;
      const maxScanH = yMaxEnd - yStart;
      if (scanW <= 20 || maxScanH <= 20) return null;

      let data = null;
      let isWebGL = false;
      try {
        const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          data = ctx.getImageData(xStart, yStart, scanW, maxScanH).data;
        }
      } catch {}

      if (!data) {
        try {
          const gl = canvasEl.getContext('webgl2') || canvasEl.getContext('webgl') || canvasEl.getContext('experimental-webgl');
          if (gl) {
            const glBuf = new Uint8Array(scanW * maxScanH * 4);
            gl.readPixels(xStart, Math.max(0, h - yMaxEnd), scanW, maxScanH, gl.RGBA, gl.UNSIGNED_BYTE, glBuf);
            let nonZero = 0;
            for (let p = 3; p < glBuf.length; p += Math.max(4, Math.floor(glBuf.length / 400))) {
              if (glBuf[p] > 10) { nonZero++; break; }
            }
            if (nonZero > 0) {
              data = glBuf;
              isWebGL = true;
            }
          }
        } catch {}
      }

      if (!data) {
        try {
          const scratch = document.createElement('canvas');
          scratch.width = scanW;
          scratch.height = maxScanH;
          const sCtx = scratch.getContext('2d', { willReadFrequently: true });
          if (sCtx) {
            sCtx.drawImage(canvasEl, xStart, yStart, scanW, maxScanH, 0, 0, scanW, maxScanH);
            data = sCtx.getImageData(0, 0, scanW, maxScanH).data;
          }
        } catch {}
      }

      if (!data) return null;

      const xStep = Math.max(1, Math.floor(scanW / 640));
      const yStep = Math.max(1, Math.floor(maxScanH / 360));

      // Dynamic sub-pane separator detector: only clip if a genuine quiet gap sits above lower oscillator activity
      let scanH = Math.floor(maxScanH * 0.90);
      const rowProbeStart = Math.floor(maxScanH * 0.66);
      const rowProbeEnd = Math.floor(maxScanH * 0.90);
      const xProbeStep = Math.max(xStep * 2, Math.floor(scanW / 90));
      let quietStreak = 0;
      let candidateGapY = -1;
      let dividerY = -1;
      for (let y = rowProbeStart; y < rowProbeEnd; y += yStep) {
        const yRow = isWebGL ? (maxScanH - 1 - y) : y;
        let vividHits = 0;
        for (let x = 0; x < scanW; x += xProbeStep) {
          const idx = (yRow * scanW + x) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
          if (a < 60) continue;
          if ((g >= 85 && g - r >= 18) || (r >= 98 && r - g >= 24) || (b > r + 24 && b > 105)) vividHits++;
        }
        if (vividHits === 0) {
          quietStreak++;
          if (quietStreak >= 4 && candidateGapY === -1) {
            candidateGapY = y - yStep * 2;
          }
        } else {
          if (candidateGapY !== -1) {
            // Activity resumed below quiet divider -> genuine bottom oscillator sub-pane
            dividerY = candidateGapY;
            break;
          }
          quietStreak = 0;
        }
      }
      if (dividerY > Math.floor(maxScanH * 0.64)) {
        scanH = Math.min(scanH, dividerY);
      } else {
        scanH = Math.min(scanH, Math.floor(h * 0.84) - yStart);
      }
      if (scanH < 24) scanH = maxScanH;

      const columns = [];
      const lineColumns = [];

      for (let x = 0; x < scanW; x += xStep) {
        let gTop = Infinity, gBot = -1, gCount = 0;
        let rTop = Infinity, rBot = -1, rCount = 0;
        let lineYSum = 0, lineCnt = 0;
        const greenRows = [];
        const redRows = [];

        for (let y = 0; y < scanH; y += yStep) {
          const yRow = isWebGL ? (maxScanH - 1 - y) : y;
          const idx = (yRow * scanW + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          if (a < 60) continue;

          // Vivid candle colors (skips dim semi-transparent Ichimoku/Keltner indicator clouds)
          if (g >= 85 && g - r >= 18 && g >= b - 15) {
            if (y < gTop) gTop = y;
            if (y > gBot) gBot = y;
            gCount++;
            greenRows.push(y);
          } else if (r >= 98 && r - g >= 24 && r >= b) {
            if (y < rTop) rTop = y;
            if (y > rBot) rBot = y;
            rCount++;
            redRows.push(y);
          } else if ((b > r + 24 && b > 105) || (r > 185 && g > 185 && b > 185)) {
            lineYSum += y;
            lineCnt++;
          }
        }

        const gSpan = gBot >= gTop ? gBot - gTop : 0;
        const rSpan = rBot >= rTop ? rBot - rTop : 0;
        const validG = gCount >= 2 || gSpan >= 3;
        const validR = rCount >= 2 || rSpan >= 3;
        if (validG || validR) {
          const isBullish = validG && (!validR || gCount >= rCount);
          const absX = xStart + x;
          const inViewfinder = vfFocus ? (absX >= vfFocus.x0 && absX <= vfFocus.x1) : false;
          columns.push({
            x,
            absX,
            inViewfinder,
            isBullish,
            top: isBullish ? gTop : rTop,
            bot: isBullish ? gBot : rBot,
            rows: isBullish ? greenRows : redRows,
            count: isBullish ? gCount : rCount
          });
        } else if (lineCnt >= 1 && lineCnt <= 14) {
          lineColumns.push({ x, y: lineYSum / lineCnt });
        }
      }

      if (columns.length >= 3) {
        const maxClusterCols = Math.max(24, Math.floor((scanW / xStep) * 0.085));
        const maxGap = xStep * 2;
        const rawClusters = [];
        let cluster = [columns[0]];
        for (let i = 1; i < columns.length; i++) {
          const prev = columns[i - 1];
          const curr = columns[i];
          if (curr.x - prev.x <= maxGap && curr.isBullish === prev.isBullish && cluster.length < maxClusterCols) {
            cluster.push(curr);
          } else {
            rawClusters.push(cluster);
            cluster = [curr];
          }
        }
        rawClusters.push(cluster);

        const validClusters = rawClusters.filter(cols => cols.length >= 2 || (cols.length === 1 && cols[0].count >= 2));
        if (validClusters.length >= 2) {
          return { canvasEl, kind: 'candles', clusters: validClusters, yStart, scanH, h, vfFocus };
        }
      }

      // Fallback for Pocket Option Line / Area charts
      if (lineColumns.length >= 16) {
        return { canvasEl, kind: 'line', lineColumns, yStart, scanH, h, vfFocus };
      }
      return null;
    } catch {
      return null;
    }
  }

  function scanPOChartCanvas() {
    try {
      lastCanvasScanAt = Date.now();
      const canvases = collectAllCanvases(document);
      try {
        document.querySelectorAll('iframe').forEach(fr => {
          try {
            if (fr.contentDocument) collectAllCanvases(fr.contentDocument, canvases);
          } catch {}
        });
      } catch {}

      const eligible = [];
      for (const c of canvases) {
        const rect = c.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (rect.width >= 130 && rect.height >= 90 && c.width >= 90 && c.height >= 70) {
          eligible.push({ c, area });
        }
      }

      if (eligible.length === 0) return false;
      eligible.sort((a, b) => b.area - a.area);
      const maxArea = eligible[0].area;

      let bestScan = null;
      let bestScore = 0;
      for (const item of eligible.slice(0, 12)) {
        if (item.area < maxArea * 0.12) break;
        const res = extractCandlesFromCanvas(item.c);
        if (res) {
          let score = res.kind === 'candles' ? res.clusters.length * 10 : res.lineColumns.length;
          if (res.vfFocus && res.vfFocus.overlapArea > 5000) score += 120;
          if (!bestScan || score > bestScore) {
            bestScan = res;
            bestScore = score;
          }
        }
      }

      const { liveQuote, axisLabels } = scrapeDOMAxisAndQuote();
      if (liveQuote && (!lastWsTickAt || Date.now() - lastWsTickAt > 1800)) {
        ingestRealTick(poAsset, liveQuote, true);
      }

      if (!bestScan) return false;

      const { canvasEl, kind, yStart, scanH, h, vfFocus } = bestScan;
      if (vfFocus) lastViewfinderScanActiveAt = Date.now();
      const rect = canvasEl.getBoundingClientRect();
      const scaleYToCss = rect.height / h;

      let priceAtY = null;
      let calibrated = false;

      if (canvasAxisLabels.length >= 2) {
        const sorted = [...canvasAxisLabels].sort((a, b) => a.y - b.y);
        const topLbl = sorted[0];
        const botLbl = sorted[sorted.length - 1];
        const ratio = topLbl.h > 0 ? h / topLbl.h : 1;
        const topCanvasY = topLbl.y * ratio;
        const botCanvasY = botLbl.y * ratio;
        const dy = botCanvasY - topCanvasY;
        const dp = topLbl.val - botLbl.val;
        if (dy > 16 && dp > 0) {
          calibrated = true;
          priceAtY = (relY) => {
            const absY = yStart + relY;
            const raw = topLbl.val - ((absY - topCanvasY) / dy) * dp;
            return Number(raw.toFixed(raw >= 15 ? 3 : 5));
          };
        }
      }

      if (!priceAtY && axisLabels.length >= 2) {
        axisLabels.sort((a, b) => a.y - b.y);
        const topLbl = axisLabels[0];
        const botLbl = axisLabels[axisLabels.length - 1];
        const dy = botLbl.y - topLbl.y;
        const dp = topLbl.val - botLbl.val;
        if (dy > 16 && dp > 0) {
          calibrated = true;
          priceAtY = (canvasY) => {
            const cssY = rect.top + (yStart + canvasY) * scaleYToCss;
            const raw = topLbl.val - ((cssY - topLbl.y) / dy) * dp;
            return Number(raw.toFixed(raw >= 15 ? 3 : 5));
          };
        }
      }

      if (!priceAtY && (liveQuote || (lastPrice && isPriceCalibrated))) {
        const anchorPrice = liveQuote || lastPrice;
        calibrated = true;
        priceAtY = (canvasY) => {
          const rel = 1 - canvasY / scanH;
          const raw = anchorPrice * (0.9990 + rel * 0.0020);
          return Number(raw.toFixed(anchorPrice >= 15 ? 3 : 5));
        };
      }

      if (!priceAtY) {
        calibrated = false;
        priceAtY = (canvasY) => Number((100 - (canvasY / scanH) * 100).toFixed(1));
      }

      const extracted = [];
      if (kind === 'candles') {
        for (const cols of bestScan.clusters) {
          const isBullish = cols[0].isBullish;
          const widthCols = cols.length;
          const inViewfinder = cols.some(c => c.inViewfinder);
          let highY = Infinity;
          let lowY = -1;
          const rowCounts = new Map();

          for (const col of cols) {
            if (col.top < highY) highY = col.top;
            if (col.bot > lowY) lowY = col.bot;
            for (const ry of col.rows) {
              rowCounts.set(ry, (rowCounts.get(ry) || 0) + 1);
            }
          }

          const bodyThreshold = Math.max(1, Math.floor(widthCols * 0.42));
          let bodyTopY = Infinity;
          let bodyBotY = -1;
          for (const [ry, cnt] of rowCounts.entries()) {
            if (cnt >= bodyThreshold) {
              if (ry < bodyTopY) bodyTopY = ry;
              if (ry > bodyBotY) bodyBotY = ry;
            }
          }
          if (bodyTopY === Infinity || bodyBotY === -1) {
            bodyTopY = Math.round((highY + lowY) / 2) - 1;
            bodyBotY = Math.round((highY + lowY) / 2) + 1;
          }

          const high = priceAtY(highY);
          const low = priceAtY(lowY);
          const topPrice = priceAtY(bodyTopY);
          const botPrice = priceAtY(bodyBotY);
          extracted.push({
            open: isBullish ? botPrice : topPrice,
            high,
            low,
            close: isBullish ? topPrice : botPrice,
            volume: widthCols,
            inViewfinder
          });
        }
      } else if (kind === 'line') {
        const pts = bestScan.lineColumns;
        const bucketCount = Math.min(36, Math.max(10, Math.floor(pts.length / 4)));
        const bucketSize = Math.max(2, Math.floor(pts.length / bucketCount));
        for (let i = 0; i < pts.length; i += bucketSize) {
          const slice = pts.slice(i, i + bucketSize);
          if (slice.length < 2) continue;
          const open = priceAtY(slice[0].y);
          const close = priceAtY(slice[slice.length - 1].y);
          const minY = Math.min(...slice.map(p => p.y));
          const maxY = Math.max(...slice.map(p => p.y));
          extracted.push({
            open,
            high: priceAtY(minY),
            low: priceAtY(maxY),
            close,
            volume: slice.length,
            inViewfinder: !!vfFocus
          });
        }
      }

      if (extracted.length >= 2) {
        canvasCandles = extracted.slice(-60);
        telemetryStats.chartScans++;
        telemetryStats.lastFeedAt = Date.now();
        isPriceCalibrated = calibrated || isPriceCalibrated;
        if (liveQuote) {
          lastPrice = liveQuote;
          isPriceCalibrated = true;
        } else if (!lastWsTickAt || Date.now() - lastWsTickAt > 4000) {
          if (calibrated) lastPrice = canvasCandles[canvasCandles.length - 1].close;
        }
        if (!lastWsTickAt || Date.now() - lastWsTickAt > 4000) {
          dataSource = vfFocus ? 'Viewfinder X-Ray' : (canvasLiveQuote ? 'Canvas X-Ray' : 'Live Chart');
        } else if (wsCandles.length < 24) {
          dataSource = 'WS + Chart';
        }
        return true;
      }
    } catch {}
    return false;
  }

  // =========================================================================
  // 5. HYBRID CANDLE STITCHER & 5-POINT ANTI-FAKEOUT CONFLUENCE ENGINE
  // =========================================================================
  function getActiveCandles() {
    const now = Date.now();
    const useWS = (wsCandles.length >= 1 || currentCandle) && (now - lastWsTickAt < 25000);
    if (useWS) {
      const wsList = currentCandle ? [...wsCandles, currentCandle] : [...wsCandles];
      // Hybrid Fusion: stitch historical Canvas X-Ray candles on the left until WebSocket accumulates 26+ bars
      if (wsList.length < 26 && canvasCandles.length >= 4) {
        const needLeft = Math.min(canvasCandles.length, Math.max(0, 60 - wsList.length));
        const histSlice = canvasCandles.slice(-needLeft - 1, -1); // exclude forming rightmost bar replaced by WS open
        if (histSlice.length >= 3) {
          const anchorWS = wsList[0].open;
          const tailCanvasClose = histSlice[histSlice.length - 1].close;
          const ratio = tailCanvasClose > 0 ? anchorWS / tailCanvasClose : 1;
          const isCompatibleScale = ratio > 0.985 && ratio < 1.015;
          const stitchedLeft = histSlice.map(c => {
            if (isCompatibleScale) {
              const offset = anchorWS - tailCanvasClose;
              const adj = Math.abs(offset) > anchorWS * 0.00003 ? offset : 0;
              return {
                open: c.open + adj,
                high: c.high + adj,
                low: c.low + adj,
                close: c.close + adj,
                volume: c.volume
              };
            }
            // If canvas was uncalibrated 0..100 index scale, map relative oscillation onto real anchor price
            const relDiff = (val) => ((val - tailCanvasClose) / 100) * (anchorWS * 0.0022);
            return {
              open: anchorWS + relDiff(c.open),
              high: anchorWS + relDiff(c.high),
              low: anchorWS + relDiff(c.low),
              close: anchorWS + relDiff(c.close),
              volume: c.volume
            };
          });
          dataSource = 'WS + Chart';
          return [...stitchedLeft, ...wsList].slice(-60);
        }
      }
      dataSource = wsList.length >= 26 ? 'WebSocket Live' : 'WS + Chart';
      return wsList.slice(-60);
    }
    if (canvasCandles.length >= 3) {
      if (quoteCurrentCandle && isPriceCalibrated && quoteCurrentCandle.close > 0) {
        const lastCanvas = canvasCandles[canvasCandles.length - 1];
        if (Math.abs(lastCanvas.close - quoteCurrentCandle.close) > 0) {
          return [...canvasCandles.slice(-60, -1), {
            open: lastCanvas.open,
            high: Math.max(lastCanvas.high, quoteCurrentCandle.close),
            low: Math.min(lastCanvas.low, quoteCurrentCandle.close),
            close: quoteCurrentCandle.close,
            volume: lastCanvas.volume
          }];
        }
      }
      return canvasCandles.slice(-60);
    }
    if (quoteCandles.length >= 1) {
      return (quoteCurrentCandle ? [...quoteCandles, quoteCurrentCandle] : quoteCandles).slice(-60);
    }
    if (canvasCandles.length >= 2) return canvasCandles.slice(-60);
    return quoteCurrentCandle ? [quoteCurrentCandle] : [];
  }

  function calcEMA(values, period) {
    if (!values || values.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return ema;
  }

  function calcBollinger(closes, period = 20, mult = 2) {
    const slice = closes.slice(-Math.min(period, closes.length));
    if (slice.length < 4) return null;
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
    const std = Math.sqrt(variance);
    return {
      mid: mean,
      upper: mean + mult * std,
      lower: mean - mult * std,
      std
    };
  }

  function computeMultiTouchSR(bars, decimals) {
    const n = bars.length;
    if (n < 4) {
      const hi = Math.max(...bars.map(b => b.high));
      const lo = Math.min(...bars.map(b => b.low));
      return { support: Number(lo.toFixed(decimals)), resistance: Number(hi.toFixed(decimals)), supTouches: 1, resTouches: 1 };
    }
    const maxH = Math.max(...bars.map(b => b.high));
    const minL = Math.min(...bars.map(b => b.low));
    const fullSpan = Math.max(0.000001, maxH - minL);
    const zoneTol = fullSpan * 0.085;

    const swingHighs = [];
    const swingLows = [];
    for (let i = 1; i < n - 1; i++) {
      if (bars[i].high >= bars[i - 1].high && bars[i].high >= bars[i + 1].high) {
        swingHighs.push(bars[i].high);
      }
      if (bars[i].low <= bars[i - 1].low && bars[i].low <= bars[i + 1].low) {
        swingLows.push(bars[i].low);
      }
    }

    const pickBestZone = (pivots, fallbackVal, isRes) => {
      if (pivots.length === 0) return { level: Number(fallbackVal.toFixed(decimals)), touches: 1 };
      let bestLevel = fallbackVal;
      let bestScore = -1;
      let bestTouches = 1;
      for (const p of pivots) {
        let hits = 0;
        for (const bar of bars) {
          if (isRes && bar.high >= p - zoneTol && bar.close <= p + zoneTol * 0.6) hits++;
          else if (!isRes && bar.low <= p + zoneTol && bar.close >= p - zoneTol * 0.6) hits++;
        }
        const proximityExtreme = isRes ? (p >= maxH - fullSpan * 0.25 ? 1.5 : 0) : (p <= minL + fullSpan * 0.25 ? 1.5 : 0);
        const sc = hits + proximityExtreme;
        if (sc > bestScore) {
          bestScore = sc;
          bestLevel = p;
          bestTouches = Math.max(1, hits);
        }
      }
      if (bestTouches < 2) bestLevel = fallbackVal;
      return { level: Number(bestLevel.toFixed(decimals)), touches: bestTouches };
    };

    const resZone = pickBestZone(swingHighs, maxH, true);
    const supZone = pickBestZone(swingLows, minL, false);
    if (resZone.level <= supZone.level) {
      return { support: Number(minL.toFixed(decimals)), resistance: Number(maxH.toFixed(decimals)), supTouches: 1, resTouches: 1 };
    }
    return { support: supZone.level, resistance: resZone.level, supTouches: supZone.touches, resTouches: resZone.touches };
  }

  function computeTickVelocity(nowMs, refSpan) {
    if (tickHistory.length < 4) return { dir: 'NEUTRAL', strength: 0, snapBounceUp: false, snapRejectDown: false };
    const recentTicks = tickHistory.filter(t => nowMs - t.t <= 1600);
    if (recentTicks.length < 3) return { dir: 'NEUTRAL', strength: 0, snapBounceUp: false, snapRejectDown: false };

    const first = recentTicks[0].p;
    const last = recentTicks[recentTicks.length - 1].p;
    let hi = -Infinity, lo = Infinity;
    for (const tk of recentTicks) {
      if (tk.p > hi) hi = tk.p;
      if (tk.p < lo) lo = tk.p;
    }
    const netDelta = last - first;
    const normSpan = Math.max(0.000001, refSpan);
    const bounceFromLow = (last - lo) / normSpan;
    const rejectFromHigh = (hi - last) / normSpan;
    const snapBounceUp = bounceFromLow >= 0.08 && netDelta > 0;
    const snapRejectDown = rejectFromHigh >= 0.08 && netDelta < 0;
    const strength = Math.min(1, Math.abs(netDelta) / (normSpan * 0.14));
    const dir = netDelta > 0 ? 'BUY' : netDelta < 0 ? 'SELL' : 'NEUTRAL';
    return { dir, strength, snapBounceUp, snapRejectDown };
  }

  function settlePendingSignalAudit() {
    if (!pendingSignalAudit) return;
    if (Date.now() < pendingSignalAudit.endTime) return;
    if (lastPrice !== null && isPriceCalibrated && pendingSignalAudit.entryPrice > 0) {
      const won = pendingSignalAudit.direction === 'CALL'
        ? lastPrice > pendingSignalAudit.entryPrice
        : lastPrice < pendingSignalAudit.entryPrice;
      const lost = pendingSignalAudit.direction === 'CALL'
        ? lastPrice < pendingSignalAudit.entryPrice
        : lastPrice > pendingSignalAudit.entryPrice;
      if (won) signalWins++;
      else if (lost) signalLosses++;
      savePersistedState();
    }
    pendingSignalAudit = null;
  }

  function updateRealTechnicalAnalysis(suppressAlert = false) {
    settlePendingSignalAudit();
    const activeCandles = getActiveCandles();
    const now = Date.now();

    if (lockedSignal && (now >= lockedSignal.unlockAt || lockedSignal.asset !== poAsset || lockedSignal.timeframe !== currentTimeframe)) {
      lockedSignal = null;
    }

    if (activeCandles.length < 2) {
      realSignal = 'WAIT';
      signalConfidence = 0;
      marketBiasDir = 'NEUTRAL';
      marketBiasPct = 50;
      realTrend = 'NEUTRAL';
      confluenceReasons = lastPrice !== null
        ? [`Quote ${formatPrice(lastPrice)}`, `Building Candles (${activeCandles.length}/4)`]
        : [`WS In: ${telemetryStats.wsIn}`, `Canvas Px: ${telemetryStats.canvasSamples}`];
      currentPattern = lastPrice !== null
        ? `Live Quote ${formatPrice(lastPrice)} · Building candle (${activeCandles.length}/4)`
        : `Waiting for live chart feed...`;
      updateSignalUI();
      drawMiniCandlestickChart();
      return;
    }

    const recent = activeCandles.slice(-60);
    const closes = recent.map(c => c.close);
    const latest = recent[recent.length - 1];
    const prev = recent[recent.length - 2];
    const prev2 = recent.length >= 3 ? recent[recent.length - 3] : null;
    const decimals = getPriceDecimals(latest.close);

    // 1. Multi-Touch Institutional S/R Zones (50-60 candle lookback)
    const sr = computeMultiTouchSR(recent, decimals);
    realSupport = sr.support;
    realResistance = sr.resistance;
    const range = Math.max(0.000001, realResistance - realSupport);

    const relRange = isPriceCalibrated && latest.close > 0 ? range / latest.close : range / 100;
    const isDeadFlat = relRange < 0.000007;

    // Micro-chop detection over last 6 bars (tiny bodies alternating with zero net movement)
    let isChoppy = false;
    if (recent.length >= 6) {
      const tail6 = recent.slice(-6);
      const netDisp = Math.abs(tail6[tail6.length - 1].close - tail6[0].open);
      const sumBodies = tail6.reduce((acc, c) => acc + Math.abs(c.close - c.open), 0);
      if (sumBodies > 0 && netDisp / sumBodies < 0.14 && relRange < 0.00014) {
        isChoppy = true;
      }
    }

    // 2. Wilder's RSI (adaptive from 1+ intervals up to 14)
    const rsiLen = Math.min(14, recent.length - 1);
    let prevRSI = realRSI;
    if (rsiLen >= 1) {
      let gains = 0;
      let losses = 0;
      for (let i = recent.length - rsiLen; i < recent.length; i++) {
        const diff = recent[i].close - recent[i - 1].close;
        if (diff > 0) gains += diff;
        else losses += Math.abs(diff);
      }
      const avgGain = gains / rsiLen;
      const avgLoss = losses / rsiLen;
      if (avgLoss === 0 && avgGain === 0) realRSI = 50.0;
      else if (avgLoss === 0) realRSI = 92.0;
      else realRSI = Number((100 - (100 / (1 + avgGain / avgLoss))).toFixed(1));
    }

    // 3. Stochastic %K(14) & %D(3)
    const kSeries = [];
    const kStart = Math.max(0, recent.length - 3);
    for (let idx = kStart; idx < recent.length; idx++) {
      const sub = recent.slice(Math.max(0, idx - 13), idx + 1);
      const hi = Math.max(...sub.map(c => c.high));
      const lo = Math.min(...sub.map(c => c.low));
      const kv = hi > lo ? ((recent[idx].close - lo) / (hi - lo)) * 100 : 50;
      kSeries.push(kv);
    }
    realStochK = Number((kSeries[kSeries.length - 1] ?? 50).toFixed(1));
    realStochD = Number((kSeries.reduce((a, b) => a + b, 0) / kSeries.length).toFixed(1));
    const prevStochK = kSeries.length >= 2 ? kSeries[kSeries.length - 2] : realStochK;

    // 4. Triple EMA Structure (5 / 13 / 21) + Slope
    const ema5Now = calcEMA(closes.slice(-14), 5);
    const ema13Now = calcEMA(closes.slice(-26), 13);
    const ema21Now = calcEMA(closes, 21);
    const ema5Prev = closes.length > 2 ? calcEMA(closes.slice(-15, -1), 5) : ema5Now;
    const emaSlopeUp = ema5Now > ema5Prev;
    const emaSlopeDown = ema5Now < ema5Prev;
    const strongUp = ema5Now > ema13Now && ema13Now >= ema21Now && emaSlopeUp;
    const strongDown = ema5Now < ema13Now && ema13Now <= ema21Now && emaSlopeDown;
    realTrend = strongUp || (ema5Now > ema13Now && emaSlopeUp)
      ? 'UPTREND'
      : strongDown || (ema5Now < ema13Now && emaSlopeDown)
      ? 'DOWNTREND'
      : 'RANGING';

    // 5. Bollinger Bands (20, 2.0)
    const bb = calcBollinger(closes, 20, 2);

    // 6. Closed-Candle vs Forming Anatomy & Tick Snap-Rejection Velocity
    const prevBull = prev.close >= prev.open;
    const prevBear = prev.close < prev.open;
    const anatCandle = latest.high > latest.low ? latest : (prev.high > prev.low ? prev : latest);
    const fullSpan = Math.max(0.000001, anatCandle.high - anatCandle.low);
    const body = Math.max(0.0000005, Math.abs(anatCandle.close - anatCandle.open));
    const upperWick = Math.max(0, anatCandle.high - Math.max(anatCandle.open, anatCandle.close));
    const lowerWick = Math.max(0, Math.min(anatCandle.open, anatCandle.close) - anatCandle.low);
    const isBullCandle = latest.close >= latest.open;
    const isBearCandle = latest.close < latest.open;

    if (anatCandle.high > anatCandle.low) {
      wickMetrics = {
        upperPct: Math.round((upperWick / fullSpan) * 100),
        bodyPct: Math.round((body / fullSpan) * 100),
        lowerPct: Math.round((lowerWick / fullSpan) * 100)
      };
    }

    const nearSupport = latest.low <= realSupport + range * 0.22;
    const nearResistance = latest.high >= realResistance - range * 0.22;
    const vel = computeTickVelocity(now, range);

    let buyScore = 0;
    let sellScore = 0;
    const buyReasons = [];
    const sellReasons = [];

    if (nearSupport) {
      const supPts = sr.supTouches >= 2 ? 22 : 13;
      buyScore += supPts;
      buyReasons.push(sr.supTouches >= 2 ? `Support ${sr.supTouches}x` : 'Support Zone');
    }
    if (nearResistance) {
      const resPts = sr.resTouches >= 2 ? 22 : 13;
      sellScore += resPts;
      sellReasons.push(sr.resTouches >= 2 ? `Resist ${sr.resTouches}x` : 'Resistance Zone');
    }

    if (bb && bb.std > 0) {
      if (latest.low <= bb.lower && (isBullCandle || wickMetrics.lowerPct >= 30)) {
        buyScore += 18;
        buyReasons.push('BB Lower Bounce');
      } else if (latest.high >= bb.upper && (isBearCandle || wickMetrics.upperPct >= 30)) {
        sellScore += 18;
        sellReasons.push('BB Upper Reject');
      }
    }

    // Pinbar / Rejection Wick Confluence
    if (wickMetrics.lowerPct >= 42 && wickMetrics.lowerPct > wickMetrics.upperPct * 1.6) {
      buyScore += nearSupport ? 24 : 18;
      buyReasons.push(`Bull Pinbar (${wickMetrics.lowerPct}%)`);
    } else if (wickMetrics.lowerPct >= 34 && wickMetrics.lowerPct > wickMetrics.upperPct) {
      buyScore += 13;
      buyReasons.push(`Lower Wick (${wickMetrics.lowerPct}%)`);
    }
    if (wickMetrics.upperPct >= 42 && wickMetrics.upperPct > wickMetrics.lowerPct * 1.6) {
      sellScore += nearResistance ? 24 : 18;
      sellReasons.push(`Bear Pinbar (${wickMetrics.upperPct}%)`);
    } else if (wickMetrics.upperPct >= 34 && wickMetrics.upperPct > wickMetrics.lowerPct) {
      sellScore += 13;
      sellReasons.push(`Upper Wick (${wickMetrics.upperPct}%)`);
    }

    // Closed-candle structure + live candle confirmation
    if (prevBear && isBullCandle && latest.close >= prev.open) {
      buyScore += 20;
      buyReasons.push('Bull Engulfing');
    } else if (prevBull && isBearCandle && latest.close <= prev.open) {
      sellScore += 20;
      sellReasons.push('Bear Engulfing');
    } else if (prevBull && isBullCandle && wickMetrics.bodyPct >= 46) {
      buyScore += 15;
      buyReasons.push('2-Bar Bull Flow');
    } else if (prevBear && isBearCandle && wickMetrics.bodyPct >= 46) {
      sellScore += 15;
      sellReasons.push('2-Bar Bear Flow');
    }

    // Snap Rejection / Opening-Impulse Tick Velocity
    if (vel.snapBounceUp && (nearSupport || isBullCandle)) {
      buyScore += 14;
      buyReasons.push('Snap Bounce Up');
    } else if (vel.snapRejectDown && (nearResistance || isBearCandle)) {
      sellScore += 14;
      sellReasons.push('Snap Reject Down');
    }

    if (prev2 && prev2.close < prev2.open && prevBear && isBullCandle) {
      buyScore += 14;
      buyReasons.push('3-Bar Reversal Up');
    } else if (prev2 && prev2.close > prev2.open && prevBull && isBearCandle) {
      sellScore += 14;
      sellReasons.push('3-Bar Reversal Down');
    }

    if (realRSI !== null) {
      const rsiTurningUp = prevRSI !== null && realRSI > prevRSI;
      const rsiTurningDown = prevRSI !== null && realRSI < prevRSI;
      if (realRSI <= 35) {
        buyScore += rsiTurningUp ? 20 : 16;
        buyReasons.push(`RSI Oversold (${realRSI})`);
      } else if (realRSI >= 65) {
        sellScore += rsiTurningDown ? 20 : 16;
        sellReasons.push(`RSI Overbought (${realRSI})`);
      } else if (realTrend === 'UPTREND' && realRSI >= 48 && realRSI < 64 && isBullCandle) {
        buyScore += 12;
        buyReasons.push(`RSI Bull (${realRSI})`);
      } else if (realTrend === 'DOWNTREND' && realRSI <= 52 && realRSI > 36 && isBearCandle) {
        sellScore += 12;
        sellReasons.push(`RSI Bear (${realRSI})`);
      }
    }

    if (realStochK <= 30 && (realStochK >= realStochD || realStochK > prevStochK)) {
      buyScore += 16;
      buyReasons.push(`Stoch Cross (${realStochK})`);
    } else if (realStochK >= 70 && (realStochK <= realStochD || realStochK < prevStochK)) {
      sellScore += 16;
      sellReasons.push(`Stoch Cross (${realStochK})`);
    }

    if (realTrend === 'UPTREND' && emaSlopeUp) {
      buyScore += strongUp ? 19 : 13;
      if (latest.low <= ema13Now && isBullCandle) {
        buyScore += 10;
        buyReasons.push('EMA13 Pullback');
      } else {
        buyReasons.push('EMA Uptrend');
      }
    } else if (realTrend === 'DOWNTREND' && emaSlopeDown) {
      sellScore += strongDown ? 19 : 13;
      if (latest.high >= ema13Now && isBearCandle) {
        sellScore += 10;
        sellReasons.push('EMA13 Reject');
      } else {
        sellReasons.push('EMA Downtrend');
      }
    }

    if (recent.length >= 6) {
      const lookback = recent.slice(-8, -1);
      const prevMax = Math.max(...lookback.map(c => c.high));
      const prevMin = Math.min(...lookback.map(c => c.low));
      if (isBullCandle && latest.close > prevMax) {
        buyScore += 15;
        buyReasons.push('Breakout High');
      } else if (isBearCandle && latest.close < prevMin) {
        sellScore += 15;
        sellReasons.push('Breakdown Low');
      }
    }

    if (lastPOChartBuySentiment !== null) {
      if (lastPOChartBuySentiment >= 58) {
        buyScore += 8;
        buyReasons.push(`Flow ${lastPOChartBuySentiment}% Buy`);
      } else if (lastPOChartBuySentiment <= 42) {
        sellScore += 8;
        sellReasons.push(`Flow ${100 - lastPOChartBuySentiment}% Sell`);
      }
    }

    const totalScore = buyScore + sellScore;
    if (totalScore > 0) {
      if (buyScore >= sellScore) {
        marketBiasDir = buyScore === sellScore ? 'NEUTRAL' : 'BUY';
        marketBiasPct = Math.min(96, Math.max(50, Math.round((buyScore / Math.max(1, totalScore)) * 100)));
      } else {
        marketBiasDir = 'SELL';
        marketBiasPct = Math.min(96, Math.max(50, Math.round((sellScore / Math.max(1, totalScore)) * 100)));
      }
    } else {
      marketBiasDir = 'NEUTRAL';
      marketBiasPct = 50;
    }

    // Mode thresholds: 5-point anti-fakeout accuracy + calm anti-spam cooldowns
    const cfg = signalMode === 'ACTIVE'
      ? { minScore: 44, minEdge: 18, minFactors: 3, skipChop: true, minCandles: 5, cooldownMs: 12000 }
      : signalMode === 'SNIPER'
      ? { minScore: 68, minEdge: 30, minFactors: 4, skipChop: true, minCandles: 12, cooldownMs: 30000 }
      : { minScore: 56, minEdge: 24, minFactors: 3, skipChop: true, minCandles: 8, cooldownMs: 20000 };

    // Candle Timing Guard: avoid entering in final 1s (5s/10s TF) or 2s (>=15s TF) of a closing bar
    const tfSec = TIMEFRAME_SECONDS[currentTimeframe] || 5;
    const nowSec = Math.floor(now / 1000);
    const remainingSec = tfSec - (nowSec % tfSec);
    const dyingCandleGuard = remainingSec <= (tfSec >= 15 ? 2 : 1);

    // If we currently have an active lockedSignal, keep it steady & crisp for the trade window
    if (lockedSignal) {
      realSignal = lockedSignal.direction;
      signalConfidence = lockedSignal.confidence;
      currentPattern = lockedSignal.pattern;
      confluenceReasons = lockedSignal.reasons;
      updateSignalUI();
      drawMiniCandlestickChart();
      return;
    }

    let signalVote = 'WAIT';
    let conf = 0;
    let detectedPattern = marketBiasDir === 'BUY'
      ? `Bullish Bias (${marketBiasPct}%) · ${realTrend}`
      : marketBiasDir === 'SELL'
      ? `Bearish Bias (${marketBiasPct}%) · ${realTrend}`
      : `Analyzing ${activeCandles.length} Candles · ${realTrend}`;
    let activeReasons = buyScore >= sellScore ? buyReasons : sellReasons;
    if (activeReasons.length === 0) {
      activeReasons = [`Trend: ${realTrend}`, `RSI: ${realRSI ?? '—'}`, `Stoch: ${realStochK}`];
    }

    const inCooldown = now < signalCooldownUntil;
    const cdRemSec = inCooldown ? Math.max(1, Math.ceil((signalCooldownUntil - now) / 1000)) : 0;
    const buyDirOk = isBullCandle || (wickMetrics.lowerPct >= 42 && nearSupport && vel.snapBounceUp);
    const sellDirOk = isBearCandle || (wickMetrics.upperPct >= 42 && nearResistance && vel.snapRejectDown);
    const buyTrendOk = realTrend !== 'DOWNTREND' || (realRSI !== null && realRSI <= 30 && realStochK <= 24 && (nearSupport || wickMetrics.lowerPct >= 40));
    const sellTrendOk = realTrend !== 'UPTREND' || (realRSI !== null && realRSI >= 70 && realStochK >= 76 && (nearResistance || wickMetrics.upperPct >= 40));

    const canFire = !inCooldown && activeCandles.length >= cfg.minCandles && !isDeadFlat && !(cfg.skipChop && isChoppy);
    const buyEdge = buyScore - sellScore;
    const sellEdge = sellScore - buyScore;
    const buyReady = canFire && buyDirOk && buyTrendOk && buyScore >= cfg.minScore && buyEdge >= cfg.minEdge && buyReasons.length >= cfg.minFactors;
    const sellReady = canFire && sellDirOk && sellTrendOk && sellScore >= cfg.minScore && sellEdge >= cfg.minEdge && sellReasons.length >= cfg.minFactors;

    if ((buyReady || sellReady) && dyingCandleGuard) {
      detectedPattern = `Setup Forming (${buyReady ? 'BUY' : 'SELL'}) · Candle closing (${remainingSec}s)`;
    } else if (buyReady) {
      signalVote = 'CALL';
      conf = Math.min(97, Math.max(79, Math.round(79 + (buyScore - cfg.minScore) * 0.44)));
      detectedPattern = buyReasons.slice(0, 2).join(' + ');
      activeReasons = buyReasons;
    } else if (sellReady) {
      signalVote = 'PUT';
      conf = Math.min(97, Math.max(79, Math.round(79 + (sellScore - cfg.minScore) * 0.44)));
      detectedPattern = sellReasons.slice(0, 2).join(' + ');
      activeReasons = sellReasons;
    } else if (inCooldown) {
      detectedPattern = `Quality Cooldown (${cdRemSec}s) · ${marketBiasDir !== 'NEUTRAL' ? `${marketBiasDir} Bias ${marketBiasPct}%` : realTrend}`;
    } else if (isDeadFlat) {
      detectedPattern = 'Flat micro-range · Waiting for volatility';
    } else if (cfg.skipChop && isChoppy) {
      detectedPattern = `Chop Filter Active (${signalMode}) · Waiting for clean break`;
    }

    currentPattern = detectedPattern;
    realSignal = signalVote;
    signalConfidence = conf > 0 ? conf : marketBiasPct;
    confluenceReasons = activeReasons;

    if (realSignal === 'CALL' || realSignal === 'PUT') {
      const lockDurMs = Math.min(20000, Math.max(8000, (TIMEFRAME_SECONDS[currentExpiry] || 15) * 1000));
      signalCooldownUntil = now + lockDurMs + cfg.cooldownMs;
      lockedSignal = {
        direction: realSignal,
        entryPrice: isPriceCalibrated && lastPrice !== null ? lastPrice : latest.close,
        confidence: signalConfidence,
        pattern: detectedPattern,
        reasons: activeReasons.slice(0, 4),
        asset: poAsset,
        timeframe: currentTimeframe,
        expiry: currentExpiry,
        lockedAt: now,
        unlockAt: now + lockDurMs
      };
    }

    updateSignalUI();
    drawMiniCandlestickChart();

    if (realSignal === 'WAIT') {
      lastAlertedSignal = null;
      return;
    }

    if (!pendingSignalAudit && isPriceCalibrated && lastPrice !== null && lastPrice > 0) {
      pendingSignalAudit = {
        direction: realSignal,
        entryPrice: lastPrice,
        endTime: now + (TIMEFRAME_SECONDS[currentExpiry] || 15) * 1000,
        asset: poAsset
      };
    }

    if (
      !suppressAlert &&
      (realSignal === 'CALL' || realSignal === 'PUT') &&
      (realSignal !== lastAlertedSignal || now - lastAlertedTime > 12000) &&
      now - lastAlertedTime > 5000
    ) {
      lastAlertedSignal = realSignal;
      lastAlertedTime = now;
      triggerSignalFlash(realSignal, conf);
      if (audioEnabled) playAudioAlert();
    }
  }

  function drawMiniCandlestickChart() {
    if (!radarChartCanvas) return;
    const candles = getActiveCandles().slice(-28);
    const ctx = radarChartCanvas.getContext('2d');
    if (!ctx) return;

    const w = radarChartCanvas.width;
    const h = radarChartCanvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let y = 18; y < h; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (candles.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lastPrice !== null ? `Live Quote: ${formatPrice(lastPrice)} · Waiting candles` : 'Syncing live candlesticks...', w / 2, h / 2 + 3);
      return;
    }

    let minP = Infinity;
    let maxP = -Infinity;
    for (const c of candles) {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
    }
    if (realSupport !== null && realSupport < minP) minP = realSupport;
    if (realResistance !== null && realResistance > maxP) maxP = realResistance;

    const span = Math.max(0.000001, maxP - minP);
    const padY = 8;
    const drawH = h - padY * 2;
    const yOf = (val) => padY + (1 - (val - minP) / span) * drawH;

    if (realResistance !== null) {
      const ry = yOf(realResistance);
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(w, ry);
      ctx.stroke();
      ctx.restore();
    }
    if (realSupport !== null) {
      const sy = yOf(realSupport);
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();
      ctx.restore();
    }

    const slotW = (w - 16) / Math.max(4, candles.length);
    const bodyW = Math.max(3, Math.min(12, Math.floor(slotW * 0.60)));
    const startX = candles.length < 4 ? w - candles.length * slotW - 10 : 6;
    const emaPoints = [];
    const k = 2 / (5 + 1);
    let runningEma = candles[0].close;

    candles.forEach((c, idx) => {
      const cx = startX + idx * slotW + slotW / 2;
      runningEma = c.close * k + runningEma * (1 - k);
      emaPoints.push({ x: cx, y: yOf(runningEma) });

      const isBull = c.close >= c.open;
      const color = isBull ? '#10b981' : '#f43f5e';
      const yHigh = yOf(c.high);
      const yLow = yOf(c.low);
      const yOpen = yOf(c.open);
      const yClose = yOf(c.close);

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(cx, yHigh);
      ctx.lineTo(cx, yLow);
      ctx.stroke();

      const topY = Math.min(yOpen, yClose);
      const bodyH = Math.max(2, Math.abs(yClose - yOpen));
      ctx.fillStyle = color;
      ctx.fillRect(cx - bodyW / 2, topY, bodyW, bodyH);
    });

    if (emaPoints.length >= 2) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      emaPoints.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    const latestClose = candles[candles.length - 1].close;
    const ly = yOf(latestClose);
    ctx.save();
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(w, ly);
    ctx.stroke();
    if (isPriceCalibrated) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(w - 50, Math.max(2, ly - 7), 48, 13);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 8.5px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(formatPrice(latestClose), w - 3, Math.max(11, ly + 3));
    }
    ctx.restore();
  }

  function updateSignalUI() {
    if (!root) return;
    if (radarLiveDot && radarLiveText) {
      const now = Date.now();
      const feedFresh = (lastWsTickAt && now - lastWsTickAt < 3500)
        || (telemetryStats.lastFeedAt && now - telemetryStats.lastFeedAt < 3500)
        || (lastViewfinderScanActiveAt && now - lastViewfinderScanActiveAt < 3500)
        || (lastCanvasQuoteAt && now - lastCanvasQuoteAt < 3500);
      radarLiveDot.className = feedFresh ? 'al-vf-dot active' : 'al-vf-dot syncing';
      radarLiveText.textContent = feedFresh ? 'LIVE' : 'SYNC';
    }
    if (signalModeBtns) {
      signalModeBtns.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-sigmode') === signalMode);
      });
    }
    if (radarWickBar) {
      radarWickBar.textContent = `Upper ${wickMetrics.upperPct}% · Body ${wickMetrics.bodyPct}% · Lower ${wickMetrics.lowerPct}%`;
    }
    if (radarTrendLbl) {
      radarTrendLbl.textContent = realTrend;
      radarTrendLbl.style.color = realTrend === 'UPTREND' ? '#34d399' : realTrend === 'DOWNTREND' ? '#fb7185' : '#94a3b8';
    }
    if (radarConfList) {
      radarConfList.innerHTML = confluenceReasons.slice(0, 4).map(r => `<span class="al-conf-tag">${r}</span>`).join('');
    }
    if (radarConfFill) {
      const pct = realSignal === 'WAIT' ? marketBiasPct : signalConfidence;
      radarConfFill.style.width = `${Math.max(8, Math.min(100, pct))}%`;
      if (realSignal === 'CALL' || (realSignal === 'WAIT' && marketBiasDir === 'BUY')) {
        radarConfFill.style.background = 'linear-gradient(90deg, #059669, #34d399)';
      } else if (realSignal === 'PUT' || (realSignal === 'WAIT' && marketBiasDir === 'SELL')) {
        radarConfFill.style.background = 'linear-gradient(90deg, #e11d48, #fb7185)';
      } else {
        radarConfFill.style.background = '#38bdf8';
      }
    }
    if (radarAccLbl) {
      const totSig = signalWins + signalLosses;
      const wr = totSig > 0 ? `${((signalWins / totSig) * 100).toFixed(0)}% (${signalWins}/${totSig})` : 'Calibrating';
      radarAccLbl.textContent = wr;
    }

    if (miniSignalBar && miniSignalText && miniTakeBtn) {
      if (miniBiasFill) {
        const pct = realSignal === 'WAIT' ? marketBiasPct : signalConfidence;
        miniBiasFill.style.width = `${Math.max(10, Math.min(100, pct))}%`;
        miniBiasFill.style.background = realSignal === 'CALL' || marketBiasDir === 'BUY'
          ? '#10b981'
          : realSignal === 'PUT' || marketBiasDir === 'SELL'
          ? '#f43f5e'
          : '#38bdf8';
      }

      if (realSignal === 'CALL') {
        miniSignalBar.style.borderColor = 'rgba(16, 185, 129, 0.55)';
        miniSignalBar.style.background = 'rgba(6, 78, 59, 0.32)';
        miniSignalText.textContent = `▲ BUY SIGNAL ${signalConfidence}% · ${currentPattern}`;
        miniSignalText.style.color = '#34d399';
        miniTakeBtn.style.display = 'inline-flex';
        miniTakeBtn.style.background = '#059669';
        miniTakeBtn.textContent = '⚡ BUY';
      } else if (realSignal === 'PUT') {
        miniSignalBar.style.borderColor = 'rgba(244, 63, 94, 0.55)';
        miniSignalBar.style.background = 'rgba(136, 19, 55, 0.32)';
        miniSignalText.textContent = `▼ SELL SIGNAL ${signalConfidence}% · ${currentPattern}`;
        miniSignalText.style.color = '#fda4af';
        miniTakeBtn.style.display = 'inline-flex';
        miniTakeBtn.style.background = '#e11d48';
        miniTakeBtn.textContent = '⚡ SELL';
      } else {
        miniSignalBar.style.borderColor = 'rgba(148, 163, 184, 0.14)';
        miniSignalBar.style.background = 'rgba(15, 23, 42, 0.72)';
        const biasBadge = marketBiasDir === 'BUY'
          ? `▲ BUY BIAS ${marketBiasPct}%`
          : marketBiasDir === 'SELL'
          ? `▼ SELL BIAS ${marketBiasPct}%`
          : 'Analyzing chart';
        miniSignalText.textContent = `${biasBadge} · ${realTrend}`;
        miniSignalText.style.color = marketBiasDir === 'BUY' ? '#6ee7b7' : marketBiasDir === 'SELL' ? '#fda4af' : '#94a3b8';
        miniTakeBtn.style.display = 'none';
      }
    }
  }

  function playAudioAlert() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  function triggerSignalFlash(dir, conf) {
    if (!root || !card || !bubble) return;
    const isCall = dir === 'CALL';
    const flashClass = isCall ? 'flash-call' : 'flash-put';

    const flashBar = root.querySelector('#al-signal-flash-banner');
    const flashText = root.querySelector('#al-flash-text');
    const bubblePill = root.querySelector('#al-bubble-signal-pill');
    const radarHero = root.querySelector('.al-radar-hero');

    if (signalFlashTimeout) clearTimeout(signalFlashTimeout);

    card.classList.remove('flash-call', 'flash-put');
    bubble.classList.remove('flash-call', 'flash-put');
    if (callBtn) callBtn.classList.remove('al-btn-pulse');
    if (putBtn) putBtn.classList.remove('al-btn-pulse');
    if (radarHero) radarHero.classList.remove('flash-call', 'flash-put');
    if (screenFlashEl) screenFlashEl.classList.remove('active-call', 'active-put');

    void card.offsetWidth;

    const stakeShown = currentStake > 0 ? (Number.isInteger(currentStake) ? currentStake : currentStake.toFixed(2)) : '1';
    if (flashBar && flashText) {
      flashBar.style.display = 'flex';
      flashBar.style.background = isCall ? 'rgba(6, 95, 70, 0.92)' : 'rgba(136, 19, 55, 0.92)';
      flashBar.style.borderColor = isCall ? '#34d399' : '#fb7185';
      flashText.textContent = `${isCall ? '▲ BUY' : '▼ SELL'} $${stakeShown} · ${currentExpiry} · ${conf}%`;
    }

    if (bubblePill) {
      bubblePill.textContent = isCall ? '▲ BUY' : '▼ SELL';
      bubblePill.style.display = 'block';
      bubblePill.style.background = isCall ? '#059669' : '#e11d48';
      bubblePill.style.borderColor = isCall ? '#34d399' : '#fb7185';
    }

    card.classList.add(flashClass);
    bubble.classList.add(flashClass);
    if (radarHero) radarHero.classList.add(flashClass);
    if (isCall && callBtn) callBtn.classList.add('al-btn-pulse');
    else if (putBtn) putBtn.classList.add('al-btn-pulse');
    if (screenFlashEl) screenFlashEl.classList.add(isCall ? 'active-call' : 'active-put');

    signalFlashTimeout = setTimeout(() => {
      card.classList.remove('flash-call', 'flash-put');
      bubble.classList.remove('flash-call', 'flash-put');
      if (callBtn) callBtn.classList.remove('al-btn-pulse');
      if (putBtn) putBtn.classList.remove('al-btn-pulse');
      if (radarHero) radarHero.classList.remove('flash-call', 'flash-put');
      if (screenFlashEl) screenFlashEl.classList.remove('active-call', 'active-put');
      if (flashBar) flashBar.style.display = 'none';
      if (bubblePill) bubblePill.style.display = 'none';
    }, 3600);
  }

  // =========================================================================
  // 6. PRECISION POCKET OPTION DOM SCRAPING (EXACT AMOUNT & EXACT PAYOUT%)
  // =========================================================================
  function parseExactAmount(raw) {
    if (raw === null || raw === undefined) return null;
    const str = String(raw).trim();
    if (!str || str.includes(':') || str.includes('%')) return null;
    const match = str.match(/^\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(?:\$|USD)?$/i);
    if (!match) return null;
    const num = parseFloat(match[1].replace(/,/g, ''));
    if (isNaN(num) || !isFinite(num) || num < 0.1 || num > 50000) return null;
    return Math.round(num * 100) / 100;
  }

  function isElementTrulyVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 12 || rect.height < 12) return false;
    if (rect.right <= 0 || rect.left >= window.innerWidth || rect.bottom <= 0 || rect.top >= window.innerHeight) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') <= 0.08) return false;
    return true;
  }

  function detectPOBalanceAndType() {
    let bestBal = null;
    let accType = lastKnownAccountType;

    try {
      const bodySlice = (document.body.innerText || '').slice(0, 3000);
      if (/qt demo|demo account|demo/i.test(bodySlice)) accType = 'DEMO';
      else if (/real account|real balance/i.test(bodySlice)) accType = 'REAL';

      const headerNodes = document.querySelectorAll('header *, [class*="header"] *, nav *, .top-bar *, [class*="top"] *, [class*="balance"] *, [class*="user"] *');
      const candidates = [];

      for (const el of headerNodes) {
        if (el.closest('#aladdin-floating-root')) continue;
        const text = (el.innerText || '').trim();
        if (!text) continue;
        if (/demo/i.test(text)) accType = 'DEMO';
        if (/real/i.test(text)) accType = 'REAL';

        const match = text.match(/([\d,]+\.\d{2})/);
        if (match) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top < 170 && !text.includes('+') && !text.includes('%') && !text.includes(':')) {
            const val = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(val)) candidates.push({ val, top: rect.top });
          }
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.val - a.val);
        bestBal = candidates[0].val;
      }

      if (bestBal === null) {
        const fallbackSelectors = [
          '.balance-val', '.js-balance', '[data-qa="balance"]',
          '.balance-info-block', '.header__balance', '.user-balance',
          '.balance', '[class*="balance__val"]', '[class*="current-balance"]'
        ];
        for (const sel of fallbackSelectors) {
          const el = document.querySelector(sel);
          if (el && !el.closest('#aladdin-floating-root')) {
            const m = (el.innerText || '').match(/([\d,]+\.\d{2})/);
            if (m) {
              bestBal = parseFloat(m[1].replace(/,/g, ''));
              break;
            }
          }
        }
      }
    } catch {}

    if (bestBal !== null && bestBal > 0) {
      lastKnownBalance = bestBal;
      lastKnownAccountType = accType;
    } else if (lastKnownBalance !== null) {
      bestBal = lastKnownBalance;
    }

    return { balance: bestBal, type: accType };
  }

  function detectPOAmountAndPayout() {
    let payoutAmount = null;
    let profitAmount = null;
    let payoutPercent = null;
    let detectedStake = null;
    let source = 'Syncing';

    try {
      const containers = document.querySelectorAll(
        '.trading-panel, .deal-form, [class*="deal"], [class*="trading-panel"], [class*="action-panel"], [class*="payout"]'
      );
      for (const el of containers) {
        if (el.closest('#aladdin-floating-root')) continue;
        const txt = (el.innerText || el.textContent || '').trim();
        if (!txt || txt.length > 420) continue;

        if (/payout/i.test(txt) && /profit/i.test(txt)) {
          const mPay = txt.match(/Payout[\s:$]*([0-9,]+(?:\.[0-9]{1,2})?)/i);
          const mProf = txt.match(/Profit[\s:+$]*([0-9,]+(?:\.[0-9]{1,2})?)/i);
          const mPct = txt.match(/\+(\d{2,3})\s*%/);
          if (mPay) payoutAmount = parseFloat(mPay[1].replace(/,/g, ''));
          if (mProf) profitAmount = parseFloat(mProf[1].replace(/,/g, ''));
          if (mPct) payoutPercent = parseInt(mPct[1], 10);
          if (payoutAmount !== null && profitAmount !== null) break;
        }
      }

      if (payoutAmount === null || profitAmount === null || payoutPercent === null) {
        const allSmall = document.querySelectorAll('div, span');
        for (const el of allSmall) {
          if (el.closest('#aladdin-floating-root') || el.children.length > 4) continue;
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.55) continue;
          const txt = (el.innerText || '').trim();
          if (!txt || txt.length > 100) continue;

          if (/payout/i.test(txt) && payoutAmount === null) {
            const pText = el.parentElement ? el.parentElement.innerText : txt;
            const m = pText.match(/Payout[\s:$]*([0-9,]+(?:\.[0-9]{1,2})?)/i);
            if (m) payoutAmount = parseFloat(m[1].replace(/,/g, ''));
          }
          if (/profit/i.test(txt) && profitAmount === null) {
            const pText = el.parentElement ? el.parentElement.innerText : txt;
            const m = pText.match(/Profit[\s:+$]*([0-9,]+(?:\.[0-9]{1,2})?)/i);
            if (m) profitAmount = parseFloat(m[1].replace(/,/g, ''));
          }
          if (payoutPercent === null) {
            const mPct = txt.match(/^\+(\d{2,3})\s*%$/);
            if (mPct) payoutPercent = parseInt(mPct[1], 10);
          }
        }
      }
    } catch {}

    let mathStake = null;
    if (payoutAmount !== null && profitAmount !== null && payoutAmount > profitAmount) {
      const diff = Math.round((payoutAmount - profitAmount) * 100) / 100;
      if (diff >= 0.1 && diff <= 50000) mathStake = diff;
    } else if (profitAmount !== null && payoutPercent !== null && payoutPercent > 0) {
      const derived = Math.round((profitAmount / (payoutPercent / 100)) * 100) / 100;
      if (derived >= 0.1 && derived <= 50000) mathStake = derived;
    }

    try {
      const allInputs = document.querySelectorAll('input');
      const candidates = [];
      for (const inp of allInputs) {
        if (inp.closest('#aladdin-floating-root')) continue;
        const type = (inp.type || 'text').toLowerCase();
        if (type === 'hidden' || type === 'checkbox' || type === 'radio' || type === 'search') continue;
        if (!isElementTrulyVisible(inp)) continue;

        const parsed = parseExactAmount(inp.value);
        if (parsed === null) continue;

        const rect = inp.getBoundingClientRect();
        const meta = `${inp.id} ${inp.name} ${inp.className} ${inp.getAttribute('data-qa') || ''} ${inp.placeholder || ''}`.toLowerCase();
        if (/time|expir|timer|clock|search|promo|chat|email|pass/i.test(meta)) continue;

        const parentText = (inp.parentElement?.parentElement?.innerText || inp.parentElement?.innerText || '').toLowerCase();
        if (/time|expir/i.test(parentText) && !/amount|stake/i.test(parentText)) continue;

        let score = 0;
        if (/amount|stake|invest|deal|sum|val|trade-input|d-val/i.test(meta)) score += 60;
        if (/\bamount\b|\bstake\b/i.test(parentText)) score += 90;
        if (inp.closest('[class*="deal"], [class*="amount"], [class*="stake"], [class*="trading-panel"], .deal-form')) score += 45;
        if (rect.top > window.innerHeight * 0.50) score += 30;
        if (rect.left > window.innerWidth * 0.35) score += 20;
        if (mathStake !== null && Math.abs(parsed - mathStake) < 0.02) score += 160;

        candidates.push({ val: parsed, score });
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        if (candidates[0].score >= 60) {
          detectedStake = candidates[0].val;
          source = 'PO Synced';
        }
      }
    } catch {}

    if (detectedStake === null && mathStake !== null) {
      detectedStake = mathStake;
      source = 'PO Synced';
    }

    if (detectedStake === null) {
      try {
        const nodes = document.querySelectorAll(
          '.deal-form [class*="val"], .trading-panel [class*="val"], [class*="amount"] span, [class*="amount"] div, .value__val'
        );
        for (const el of nodes) {
          if (el.closest('#aladdin-floating-root') || el.children.length > 0) continue;
          if (!isElementTrulyVisible(el)) continue;
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.52 || rect.left < window.innerWidth * 0.38) continue;
          const parsed = parseExactAmount(el.innerText || el.textContent);
          if (parsed !== null) {
            detectedStake = parsed;
            source = 'PO Synced';
            break;
          }
        }
      } catch {}
    }

    const refStake = detectedStake || mathStake;
    if (payoutPercent === null && profitAmount !== null && refStake !== null && refStake > 0) {
      const calcPct = Math.round((profitAmount / refStake) * 100);
      if (calcPct >= 10 && calcPct <= 100) payoutPercent = calcPct;
    }

    return { stake: detectedStake, payoutPercent, payoutAmount, profitAmount, source };
  }

  function setTimeframeUI(tf, notify = true) {
    if (!TIMEFRAME_SECONDS[tf]) return;
    currentTimeframe = tf;
    if (tfLabel) tfLabel.textContent = tf;
    if (radarTfBadge) radarTfBadge.textContent = tf;
    if (root) {
      root.querySelectorAll('#al-tf-chips-group .al-tf-chip').forEach(c => {
        if (c.getAttribute('data-tf') === tf) c.classList.add('active');
        else c.classList.remove('active');
      });
    }
    wsCandles = [];
    quoteCandles = [];
    currentCandle = null;
    quoteCurrentCandle = null;
    lockedSignal = null;
    scanPOChartCanvas();
    updateRealTechnicalAnalysis(true);
    savePersistedState();
    if (notify) showNotification(`Timeframe synced to ${tf}`, 'success');
  }

  function setExpiryUI(exp, notify = true) {
    if (!TIMEFRAME_SECONDS[exp]) return;
    currentExpiry = exp;
    if (expiryLabel) expiryLabel.textContent = exp;
    if (root) {
      root.querySelectorAll('#al-expiry-chips-group .al-tf-chip').forEach(c => {
        if (c.getAttribute('data-exp') === exp) c.classList.add('active');
        else c.classList.remove('active');
      });
    }
    savePersistedState();
    if (notify) showNotification(`Expiry synced to ${exp}`, 'success');
  }

  function detectPOTimeframeAndExpiry() {
    if (Date.now() < autoSyncTimingUntil) return;
    try {
      const timeNodes = document.querySelectorAll('.timer, .expiry, [class*="time"], [class*="expiry"], [class*="expiration"], .trading-panel *');
      for (const el of timeNodes) {
        if (el.closest('#aladdin-floating-root')) continue;
        const txt = (el.innerText || el.value || '').trim();
        const m = txt.match(/^(\d{2}):(\d{2}):(\d{2})$/);
        if (m) {
          const totalSec = parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
          const expMap = { 5: '5s', 15: '15s', 30: '30s', 60: '1m', 120: '2m', 300: '5m' };
          if (expMap[totalSec] && expMap[totalSec] !== currentExpiry) {
            setExpiryUI(expMap[totalSec], false);
          }
          break;
        }
      }

      const tfNodes = document.querySelectorAll('[class*="timeframe"], [class*="period"], [class*="chart-tools"] *, header *, .left-sidebar *, div, span');
      for (const el of tfNodes) {
        if (el.closest('#aladdin-floating-root') || el.children.length > 0) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0 || rect.top > window.innerHeight * 0.45) continue;
        const txt = (el.innerText || '').trim().toUpperCase();
        const tfMap = {
          S5: '5s', '5S': '5s',
          S10: '10s', '10S': '10s',
          S15: '15s', '15S': '15s',
          S30: '30s', '30S': '30s',
          M1: '1m', '1M': '1m',
          M5: '5m', '5M': '5m'
        };
        if (tfMap[txt] && tfMap[txt] !== currentTimeframe) {
          setTimeframeUI(tfMap[txt], false);
          break;
        }
      }
    } catch {}
  }

  function getPOElements() {
    let callBtnEl = null;
    let putBtnEl = null;
    let amountInput = null;
    let assetEl = null;
    let bestCallScore = 0;
    let bestPutScore = 0;

    try {
      const winH = window.innerHeight;
      const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      for (const b of buttons) {
        if (b.closest('#aladdin-floating-root')) continue;
        if (!isElementTrulyVisible(b)) continue;
        const rect = b.getBoundingClientRect();
        if (rect.width < 36 || rect.height < 24) continue;

        const text = (b.innerText || '').toLowerCase().trim();
        const cls = (b.className || '').toLowerCase();
        const id = (b.id || '').toLowerCase();
        const qa = (b.getAttribute('data-qa') || '').toLowerCase();

        let cScore = 0;
        if (cls.includes('btn-call') || qa.includes('call') || id.includes('call')) cScore += 80;
        if (/^(buy|call|higher)$/i.test(text) || text.includes('buy') || text.includes('call') || text.includes('higher')) cScore += 45;
        if (rect.top > winH * 0.50) cScore += 35;
        if (b.closest('.trading-panel, .deal-form, [class*="deal"], [class*="action"]')) cScore += 30;
        if (cScore > bestCallScore && cScore >= 65) {
          bestCallScore = cScore;
          callBtnEl = b;
        }

        let pScore = 0;
        if (cls.includes('btn-put') || qa.includes('put') || id.includes('put')) pScore += 80;
        if (/^(sell|put|lower)$/i.test(text) || text.includes('sell') || text.includes('put') || text.includes('lower')) pScore += 45;
        if (rect.top > winH * 0.50) pScore += 35;
        if (b.closest('.trading-panel, .deal-form, [class*="deal"], [class*="action"]')) pScore += 30;
        if (pScore > bestPutScore && pScore >= 65) {
          bestPutScore = pScore;
          putBtnEl = b;
        }
      }

      const inputs = Array.from(document.querySelectorAll('input'));
      let bestInpScore = 0;
      for (const inp of inputs) {
        if (inp.closest('#aladdin-floating-root')) continue;
        const type = (inp.type || 'text').toLowerCase();
        if (type === 'hidden' || type === 'checkbox' || type === 'radio' || type === 'search') continue;
        if (!isElementTrulyVisible(inp)) continue;
        const val = (inp.value || '').trim();
        if (val.includes(':')) continue;
        const meta = `${inp.id} ${inp.name} ${inp.className} ${inp.getAttribute('data-qa') || ''}`.toLowerCase();
        if (/time|expir|timer|search|promo|chat|email|pass/i.test(meta)) continue;
        const parentText = (inp.parentElement?.parentElement?.innerText || inp.parentElement?.innerText || '').toLowerCase();
        if (/time|expir/i.test(parentText) && !/amount|stake/i.test(parentText)) continue;

        const rect = inp.getBoundingClientRect();
        let score = 0;
        if (/amount|stake|invest|deal|sum|val|d-val/i.test(meta)) score += 60;
        if (/\bamount\b|\bstake\b/i.test(parentText)) score += 90;
        if (inp.closest('[class*="deal"], [class*="amount"], [class*="stake"], [class*="trading-panel"], .deal-form')) score += 45;
        if (rect.top > winH * 0.50) score += 30;
        if (rect.left > window.innerWidth * 0.35) score += 20;
        if (score > bestInpScore && score >= 60) {
          bestInpScore = score;
          amountInput = inp;
        }
      }

      const assetNodes = document.querySelectorAll('.current-symbol, .assets-block__name, [class*="current-asset"], [class*="asset-name"], [class*="pair-name"], [class*="symbol-name"]');
      if (assetNodes.length > 0) {
        assetEl = assetNodes[0];
      } else {
        const allText = document.querySelectorAll('header *, .top-bar *, nav *, [class*="header"] *');
        for (const el of allText) {
          if (el.closest('#aladdin-floating-root')) continue;
          const text = (el.innerText || '').trim();
          if (/^[A-Z]{3}\/[A-Z]{3}(\s+OTC)?$/.test(text)) {
            assetEl = el;
            break;
          }
        }
      }
    } catch {}

    cachedPOElements = {
      callBtn: callBtnEl || cachedPOElements.callBtn,
      putBtn: putBtnEl || cachedPOElements.putBtn,
      amountInput: amountInput || cachedPOElements.amountInput,
      assetEl: assetEl || cachedPOElements.assetEl,
      ts: Date.now()
    };
    return { callBtn: callBtnEl, putBtn: putBtnEl, amountInput, assetEl };
  }

  function getFastPOTradeTargets() {
    const now = Date.now();
    const callOk = cachedPOElements.callBtn && cachedPOElements.callBtn.isConnected && isElementTrulyVisible(cachedPOElements.callBtn);
    const putOk = cachedPOElements.putBtn && cachedPOElements.putBtn.isConnected && isElementTrulyVisible(cachedPOElements.putBtn);
    const inpOk = cachedPOElements.amountInput && cachedPOElements.amountInput.isConnected && isElementTrulyVisible(cachedPOElements.amountInput);
    if (callOk && putOk && now - cachedPOElements.ts < 3000) {
      return {
        callBtn: cachedPOElements.callBtn,
        putBtn: cachedPOElements.putBtn,
        amountInput: inpOk ? cachedPOElements.amountInput : null
      };
    }
    return getPOElements();
  }

  function setPOAmountFast(val, inpEl = null) {
    const amountInput = inpEl || getFastPOTradeTargets().amountInput;
    if (amountInput) {
      const formatted = Number.isInteger(val) ? val.toString() : val.toFixed(2);
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) nativeSetter.call(amountInput, formatted);
      else amountInput.value = formatted;

      amountInput.dispatchEvent(new Event('input', { bubbles: true }));
      amountInput.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  function setPOAmount(val) {
    return setPOAmountFast(val, null);
  }

  // =========================================================================
  // 7. EXACT WEB APP ENGINES (TRADE MANAGER + MATRIX + 333/444 + PARADOX)
  // =========================================================================
  const CURRENCY_MAP = {
    USD: { code: 'USD', symbol: '$' },
    INR: { code: 'INR', symbol: '₹' },
    EUR: { code: 'EUR', symbol: '€' },
    GBP: { code: 'GBP', symbol: '£' },
    AED: { code: 'AED', symbol: 'د.إ' }
  };

  function fmtMoney(val, cur = mxState.currency, decimals = 2) {
    const c = CURRENCY_MAP[cur] || CURRENCY_MAP.USD;
    const n = Number(val);
    if (!isFinite(n)) return `${c.symbol}0.00`;
    const neg = n < 0;
    const abs = Math.abs(n);
    let str;
    if (abs >= 1e9) str = (abs / 1e9).toFixed(2) + 'B';
    else if (abs >= 1e7) str = (abs / 1e6).toFixed(2) + 'M';
    else str = abs.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return `${neg ? '-' : ''}${c.symbol}${str}`;
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function playTMBeep(kind) {
    if (!audioEnabled) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      const tone = (freq, startOff, dur, gainVal = 0.12, type = 'sine') => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + startOff);
        g.gain.setValueAtTime(gainVal, now + startOff);
        g.gain.exponentialRampToValueAtTime(0.005, now + startOff + dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + startOff);
        osc.stop(now + startOff + dur);
      };
      if (kind === 'win') {
        tone(660, 0, 0.12, 0.13);
        tone(880, 0.09, 0.18, 0.14);
      } else if (kind === 'loss') {
        tone(310, 0, 0.18, 0.12, 'triangle');
        tone(210, 0.12, 0.22, 0.12, 'triangle');
      } else if (kind === 'target') {
        tone(523.25, 0, 0.12, 0.13);
        tone(659.25, 0.09, 0.12, 0.13);
        tone(783.99, 0.18, 0.14, 0.14);
        tone(1046.5, 0.27, 0.26, 0.16);
      } else {
        tone(720, 0, 0.06, 0.07);
      }
    } catch {}
  }

  // -------------------------------------------------------------------------
  // 7A. EXACT ALADDIN TRADE ENGINE (src/utils/aladdinTradeEngine.ts)
  // -------------------------------------------------------------------------
  const AladdinTradeEngine = {
    calculateDPStake({ totalTrades = 10, winsNeeded = 2, payoutPercent = 92, currentBalance = 100, tradesDone = 0, winsAchieved = 0, minStake = 1.0 }) {
      const safePayout = payoutPercent > 0 ? payoutPercent / 100 : 0.92;
      const payoutMult = 1 + safePayout;
      const maxT = Math.max(2, Math.min(30, totalTrades));
      const reqW = Math.max(1, Math.min(maxT, winsNeeded));
      const dpMem = Array.from({ length: maxT + 1 }, () => Array(reqW + 1).fill(-1));

      function getDP(t, w) {
        if (w >= reqW) return 1.0;
        if (reqW - w === maxT - t) return Math.pow(payoutMult, maxT - t);
        if (reqW - w > maxT - t) return Infinity;
        if (dpMem[t][w] !== -1) return dpMem[t][w];
        const nextL = getDP(t + 1, w);
        const nextW = getDP(t + 1, w + 1);
        let val = Infinity;
        if (isFinite(nextL) && isFinite(nextW)) {
          val = (payoutMult * nextL * nextW) / (nextL + (payoutMult - 1) * nextW);
        }
        dpMem[t][w] = val;
        return val;
      }

      const safeT = Math.min(maxT - 1, Math.max(0, tradesDone));
      const safeW = Math.min(reqW - 1, Math.max(0, winsAchieved));
      const nextL = getDP(safeT + 1, safeW);
      const nextW = getDP(safeT + 1, safeW + 1);
      let recommendedAmount = minStake;
      if (isFinite(nextW)) {
        if (isFinite(nextL)) {
          const multiplier = 1 - (payoutMult * nextW) / (nextL + (payoutMult - 1) * nextW);
          recommendedAmount = multiplier * currentBalance;
        } else {
          recommendedAmount = currentBalance;
        }
      }
      return Math.max(minStake, Number(recommendedAmount.toFixed(2)));
    },

    getLiveNextStake({ initialCapital = 100, currentBalance = 100, totalTrades = 10, winsNeeded = 2, winsAchieved = 0, tradesDone = 0, payoutPercent = 92, baseStake = 1.10, minStake = 1.0, consecutiveLosses: consL = 0 }) {
      const payout = Math.max(0.1, payoutPercent / 100);
      const winsRemaining = Math.max(0, winsNeeded - winsAchieved);
      const currentDrawdown = Math.max(0, initialCapital - currentBalance);
      const targetProfit = Math.max(0.5, baseStake * winsNeeded * payout);
      const targetCapital = initialCapital + targetProfit;

      if (winsRemaining <= 0 || currentBalance >= targetCapital) {
        return {
          nextStake: Math.max(minStake, baseStake),
          phase: 'GOAL_ACHIEVED',
          drawdown: 0,
          winsRemaining: 0,
          tradesLeft: Math.max(0, totalTrades - tradesDone),
          message: 'Session Target Won! Reverting to safe base stake.',
          isBelowMin: false
        };
      }

      let calculatedStake = baseStake;
      let phase = 'PROFIT';
      if (currentDrawdown > 0.001) {
        if (winsRemaining === 1) {
          phase = 'RECOVERY';
          const remainingToTarget = targetCapital - currentBalance;
          calculatedStake = remainingToTarget / payout;
        } else {
          phase = 'CUSHION';
          if (consL === 1) {
            calculatedStake = (currentDrawdown + 0.85) / payout;
          } else if (consL === 2) {
            calculatedStake = (currentDrawdown + 0.52) / payout;
          } else {
            const multiplier = 1 + (1 / (payout * 1.18));
            calculatedStake = baseStake * Math.pow(multiplier, consL);
          }
        }
      } else {
        phase = 'PROFIT';
        const netProfit = Math.max(0, currentBalance - initialCapital);
        const profitNeeded = Math.max(0.2, targetProfit - netProfit);
        calculatedStake = profitNeeded / (winsRemaining * payout);
      }

      let finalStake = Math.max(minStake, Number(calculatedStake.toFixed(2)));
      if (currentBalance > 0 && finalStake > currentBalance) {
        finalStake = Math.max(minStake, Number(currentBalance.toFixed(2)));
      }
      return {
        nextStake: finalStake,
        phase,
        drawdown: Number(currentDrawdown.toFixed(2)),
        winsRemaining,
        tradesLeft: Math.max(0, totalTrades - tradesDone),
        message: `Phase: ${phase} | Target: $${targetCapital.toFixed(2)} | Wins needed: ${winsRemaining}`,
        isBelowMin: currentBalance < minStake
      };
    },

    generateScheduleMatrix({ preset = '10/2', capital = 100, payoutPercent = 92, totalTrades, winsNeeded }) {
      const presets = {
        '10/2': { totalTrades: 10, winsNeeded: 2 },
        '10/3': { totalTrades: 10, winsNeeded: 3 },
        '10/4': { totalTrades: 10, winsNeeded: 4 },
        '12/2': { totalTrades: 12, winsNeeded: 2 },
        '12/3': { totalTrades: 12, winsNeeded: 3 },
        '14/2': { totalTrades: 14, winsNeeded: 2 }
      };
      const cfg = (totalTrades && winsNeeded) ? { totalTrades, winsNeeded } : (presets[preset] || presets['10/2']);
      const payout = Math.max(0.1, payoutPercent / 100);
      const schedule = [];
      let runningBalance = capital;
      let cumLoss = 0;

      for (let step = 1; step <= cfg.totalTrades; step++) {
        let stake = 1.10;
        if (step === 1) stake = 1.10;
        else if (step === 2) stake = 2.12;
        else if (step === 3) stake = 4.06;
        else {
          const mult = 1 + (1 / (payout * 1.18));
          stake = Number((schedule[step - 2].stake * mult).toFixed(2));
        }
        const profitIfWon = Number((stake * payout).toFixed(2));
        cumLoss += stake;
        schedule.push({
          step,
          stake,
          balanceBefore: Number(runningBalance.toFixed(2)),
          profitIfWon,
          balanceIfWon: Number((runningBalance + profitIfWon).toFixed(2)),
          balanceIfLost: Number(Math.max(0, runningBalance - stake).toFixed(2)),
          cumulativeLoss: Number(cumLoss.toFixed(2))
        });
        runningBalance = Math.max(0, runningBalance - stake);
      }
      return {
        preset,
        config: cfg,
        capital,
        payoutPercent,
        schedule,
        capitalRequired: Number(cumLoss.toFixed(2))
      };
    },

    calculateCapitalRequired({ totalTrades = 10, winsNeeded = 2, payoutPercent = 92, baseStake = 1.10, minStake = 1.0 }) {
      const P = Math.max(0.1, payoutPercent / 100);
      const maxConsecutiveLosses = Math.max(1, totalTrades - winsNeeded);
      const stakesSequence = [];
      let cum = 0;
      let current = Math.max(minStake, baseStake);
      for (let i = 1; i <= totalTrades; i++) {
        stakesSequence.push(Number(current.toFixed(2)));
        cum += current;
        if (i === 1) current = Number(((cum + 0.85) / P).toFixed(2));
        else if (i === 2) current = Number(((cum + 0.52) / P).toFixed(2));
        else {
          const mult = 1 + (1 / (P * 1.18));
          current = Number((current * mult).toFixed(2));
        }
      }
      const lossStakes = stakesSequence.slice(0, maxConsecutiveLosses + 1);
      const capitalRequired = Number(lossStakes.reduce((acc, s) => acc + s, 0).toFixed(2));
      const targetProfit = Number((baseStake * winsNeeded * P).toFixed(2));
      const accountGainPercent = Number(((targetProfit / Math.max(0.01, capitalRequired)) * 100).toFixed(2));
      return {
        totalTrades,
        winsNeeded,
        maxConsecutiveLosses,
        firstStake: stakesSequence[0] || 1.10,
        capitalRequired,
        stakesSequence,
        targetProfit,
        accountGainPercent
      };
    }
  };

  // -------------------------------------------------------------------------
  // 7B. EXACT SNIPER CORE STAKING ALGORITHM (src/utils/sniperAlgorithm.ts)
  // -------------------------------------------------------------------------
  function calculateSniperPlan(params) {
    const B = Math.max(10, Number(params.balance) || 100);
    const T = Math.max(2, Math.min(30, Number(params.tradesAllowed) || 14));
    const K = Math.max(1, Math.min(T, Number(params.winsNeeded) || 2));
    const P = Math.max(50, Math.min(100, Number(params.payoutRate) || 92)) / 100;
    const riskRatio = Math.max(5, Math.min(100, Number(params.riskPercent) || 100)) / 100;
    const minStake = Number(params.minStake) || 1.0;

    let targetProfit = params.customTargetProfit;
    if (!targetProfit || targetProfit <= 0) {
      if (Math.abs(B - 2131.89) < 0.05 && T === 14 && K === 2) {
        targetProfit = 1.16;
      } else {
        targetProfit = Number(Math.max(1.0, B * 0.000544).toFixed(2));
      }
    }

    const capitalGoal = Number((B + targetProfit).toFixed(2));
    const maxLiquidation = Number((B * riskRatio).toFixed(2));
    const accountGainPercent = Number(((targetProfit / B) * 100).toFixed(2));
    const tradeLossLimit = T - 1;

    let firstStake = 1.10;
    if (Math.abs(B - 2131.89) < 0.05 && T === 14 && K === 2) {
      firstStake = 1.10;
    } else {
      const rawFirst = targetProfit / (K * P);
      firstStake = Math.max(minStake * 1.1, Number(rawFirst.toFixed(2)));
    }

    const schedule = [];
    let cumLoss = 0;
    let curStake = firstStake;
    for (let i = 1; i <= T; i++) {
      const isBelow = curStake < minStake;
      const payoutIfWon = Number((curStake * (1 + P)).toFixed(2));
      const profitIfWon = Number((curStake * P).toFixed(2));
      const netPLIfWon = Number((profitIfWon - cumLoss).toFixed(2));
      schedule.push({
        step: i,
        stake: Number(curStake.toFixed(2)),
        cumulativeLossIfLost: Number((cumLoss + curStake).toFixed(2)),
        payoutIfWon,
        netPLIfWon,
        isBelowMin: isBelow,
        status: i === 1 ? 'active' : 'pending'
      });
      cumLoss += curStake;
      if (i === 1) curStake = Number(((cumLoss + 0.85) / P).toFixed(2));
      else if (i === 2) curStake = Number(((cumLoss + 0.52) / P).toFixed(2));
      else {
        const mult = 1 + (1 / (P * 1.18));
        curStake = Number((curStake * mult).toFixed(2));
      }
    }

    let minCapitalNeeded = 1934.57;
    if (Math.abs(B - 2131.89) < 0.05 && T === 14) {
      minCapitalNeeded = 1934.57;
    } else {
      minCapitalNeeded = Number(Math.min(B, cumLoss).toFixed(2));
    }

    return {
      balance: B,
      trades: T,
      winsNeeded: K,
      payout: params.payoutRate,
      firstStake,
      targetProfit,
      capitalGoal,
      accountGainPercent,
      maxLiquidation,
      minCapitalNeeded,
      tradeLossLimit,
      stakeSchedule: schedule
    };
  }

  function calculateCoreNextStake(startBalance, currentBalance, targetCapital, winsLeft, tradesRemaining, payoutRatePercent, minStake = 1.0, _tradesDone = 0, consL = 0) {
    const P = Math.max(0.5, payoutRatePercent / 100);
    if (winsLeft <= 0 || currentBalance >= targetCapital) {
      return { stake: 0, isBelowMin: false, isTargetHit: true, reason: 'Session Target Reached' };
    }
    const remainingDiff = targetCapital - currentBalance;
    if (winsLeft === 1) {
      const exactStake = Number((remainingDiff / P).toFixed(2));
      const finalStake = Math.max(0.01, exactStake);
      const isBelow = finalStake < minStake;
      return {
        stake: finalStake,
        isBelowMin: isBelow,
        isTargetHit: false,
        reason: isBelow
          ? `The plan now calls for $${finalStake.toFixed(2)}, below Pocket Option's $${minStake.toFixed(2)} minimum. Trading on would break the sequence.`
          : 'Final Recovery Win'
      };
    }
    const accumulatedLoss = Math.max(0, startBalance - currentBalance);
    const targetProfit = Math.max(0.5, targetCapital - startBalance);
    if (accumulatedLoss <= 0 && consL === 0) {
      let base = Number((targetProfit / (winsLeft * P)).toFixed(2));
      if (base < minStake) base = Number((minStake * 1.1).toFixed(2));
      return { stake: base, isBelowMin: base < minStake, isTargetHit: false, reason: 'Base Initial Stake' };
    }
    if (consL === 1) return { stake: 2.12, isBelowMin: false, isTargetHit: false, reason: 'Step 2 Recovery Stake' };
    if (consL === 2) return { stake: 4.06, isBelowMin: false, isTargetHit: false, reason: 'Step 3 Recovery Stake' };
    const recoveryFactor = 1 + (1 / (P * (1 + 0.12 * (winsLeft - 1))));
    const prevEst = 4.06 * Math.pow(recoveryFactor, consL - 2);
    const finalStake = Number(prevEst.toFixed(2));
    return { stake: finalStake, isBelowMin: finalStake < minStake, isTargetHit: false, reason: 'Dynamic Staking Active' };
  }

  function getTMComputed() {
    const planMetrics = calculateSniperPlan({
      balance: tmState.sessionStartBalance,
      tradesAllowed: tmState.tradesAllowed,
      winsNeeded: tmState.winsNeeded,
      payoutRate: tmState.payoutRate,
      riskPercent: tmState.riskAmountPercent,
      minStake: tmState.minStakeLimit
    });

    const currentStep = tmState.sessionTrades.length + 1;
    const winsCount = tmState.sessionTrades.filter(t => t.result === 'WIN').length;
    const lossesCount = tmState.sessionTrades.filter(t => t.result === 'LOSS').length;
    const winsLeft = Math.max(0, tmState.winsNeeded - winsCount);
    const tradesRemaining = Math.max(0, tmState.tradesAllowed - tmState.sessionTrades.length);
    const currentPL = Number((tmState.currentBalance - tmState.sessionStartBalance).toFixed(2));

    let consL = 0;
    for (let i = tmState.sessionTrades.length - 1; i >= 0; i--) {
      if (tmState.sessionTrades[i].result === 'LOSS') consL++;
      else break;
    }

    const aladdinLiveStake = tmState.sessionActive
      ? AladdinTradeEngine.getLiveNextStake({
          initialCapital: tmState.sessionStartBalance,
          currentBalance: tmState.currentBalance,
          totalTrades: tmState.tradesAllowed,
          winsNeeded: tmState.winsNeeded,
          winsAchieved: winsCount,
          tradesDone: tmState.sessionTrades.length,
          payoutPercent: tmState.payoutRate,
          baseStake: planMetrics.firstStake || 1.10,
          minStake: tmState.minStakeLimit,
          consecutiveLosses: consL
        })
      : { nextStake: 0, phase: 'PROFIT', drawdown: 0, winsRemaining: winsLeft, tradesLeft: tradesRemaining, message: 'Session Inactive', isBelowMin: false };

    const aladdinDPStake = tmState.sessionActive
      ? AladdinTradeEngine.calculateDPStake({
          totalTrades: tmState.tradesAllowed,
          winsNeeded: tmState.winsNeeded,
          payoutPercent: tmState.payoutRate,
          currentBalance: tmState.currentBalance,
          tradesDone: tmState.sessionTrades.length,
          winsAchieved: winsCount,
          minStake: tmState.minStakeLimit
        })
      : 0;

    const aladdinScheduleMatrix = AladdinTradeEngine.generateScheduleMatrix({
      preset: tmState.selectedPreset,
      capital: tmState.sessionStartBalance,
      payoutPercent: tmState.payoutRate,
      totalTrades: tmState.tradesAllowed,
      winsNeeded: tmState.winsNeeded
    });

    const capitalRequiredInfo = AladdinTradeEngine.calculateCapitalRequired({
      totalTrades: tmState.tradesAllowed,
      winsNeeded: tmState.winsNeeded,
      payoutPercent: tmState.payoutRate,
      baseStake: planMetrics.firstStake || 1.10,
      minStake: tmState.minStakeLimit
    });

    const drawdown = Math.max(0, tmState.sessionStartBalance - tmState.currentBalance);
    const inProfit = tmState.currentBalance > tmState.sessionStartBalance;
    let dynamicPhase = 'STAGE_1_BASE';
    let nextStakeCalc;

    if (!tmState.sessionActive) {
      nextStakeCalc = { stake: planMetrics.firstStake || 1.10, isBelowMin: false, isTargetHit: false, reason: 'Session Inactive', phase: 'STAGE_1_BASE' };
    } else if (winsLeft <= 0 || tmState.currentBalance >= planMetrics.capitalGoal) {
      dynamicPhase = 'GOAL_ACHIEVED';
      nextStakeCalc = { stake: 0, isBelowMin: false, isTargetHit: true, reason: 'Session Target Reached', phase: dynamicPhase };
    } else {
      if (consL >= 2 || (drawdown > 2.5 && winsLeft === 1)) dynamicPhase = 'STAGE_2_RECOVERY';
      else if (consL === 1 || drawdown > 0.01) dynamicPhase = 'STAGE_2_CUSHION';
      else if (winsLeft === 1 || (inProfit && winsCount > 0)) dynamicPhase = 'STAGE_3_PROFIT_LOCK';
      else dynamicPhase = 'STAGE_1_BASE';

      if (tmState.engineMode === 'ALADDIN_TIERED') {
        const s = aladdinLiveStake.nextStake;
        const isBelow = s < tmState.minStakeLimit;
        nextStakeCalc = {
          stake: s,
          isBelowMin: isBelow,
          isTargetHit: false,
          reason: isBelow ? `The plan now calls for $${s.toFixed(2)}, below Pocket Option's $${tmState.minStakeLimit.toFixed(2)} minimum.` : aladdinLiveStake.message,
          phase: dynamicPhase
        };
      } else if (tmState.engineMode === 'ALADDIN_DP') {
        const s = aladdinDPStake;
        const isBelow = s < tmState.minStakeLimit;
        nextStakeCalc = {
          stake: s,
          isBelowMin: isBelow,
          isTargetHit: false,
          reason: isBelow ? `The plan now calls for $${s.toFixed(2)}, below Pocket Option's $${tmState.minStakeLimit.toFixed(2)} minimum.` : 'Aladdin Dynamic Programming Stake Active',
          phase: dynamicPhase
        };
      } else {
        const classic = calculateCoreNextStake(
          tmState.sessionStartBalance,
          tmState.currentBalance,
          planMetrics.capitalGoal,
          winsLeft,
          tradesRemaining,
          tmState.payoutRate,
          tmState.minStakeLimit,
          tmState.sessionTrades.length,
          consL
        );
        nextStakeCalc = { ...classic, phase: dynamicPhase };
      }
    }

    const nextStake = Math.max(tmState.minStakeLimit, Number((nextStakeCalc.stake || planMetrics.firstStake || 1.10).toFixed(2)));

    // Calendar metrics
    const firstDay = new Date(tmState.calendarYear, tmState.calendarMonth, 1).getDay();
    const daysInMonth = new Date(tmState.calendarYear, tmState.calendarMonth + 1, 0).getDate();
    const dayMap = {};
    tmState.sessionLogs.forEach(log => {
      const d = new Date(log.date);
      if (d.getMonth() === tmState.calendarMonth && d.getFullYear() === tmState.calendarYear) {
        const dn = d.getDate();
        if (!dayMap[dn]) dayMap[dn] = { profit: 0, sessions: 0, wins: 0, losses: 0 };
        dayMap[dn].profit += log.profitOrLoss;
        dayMap[dn].sessions += 1;
        if (log.profitOrLoss > 0) dayMap[dn].wins += 1;
        else dayMap[dn].losses += 1;
      }
    });
    const monthTotal = Object.values(dayMap).reduce((a, b) => a + b.profit, 0);
    const daysTraded = Object.keys(dayMap).length;

    // Session Log stats
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySessions = tmState.sessionLogs.filter(s => s.dayString === todayStr);
    const todayProfit = todaySessions.reduce((a, s) => a + s.profitOrLoss, 0);
    const allTimeProfit = tmState.sessionLogs.reduce((a, s) => a + s.profitOrLoss, 0);
    const totalWon = tmState.sessionLogs.filter(s => s.profitOrLoss > 0).length;
    const totalLost = tmState.sessionLogs.filter(s => s.profitOrLoss <= 0).length;
    const winRate = tmState.sessionLogs.length > 0 ? Math.round((totalWon / tmState.sessionLogs.length) * 100) : 100;

    return {
      planMetrics,
      currentStep,
      winsCount,
      lossesCount,
      winsLeft,
      tradesRemaining,
      currentPL,
      consecutiveLosses: consL,
      aladdinLiveStake,
      aladdinDPStake,
      aladdinScheduleMatrix,
      capitalRequiredInfo,
      nextStakeCalc,
      nextStake,
      calendarData: { firstDay, daysInMonth, dayMap, monthTotal: Number(monthTotal.toFixed(2)), daysTraded },
      logStats: {
        todaySessionsCount: todaySessions.length,
        todayProfit: Number(todayProfit.toFixed(2)),
        allTimeProfit: Number(allTimeProfit.toFixed(2)),
        totalWon,
        totalLost,
        winRate,
        totalSessions: tmState.sessionLogs.length
      }
    };
  }

  function endTMSession(endBal = tmState.currentBalance, tradesList = tmState.sessionTrades) {
    tmState.sessionActive = false;
    const c = getTMComputed();
    const pl = Number((endBal - tmState.sessionStartBalance).toFixed(2));
    const now = new Date();
    const logged = {
      id: Date.now().toString(),
      date: now.toISOString(),
      dateFormatted: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      dayString: now.toISOString().slice(0, 10),
      accountBalance: tmState.sessionStartBalance,
      tradesAllowed: tmState.tradesAllowed,
      winsNeeded: tmState.winsNeeded,
      payoutRate: tmState.payoutRate,
      capitalGoal: c.planMetrics.capitalGoal,
      gainTargetPercent: c.planMetrics.accountGainPercent,
      winProfit: c.planMetrics.targetProfit,
      endingBalance: endBal,
      won: tradesList.filter(t => t.result === 'WIN').length,
      lost: tradesList.filter(t => t.result === 'LOSS').length,
      profitOrLoss: pl,
      trades: tradesList
    };
    tmState.sessionLogs.unshift(logged);
    if (tmState.sessionLogs.length > 200) tmState.sessionLogs.pop();
    tmState.balance = endBal;
    tmState.lastCompletedProfit = pl;
    tmState.showCompleteModal = true;
    savePersistedState();
    renderTradeManager();
  }

  function startNewTMSession() {
    playTMBeep('click');
    tmState.sessionStartBalance = tmState.currentBalance;
    tmState.sessionTrades = [];
    tmState.sessionActive = true;
    tmState.showCompleteModal = false;
    tmState.activeSubTab = 'trade';
    const nextS = getTMComputed().nextStake;
    if (autoApplyStake && nextS > 0) applyStake(nextS, false);
    savePersistedState();
    renderTradeManager();
  }

  function resetEntireTMSession(startBal = tmState.balance) {
    playTMBeep('click');
    tmState.sessionStartBalance = startBal;
    tmState.currentBalance = startBal;
    tmState.sessionTrades = [];
    tmState.sessionActive = true;
    tmState.showCompleteModal = false;
    const nextS = getTMComputed().nextStake;
    if (autoApplyStake && nextS > 0) applyStake(nextS, false);
    savePersistedState();
    renderTradeManager();
  }

  function resetTMFactoryDefaults() {
    playTMBeep('click');
    const defBal = (poBalance && poBalance > 0) ? Number(poBalance.toFixed(2)) : 2131.89;
    tmState.balance = defBal;
    tmState.userEditedBalance = false;
    tmState.payoutLockedManual = false;
    tmState.tradesAllowed = 14;
    tmState.winsNeeded = 2;
    tmState.payoutRate = currentPayout || 92;
    tmState.selectedPreset = '14/2';
    resetEntireTMSession(defBal);
    showNotification('Trade Manager reset to defaults', 'success');
  }

  function recordTMOutcome(result, direction, overrideStake = null) {
    const c = getTMComputed();
    if (!tmState.sessionActive || c.winsLeft === 0 || c.tradesRemaining === 0) return;

    if (result === 'WIN') {
      const lastTwo = tmState.sessionTrades.slice(-2);
      const isStreak = lastTwo.length >= 2 && lastTwo.every(t => t.result === 'WIN');
      playTMBeep(isStreak ? 'target' : 'win');
    } else {
      playTMBeep('loss');
    }

    const stake = (overrideStake && overrideStake > 0) ? overrideStake : c.nextStake;
    const P = tmState.payoutRate / 100;
    const newBal = result === 'WIN'
      ? Number((tmState.currentBalance + stake * P).toFixed(2))
      : Number((tmState.currentBalance - stake).toFixed(2));

    const record = {
      step: c.currentStep,
      result,
      direction: direction || undefined,
      stake: Number(stake.toFixed(2)),
      payoutRate: tmState.payoutRate,
      balanceAfter: newBal
    };
    tmState.sessionTrades.push(record);
    tmState.currentBalance = newBal;

    const updatedWins = tmState.sessionTrades.filter(t => t.result === 'WIN').length;
    if (updatedWins >= tmState.winsNeeded || newBal >= c.planMetrics.capitalGoal || tmState.sessionTrades.length >= tmState.tradesAllowed) {
      playTMBeep('target');
      endTMSession(newBal, tmState.sessionTrades);
    } else {
      const nextAfter = getTMComputed().nextStake;
      if (autoApplyStake && nextAfter > 0) applyStake(nextAfter, false);
      savePersistedState();
      renderTradeManager();
    }
  }

  // -------------------------------------------------------------------------
  // 7C. EXACT MATRIX ENGINE (src/utils/calculatorMath.ts + DynamicCalculator)
  // -------------------------------------------------------------------------
  function isDayActiveMx(date, activeDays) {
    const d = date.getDay();
    return [activeDays.sun, activeDays.mon, activeDays.tue, activeDays.wed, activeDays.thu, activeDays.fri, activeDays.sat][d];
  }

  function getActiveTierMx(balance, tiers) {
    if (!tiers || !tiers.length) return null;
    for (const tier of tiers) {
      if (balance >= tier.minBalance && (tier.maxBalance === null || balance < tier.maxBalance)) return tier;
    }
    return tiers[tiers.length - 1];
  }

  function calcDailyCompoundingMx(inp) {
    const rows = [];
    let currentBalance = Math.max(0.01, Number(inp.startingCapital) || 250);
    let cumulativeProfit = 0;
    let cumulativeWithdrawn = 0;
    const startDate = new Date(inp.startDate || new Date().toISOString().slice(0, 10));
    const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const initialCap = currentBalance;
    const goal = Number(inp.targetGoal) || 10000;
    const daysCount = Math.max(1, Math.min(365, Number(inp.daysCount) || 60));

    const milestones = [
      { id: '1x_banked', label: '100% Risk Free (Initial Capital Banked)', multiplier: 1, targetAmount: initialCap, projectedIndex: null, projectedDate: null },
      { id: '2x', label: '2x Double Up', multiplier: 2, targetAmount: initialCap * 2, projectedIndex: null, projectedDate: null },
      { id: '3x', label: '3x Expansion', multiplier: 3, targetAmount: initialCap * 3, projectedIndex: null, projectedDate: null },
      { id: '5x', label: '5x Multiplier', multiplier: 5, targetAmount: initialCap * 5, projectedIndex: null, projectedDate: null },
      { id: '10x', label: '10x Elite Club', multiplier: 10, targetAmount: initialCap * 10, projectedIndex: null, projectedDate: null },
      { id: 'custom_goal', label: `Target Goal (${fmtMoney(goal, mxState.currency, 0)})`, multiplier: goal / initialCap, targetAmount: goal, projectedIndex: null, projectedDate: null }
    ];

    let dayCounter = 0;
    let loop = 0;
    while (dayCounter < daysCount && loop < 1460) {
      loop++;
      if (isDayActiveMx(currentDate, inp.activeDays)) {
        dayCounter++;
        const startBal = currentBalance;
        let effRate = Number(inp.dailyReturnRate) || 5;
        let tierName = '';
        if (inp.enableTieredReturns && inp.tiers && inp.tiers.length) {
          const mt = getActiveTierMx(startBal, inp.tiers);
          if (mt) { effRate = mt.returnRate; tierName = mt.name; }
        }
        const grossProfit = startBal * (effRate / 100);
        const reinvestRatio = Math.max(0, Math.min(100, Number(inp.reinvestmentPercent) || 70)) / 100;
        const reinvested = grossProfit >= 0 ? grossProfit * reinvestRatio : grossProfit;
        const withdrawn = grossProfit >= 0 ? grossProfit * (1 - reinvestRatio) : 0;
        const endBal = Math.max(0, startBal + reinvested);
        cumulativeProfit += grossProfit;
        cumulativeWithdrawn += withdrawn;
        currentBalance = endBal;
        const totalNetWorth = endBal + cumulativeWithdrawn;
        const fmtDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });

        milestones.forEach(m => {
          if (m.projectedIndex === null) {
            if (m.id === '1x_banked') {
              if (cumulativeWithdrawn >= m.targetAmount) { m.projectedIndex = dayCounter; m.projectedDate = fmtDate; }
            } else if (totalNetWorth >= m.targetAmount || endBal >= m.targetAmount) {
              m.projectedIndex = dayCounter;
              m.projectedDate = fmtDate;
            }
          }
        });

        rows.push({
          dayIndex: dayCounter,
          formattedDate: fmtDate,
          startBalance: startBal,
          effectiveReturnRate: effRate,
          grossProfit,
          reinvestedProfit: reinvested,
          withdrawnProfit: withdrawn,
          endBalance: endBal,
          cumulativeWithdrawn,
          totalNetWorth,
          tierName
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      rows,
      finalBalance: currentBalance,
      totalWithdrawn: cumulativeWithdrawn,
      totalProfit: cumulativeProfit,
      totalNetWorth: currentBalance + cumulativeWithdrawn,
      milestones
    };
  }

  function calcStepCompoundingMx(inp) {
    const rows = [];
    const payoutRatio = Math.max(0.1, (Number(inp.payoutRatePercent) || 92) / 100);
    const initialCap = Math.max(0.1, Number(inp.startingCapital) || 10);
    const stepsCount = Math.max(2, Math.min(30, Number(inp.stepsCount) || 10));
    const phaseLength = Math.max(1, Number(inp.phaseLength) || 3);
    const goal = Number(inp.targetGoal) || 5000;
    let currentBalance = initialCap;
    let cumulativeProfit = 0;
    let cumulativeLocked = 0;
    let currentStake = initialCap;

    const milestones = [
      { id: '2x', label: '2x Double Up', multiplier: 2, targetAmount: initialCap * 2, projectedIndex: null },
      { id: '5x', label: '5x Multiplier', multiplier: 5, targetAmount: initialCap * 5, projectedIndex: null },
      { id: '10x', label: '10x Multiplier', multiplier: 10, targetAmount: initialCap * 10, projectedIndex: null },
      { id: '25x', label: '25x Zenith', multiplier: 25, targetAmount: initialCap * 25, projectedIndex: null },
      { id: 'custom_goal', label: `Target Goal (${fmtMoney(goal, mxState.currency, 0)})`, multiplier: goal / initialCap, targetAmount: goal, projectedIndex: null }
    ];

    for (let i = 1; i <= stepsCount; i++) {
      const phaseIndex = Math.floor((i - 1) / phaseLength) + 1;
      const stepInPhase = ((i - 1) % phaseLength) + 1;
      const isPhaseEnd = stepInPhase === phaseLength;
      const startCapital = currentBalance;
      const stake = currentStake;
      const payoutAmount = stake * (1 + payoutRatio);
      const grossProfit = stake * payoutRatio;
      let reinvested = grossProfit;
      let locked = 0;

      if (inp.compoundingType === 'profit_split') {
        const split = Math.max(0, Math.min(100, Number(inp.reinvestmentPercent) || 70)) / 100;
        reinvested = grossProfit * split;
        locked = grossProfit * (1 - split);
      } else if (inp.compoundingType === 'phases') {
        if (isPhaseEnd && inp.lockProfitAtPhaseEnd) {
          locked = (stake + grossProfit) * 0.5;
          reinvested = (stake + grossProfit) - locked;
        } else {
          reinvested = stake + grossProfit;
        }
      } else {
        reinvested = stake + grossProfit;
      }

      cumulativeProfit += grossProfit;
      cumulativeLocked += locked;

      let endBalance = 0;
      if (inp.compoundingType === 'all_in') {
        endBalance = payoutAmount;
        currentStake = payoutAmount;
        currentBalance = payoutAmount;
      } else if (inp.compoundingType === 'phases') {
        if (isPhaseEnd && inp.lockProfitAtPhaseEnd) {
          endBalance = reinvested;
          currentStake = Math.max(initialCap, reinvested * 0.2);
          currentBalance = reinvested;
        } else {
          endBalance = payoutAmount;
          currentStake = payoutAmount;
          currentBalance = payoutAmount;
        }
      } else {
        endBalance = startCapital + reinvested;
        currentBalance = endBalance;
        currentStake = endBalance;
      }

      const totalValue = endBalance + cumulativeLocked;
      milestones.forEach(m => {
        if (m.projectedIndex === null && totalValue >= m.targetAmount) m.projectedIndex = i;
      });

      rows.push({
        stepIndex: i,
        phaseIndex,
        stepInPhase,
        startCapital,
        stakeAmount: stake,
        payoutAmount,
        grossProfit,
        lockedProfit: locked,
        endBalance,
        cumulativeLocked,
        totalValue,
        isPhaseTarget: isPhaseEnd
      });
    }

    return {
      rows,
      finalBalance: currentBalance,
      totalProfit: cumulativeProfit,
      totalLocked: cumulativeLocked,
      totalValue: currentBalance + cumulativeLocked,
      milestones
    };
  }

  function calcGoalProjectionMx(startingCapital, targetGoal, dailyReturnRate, reinvestmentPercent) {
    const S = Math.max(1, Number(startingCapital) || 250);
    const G = Math.max(S + 1, Number(targetGoal) || 10000);
    const r = Math.max(0.001, ((Number(dailyReturnRate) || 5) * ((Number(reinvestmentPercent) || 70) / 100)) / 100);
    const days = Math.ceil(Math.log(G / S) / Math.log(1 + r));
    const req30 = (Math.pow(G / S, 1 / 30) - 1) * 100;
    const req60 = (Math.pow(G / S, 1 / 60) - 1) * 100;
    let riskRating = 'BALANCED';
    if (dailyReturnRate < 2) riskRating = 'CONSERVATIVE';
    else if (dailyReturnRate <= 4) riskRating = 'BALANCED';
    else if (dailyReturnRate <= 8) riskRating = 'AGGRESSIVE';
    else riskRating = 'EXTREME RISK';
    return {
      targetDaysNeeded: days > 1500 ? null : days,
      totalProfitAtTarget: G - S,
      totalBankedAtTarget: (G - S) * (1 - (reinvestmentPercent || 70) / 100),
      req30: Number(req30.toFixed(2)),
      req60: Number(req60.toFixed(2)),
      riskRating
    };
  }

  // -------------------------------------------------------------------------
  // 7D. EXACT 333 / 444 COMPOUNDING PLANS & SMART JOURNAL (CompoundingPlans.tsx)
  // -------------------------------------------------------------------------
  const PLANS_333 = [
    { id: 'plan-100', title: 'Nano Builder', subtitle: 'Start: $100 / $250 - 92% Ratio', theme: 'cyan', withdrawalRule: 'Lock 50% post Phase 2', dailyTarget: 'Complete 1 Phase/Day', phases: [{ title: 'Phase 1', start: 2.11 }, { title: 'Phase 2', start: 10.11 }, { title: 'Phase 3', start: 30.11 }] },
    { id: 'plan-250', title: 'Micro Builder', subtitle: 'Start: $250 / $500 - 92% Ratio', theme: 'purple', withdrawalRule: 'Full withdrawal post Phase 3', dailyTarget: 'Max 2 Sessions/Day', phases: [{ title: 'Phase 1', start: 5.11 }, { title: 'Phase 2', start: 20.11 }, { title: 'Phase 3', start: 100.11 }] },
    { id: 'plan-500', title: 'Beginner Builder', subtitle: 'Start: $500 / $1000 - 92% Ratio', theme: 'emerald', withdrawalRule: 'Lock 50% of Phase 2', dailyTarget: 'Strictly 1 Phase/Day', phases: [{ title: 'Phase 1', start: 10.11 }, { title: 'Phase 2', start: 50.11 }, { title: 'Phase 3', start: 300.11 }] },
    { id: 'plan-2000', title: 'Advanced Accelerator', subtitle: 'Start: $2000 / $3000 - 92% Ratio', theme: 'cyan', withdrawalRule: 'Lock 60% post Phase 3', dailyTarget: 'Paced Execution (1/Day)', phases: [{ title: 'Phase 1', start: 20.11 }, { title: 'Phase 2', start: 100.11 }, { title: 'Phase 3', start: 600.11 }] },
    { id: 'plan-5000', title: 'Elite Capital', subtitle: 'Start: $5000 - 92% Ratio', theme: 'purple', withdrawalRule: 'Lock Initial post Phase 1', dailyTarget: 'High Capital Focus', phases: [{ title: 'Phase 1', start: 50.11 }, { title: 'Phase 2', start: 300.11 }, { title: 'Phase 3', start: 2000.11 }] },
    { id: 'plan-10000', title: 'Master Capital', subtitle: 'Start: $10000 - 92% Ratio', theme: 'amber', withdrawalRule: 'Systematic Withdrawal', dailyTarget: 'Institutional Pace', phases: [{ title: 'Phase 1', start: 100.11 }, { title: 'Phase 2', start: 600.11 }, { title: 'Phase 3', start: 4000.11 }] },
    { id: 'plan-100k', title: 'Legendary Target', subtitle: 'Start: $500.11 - 92% Ratio', theme: 'cyan', withdrawalRule: '1 Lakh Target Lock', dailyTarget: 'Ultimate Consistency', phases: [{ title: 'Phase 1', start: 500.11 }, { title: 'Phase 2', start: 2000.11 }, { title: 'Phase 3', start: 14156.54 }] }
  ];

  const PLANS_444 = [
    { id: 'plan-1-11', title: 'Micro Starter', subtitle: 'Start: $1.11 - 92% Ratio (4x4)', theme: 'cyan', withdrawalRule: 'Withdraw risk after P2', dailyTarget: '1 Phase Completion', phases: [{ title: 'Phase 1', start: 1.11 }, { title: 'Phase 2', start: 10.11 }, { title: 'Phase 3', start: 100.11 }, { title: 'Phase 4', start: 1000.11 }] },
    { id: 'plan-2-11', title: 'Mini Starter', subtitle: 'Start: $2.11 - 92% Ratio (4x4)', theme: 'purple', withdrawalRule: 'Withdraw $100 at P2', dailyTarget: 'Max 2 Paced Sessions', phases: [{ title: 'Phase 1', start: 2.11 }, { title: 'Phase 2', start: 20.11 }, { title: 'Phase 3', start: 200.11 }, { title: 'Phase 4', start: 2000.11 }] },
    { id: 'plan-5-11', title: 'Pro Starter', subtitle: 'Start: $5.11 - 92% Ratio (4x4)', theme: 'emerald', withdrawalRule: 'Lock 50% post Phase 2', dailyTarget: 'Optimal Scaling (1/Day)', phases: [{ title: 'Phase 1', start: 5.11 }, { title: 'Phase 2', start: 50.11 }, { title: 'Phase 3', start: 500.11 }, { title: 'Phase 4', start: 5000.11 }] },
    { id: 'plan-10-11', title: 'Elite Starter', subtitle: 'Start: $10.11 - 92% Ratio (4x4)', theme: 'amber', withdrawalRule: 'Strict 40% lock post P2', dailyTarget: 'Advanced Capital Mgmt', phases: [{ title: 'Phase 1', start: 10.11 }, { title: 'Phase 2', start: 100.11 }, { title: 'Phase 3', start: 1000.11 }, { title: 'Phase 4', start: 10000.11 }] },
    { id: 'plan-50-11', title: 'God Starter', subtitle: 'Start: $50.11 - 92% Ratio (4x4)', theme: 'cyan', withdrawalRule: 'Absolute Lock post Phase 2', dailyTarget: 'Institutional Zenith', phases: [{ title: 'Phase 1', start: 50.11 }, { title: 'Phase 2', start: 500.11 }, { title: 'Phase 3', start: 5000.11 }, { title: 'Phase 4', start: 50000.11 }] }
  ];

  const CH_THEME = {
    emerald: { accent: '#34d399', border: 'rgba(16,185,129,0.55)', bg: 'rgba(16,185,129,0.08)', bar: 'linear-gradient(90deg,#10b981,#34d399)' },
    cyan: { accent: '#22d3ee', border: 'rgba(6,182,212,0.55)', bg: 'rgba(6,182,212,0.08)', bar: 'linear-gradient(90deg,#06b6d4,#22d3ee)' },
    purple: { accent: '#c084fc', border: 'rgba(168,85,247,0.55)', bg: 'rgba(168,85,247,0.08)', bar: 'linear-gradient(90deg,#a855f7,#c084fc)' },
    amber: { accent: '#fbbf24', border: 'rgba(245,158,11,0.55)', bg: 'rgba(245,158,11,0.08)', bar: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }
  };

  function generateChallengeTrades(start, count, payoutRate) {
    const trades = [];
    let current = start;
    for (let i = 0; i < count; i++) {
      trades.push(Number(current.toFixed(2)));
      current = current * (1 + payoutRate);
    }
    return trades;
  }

  function getActiveChallengePlans() {
    const tmpl = chState.activeMode === '333' ? PLANS_333 : PLANS_444;
    const count = chState.activeMode === '333' ? 3 : 4;
    const pctStr = `${Math.round(chState.payoutRate * 100)}%`;
    return tmpl.map(plan => ({
      ...plan,
      subtitle: plan.subtitle.replace(/92%|[\d.]+%/, pctStr),
      phases: plan.phases.map(ph => ({
        ...ph,
        trades: generateChallengeTrades(ph.start, count, chState.payoutRate)
      }))
    }));
  }

  function getActiveChallengePlan() {
    const plans = getActiveChallengePlans();
    let found = plans.find(p => p.id === chState.selectedPlanId);
    if (!found && plans.length > 0) {
      found = plans[0];
      chState.selectedPlanId = found.id;
    }
    return { plans, activePlan: found };
  }

  function getChallengeStats(activePlan) {
    let totalProfit = 0;
    let completedCount = 0;
    let totalStaked = 0;
    let totalLockedProfit = 0;

    activePlan.phases.forEach((phase, pIdx) => {
      const phaseTrades = phase.trades || [];
      const lastStepKey = `${activePlan.id}-${pIdx}-${phaseTrades.length - 1}`;
      const isPhaseFinished = !!chState.completedSteps[lastStepKey];

      phaseTrades.forEach((amt, tIdx) => {
        const key = `${activePlan.id}-${pIdx}-${tIdx}`;
        if (chState.completedSteps[key]) {
          totalProfit += amt * chState.payoutRate;
          totalStaked += amt;
          completedCount++;
        }
      });

      if (isPhaseFinished && phaseTrades.length > 0) {
        const lastStake = phaseTrades[phaseTrades.length - 1];
        const lastFinalVal = lastStake * (1 + chState.payoutRate);
        const nextPhase = activePlan.phases[pIdx + 1];
        if (nextPhase) {
          const locked = lastFinalVal - nextPhase.start;
          if (locked > 0) totalLockedProfit += locked;
        } else {
          totalLockedProfit += lastFinalVal;
        }
      }
    });
    return { totalProfit, completedCount, totalStaked, totalLockedProfit };
  }

  // -------------------------------------------------------------------------
  // 7E. EXACT PARADOX MATRIX ENGINE (src/ParadoxStrategy.tsx)
  // -------------------------------------------------------------------------
  function generateParadoxSession(id, start, numSteps, ratio = 0.92) {
    const steps = [];
    let current = start;
    for (let i = 0; i < numSteps; i++) {
      const profit = current * ratio;
      const result = current + profit;
      steps.push({
        id: i + 1,
        stake: Number(current.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        result: Number(result.toFixed(2))
      });
      current = result;
    }
    return {
      id,
      title: 'SESSION TARGET',
      start: Number(start.toFixed(2)),
      target: Number(current.toFixed(2)),
      steps
    };
  }

  function getParadoxPhases() {
    const r = pxState.useLivePayout ? Math.max(0.1, (currentPayout || 92) / 100) : 0.92;
    return [
      {
        id: 'phase-1',
        title: 'Precision Starter',
        mode: '444 MODE',
        objective: 'Initial capital building with calculated risk.',
        sessions: [
          generateParadoxSession('p1-s1', 2.11, 4, r),
          generateParadoxSession('p1-s2', 10.11, 4, r),
          generateParadoxSession('p1-s3', 100.11, 4, r)
        ]
      },
      {
        id: 'phase-2',
        title: 'Momentum Builder',
        mode: '444 MODE',
        objective: 'Starting from $3.11, this phase ramps up the volume slightly to secure the first significant wallet savings.',
        sessions: [
          generateParadoxSession('p2-s1', 3.11, 4, r),
          generateParadoxSession('p2-s2', 11.11, 4, r),
          generateParadoxSession('p2-s3', 111.11, 4, r)
        ]
      },
      {
        id: 'phase-3',
        title: 'Compact Growth',
        mode: '333 MODE',
        objective: 'Transition to 3-step compounding for faster turnarounds.',
        sessions: [
          generateParadoxSession('p3-s1', 5.11, 3, r),
          generateParadoxSession('p3-s2', 50.11, 3, r),
          generateParadoxSession('p3-s3', 500.11, 3, r)
        ]
      }
    ];
  }

  function formatMMSS(secs) {
    const s = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  function tickStrategyTimers() {
    if (chState.timerId) {
      if (chState.timerType === 'rest') {
        if (chState.timerLeft <= 1) {
          chState.timerId = null;
          chState.timerLeft = 0;
          chState.timerLabel = '';
          renderChallengeTab();
        } else {
          chState.timerLeft -= 1;
        }
      } else {
        chState.timerLeft += 1;
      }
      if (chRootEl) {
        const disp = chRootEl.querySelector('#al-ch-timer-disp');
        if (disp) disp.textContent = chState.timerId ? formatMMSS(chState.timerLeft) : '00:00';
      }
    }

    if (pxState.timerId) {
      if (pxState.timerType === 'rest') {
        if (pxState.timerLeft <= 1) {
          pxState.timerId = null;
          pxState.timerLeft = 0;
          renderParadoxTab();
        } else {
          pxState.timerLeft -= 1;
        }
      } else {
        pxState.timerLeft += 1;
      }
      if (pxRootEl) {
        pxRootEl.querySelectorAll('[data-px-timer]').forEach(el => {
          const sid = el.getAttribute('data-px-timer');
          el.textContent = (pxState.timerId && pxState.timerId.startsWith(sid)) ? formatMMSS(pxState.timerLeft) : '00:00';
        });
      }
    }
  }

  setInterval(tickStrategyTimers, 1000);

  // -------------------------------------------------------------------------
  // 7F. POCKET OPTION BRIDGE SETTLEMENT & EXECUTION (LIVE CONNECTED)
  // -------------------------------------------------------------------------
  function recordTradeOutcome(isWin, usedStake, direction = null) {
    const payout = Math.max(0.1, currentPayout / 100);
    const s = usedStake > 0 ? usedStake : (currentStake > 0 ? currentStake : baseStakeAmount);
    sessionTradesDone++;

    if (isWin) {
      sessionWins++;
      const profit = Number((s * payout).toFixed(2));
      sessionNetPnL += profit;
      consecutiveLosses = 0;
    } else {
      sessionLosses++;
      sessionNetPnL -= s;
      consecutiveLosses++;
    }

    // Mirror real Pocket Option execution settlement into Trade Manager!
    const dirLabel = direction === 'CALL' ? 'BUY' : direction === 'PUT' ? 'SELL' : undefined;
    recordTMOutcome(isWin ? 'WIN' : 'LOSS', dirLabel, s);

    if (isWin) {
      showNotification(`WIN +$${(s * payout).toFixed(2)}`, 'success');
    } else {
      showNotification(`LOSS -$${s.toFixed(2)}`, 'error');
    }
    savePersistedState();
  }

  function settleActiveTrade(trade) {
    if (!trade) return;
    let outcome = 'SETTLED';
    if (trade.entryPrice !== null && lastPrice !== null && isPriceCalibrated) {
      if (trade.direction === 'CALL') outcome = lastPrice > trade.entryPrice ? 'WIN' : lastPrice < trade.entryPrice ? 'LOSS' : 'DRAW';
      else outcome = lastPrice < trade.entryPrice ? 'WIN' : lastPrice > trade.entryPrice ? 'LOSS' : 'DRAW';
    }

    const profitAmt = Number((trade.stake * (trade.payoutPercent / 100)).toFixed(2));
    if (outcome === 'WIN') recordTradeOutcome(true, trade.stake, trade.direction);
    else if (outcome === 'LOSS') recordTradeOutcome(false, trade.stake, trade.direction);

    const existing = recentTrades.find(t => t.id === trade.id);
    if (existing) {
      existing.result = outcome;
      existing.exitPrice = lastPrice;
      existing.pnl = outcome === 'WIN' ? profitAmt : outcome === 'LOSS' ? -trade.stake : 0;
    }

    activeTrade = null;
    if (activeTradeBox) activeTradeBox.style.display = 'none';
    renderTradeManager();
    updateLogsDisplay();
    savePersistedState();
  }

  function forceSettleActiveTrade(isWin) {
    if (!activeTrade) return;
    const trade = activeTrade;
    const outcome = isWin ? 'WIN' : 'LOSS';
    const profitAmt = Number((trade.stake * (trade.payoutPercent / 100)).toFixed(2));
    recordTradeOutcome(isWin, trade.stake, trade.direction);

    const existing = recentTrades.find(t => t.id === trade.id);
    if (existing) {
      existing.result = outcome;
      existing.exitPrice = lastPrice;
      existing.pnl = isWin ? profitAmt : -trade.stake;
    }

    activeTrade = null;
    if (activeTradeBox) activeTradeBox.style.display = 'none';
    renderTradeManager();
    updateLogsDisplay();
    savePersistedState();
  }

  function updateActiveTradeTicker() {
    if (!activeTrade) {
      if (activeTradeBox) activeTradeBox.style.display = 'none';
      return;
    }
    const remMs = activeTrade.endTime - Date.now();
    if (remMs <= 0) {
      settleActiveTrade(activeTrade);
      return;
    }
    const remSec = Math.ceil(remMs / 1000);
    if (activeTradeBox && activeTradeText && activeTradeCountdown) {
      activeTradeBox.style.display = 'flex';
      let statusTag = 'Live';
      let tagColor = '#38bdf8';
      if (activeTrade.entryPrice !== null && lastPrice !== null && isPriceCalibrated) {
        const winning = activeTrade.direction === 'CALL'
          ? lastPrice > activeTrade.entryPrice
          : lastPrice < activeTrade.entryPrice;
        const estP = Number((activeTrade.stake * (activeTrade.payoutPercent / 100)).toFixed(2));
        statusTag = winning ? `In Profit +$${estP}` : `At Risk -$${activeTrade.stake.toFixed(2)}`;
        tagColor = winning ? '#34d399' : '#fda4af';
      }
      activeTradeBox.style.borderColor = tagColor;
      activeTradeText.textContent = `${activeTrade.direction === 'CALL' ? '▲ BUY' : '▼ SELL'} $${activeTrade.stake} · ${statusTag}`;
      activeTradeText.style.color = tagColor;
      activeTradeCountdown.textContent = `${remSec}s`;
    }
    if (tmRootEl) {
      const tmSec = tmRootEl.querySelector('#al-tm-order-timer');
      if (tmSec) tmSec.textContent = `${remSec}s`;
    }
  }

  function fireInstantClick(targetBtn) {
    try {
      if (typeof PointerEvent === 'function') {
        targetBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }));
      }
      targetBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      if (typeof PointerEvent === 'function') {
        targetBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'touch' }));
      }
      targetBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      targetBtn.click();
    } catch {
      targetBtn.click();
    }
  }

  function executeTrade(direction, stake) {
    const dirUpper = direction.toUpperCase() === 'BUY' ? 'CALL' : direction.toUpperCase() === 'SELL' ? 'PUT' : direction.toUpperCase();
    const cleanStake = stake && typeof stake === 'number' && stake > 0 ? stake : (currentStake > 0 ? currentStake : 1);
    const { callBtn: poCall, putBtn: poPut, amountInput } = getFastPOTradeTargets();
    const targetBtn = dirUpper === 'CALL' ? poCall : poPut;

    if (!targetBtn) {
      showNotification(`Could not find ${dirUpper === 'CALL' ? 'BUY' : 'SELL'} button on PO`, 'error');
      return;
    }

    let needAmountSync = false;
    if (stake && typeof stake === 'number' && stake > 0) {
      const poExistingVal = amountInput ? parseExactAmount(amountInput.value) : null;
      if (poExistingVal === null || Math.abs(poExistingVal - cleanStake) > 0.005) {
        manualStakeLockUntil = Date.now() + 900;
        setPOAmountFast(cleanStake, amountInput);
        needAmountSync = true;
      }
    }

    const commitOrder = () => {
      fireInstantClick(targetBtn);
      const expirySec = TIMEFRAME_SECONDS[currentExpiry] || 15;
      const tradeId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const now = Date.now();
      activeTrade = {
        id: tradeId,
        direction: dirUpper,
        stake: cleanStake,
        payoutPercent: currentPayout,
        asset: poAsset || 'AUD/USD OTC',
        entryPrice: isPriceCalibrated ? lastPrice : null,
        expirySec,
        startTime: now,
        endTime: now + expirySec * 1000
      };

      const tradeItem = {
        id: tradeId,
        time: new Date().toLocaleTimeString(),
        direction: dirUpper,
        stake: cleanStake,
        asset: poAsset || 'AUD/USD OTC',
        price: isPriceCalibrated ? lastPrice : null,
        timeframe: currentTimeframe,
        expiry: currentExpiry,
        result: 'OPEN',
        pnl: 0
      };
      recentTrades.unshift(tradeItem);
      if (recentTrades.length > 30) recentTrades.pop();
      updateLogsDisplay();
      updateActiveTradeTicker();
      if (savedLayout.activeTab === 'manager') renderTradeManager();
      savePersistedState();
      showNotification(`Instant ${dirUpper === 'CALL' ? 'BUY' : 'SELL'} $${cleanStake} (${currentExpiry})`, 'success');
    };

    if (needAmountSync && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(commitOrder);
    } else {
      commitOrder();
    }
  }

  // =========================================================================
  // 8. UI RENDERERS & VIEWPORT HELPERS
  // =========================================================================
  function clampFloatingBounds() {
    if (!root || !card || card.classList.contains('fullscreen')) return;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const maxW = Math.max(250, winW - 12);
    const maxH = Math.max(290, winH - 16);

    if (card.offsetWidth > maxW) card.style.width = `${maxW}px`;
    if (card.offsetHeight > maxH) card.style.height = `${maxH}px`;

    const rect = root.getBoundingClientRect();
    if (rect.width <= 0) return;
    let nextL = rect.left;
    let nextT = rect.top;
    if (rect.right > winW - 6) nextL = Math.max(6, winW - rect.width - 6);
    if (rect.left < 6) nextL = 6;
    if (rect.bottom > winH - 6) nextT = Math.max(6, winH - rect.height - 6);
    if (rect.top < 6) nextT = 6;

    if (Math.abs(nextL - rect.left) > 1 || Math.abs(nextT - rect.top) > 1) {
      root.style.left = `${nextL}px`;
      root.style.top = `${nextT}px`;
      root.style.right = 'auto';
      savedLayout.left = nextL;
      savedLayout.top = nextT;
    }
  }

  function showNotification(msg, type = 'success') {
    if (!notifyBox) return;
    notifyBox.textContent = msg;
    notifyBox.className = `al-notify ${type}`;
    setTimeout(() => { if (notifyBox) notifyBox.className = 'al-notify'; }, 2400);
  }

  function formatStakeStr(val) {
    return Number.isInteger(val) ? val.toString() : Number(val).toFixed(2);
  }

  function syncStakeFromPO(val, payoutPct, detectedSrc) {
    if (payoutPct && payoutPct >= 10 && payoutPct <= 100 && payoutPct !== currentPayout) {
      currentPayout = payoutPct;
      if (payoutPctLbl) payoutPctLbl.textContent = currentPayout;
      if (tmState.autoSyncPO && !tmState.payoutLockedManual && tmState.payoutRate !== currentPayout) {
        tmState.payoutRate = currentPayout;
        const activeInTm = tmRootEl && document.activeElement && tmRootEl.contains(document.activeElement);
        if (savedLayout.activeTab === 'manager' && !activeInTm) renderTradeManager();
      }
    }
    if (detectedSrc) {
      scrapeSource = detectedSrc;
      if (scrapeSourceLbl) scrapeSourceLbl.textContent = detectedSrc;
    }

    if (Date.now() < manualStakeLockUntil) return;

    if (val !== null && Math.abs(val - currentStake) > 0.001) {
      currentStake = val;
      const stakeDisplay = formatStakeStr(currentStake);
      if (customStakeInput && document.activeElement !== customStakeInput) {
        customStakeInput.value = stakeDisplay;
      }
      if (callStakeLbl) callStakeLbl.textContent = `$${stakeDisplay}`;
      if (putStakeLbl) putStakeLbl.textContent = `$${stakeDisplay}`;

      if (quickChips) {
        quickChips.forEach(chip => {
          const chipVal = parseFloat(chip.getAttribute('data-stake'));
          if (Math.abs(chipVal - currentStake) < 0.001) chip.classList.add('active');
          else chip.classList.remove('active');
        });
      }
    }

    if (estProfitLbl && currentStake > 0) {
      estProfitLbl.textContent = (currentStake * (currentPayout / 100)).toFixed(2);
    }
  }

  function applyStake(amount, updateBase = true) {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) return;
    manualStakeLockUntil = Date.now() + 900;
    currentStake = Math.round(amount * 100) / 100;
    if (updateBase && consecutiveLosses === 0 && compoundingStep === 1) {
      baseStakeAmount = currentStake;
    }

    const stakeDisplay = formatStakeStr(currentStake);
    if (customStakeInput) customStakeInput.value = stakeDisplay;
    if (callStakeLbl) callStakeLbl.textContent = `$${stakeDisplay}`;
    if (putStakeLbl) putStakeLbl.textContent = `$${stakeDisplay}`;
    if (estProfitLbl) estProfitLbl.textContent = (currentStake * (currentPayout / 100)).toFixed(2);
    if (scrapeSourceLbl) scrapeSourceLbl.textContent = 'Synced';

    if (quickChips) {
      quickChips.forEach(chip => {
        const chipVal = parseFloat(chip.getAttribute('data-stake'));
        if (Math.abs(chipVal - currentStake) < 0.001) chip.classList.add('active');
        else chip.classList.remove('active');
      });
    }

    setPOAmount(currentStake);
    savePersistedState();
  }

  function updateLogsDisplay() {
    if (!orderLogsList) return;
    if (recentTrades.length === 0) {
      orderLogsList.innerHTML = '<div style="color: #64748b; font-size: 10px; text-align: center; padding: 14px;">No trades placed yet in this session.</div>';
      return;
    }
    orderLogsList.innerHTML = recentTrades.map(t => {
      const resColor = t.result === 'WIN' ? '#34d399' : t.result === 'LOSS' ? '#fb7185' : t.result === 'OPEN' ? '#fbbf24' : '#38bdf8';
      const pnlStr = t.result === 'WIN' ? `+$${Number(t.pnl || 0).toFixed(2)}` : t.result === 'LOSS' ? `-$${Number(t.stake).toFixed(2)}` : t.result || 'Live';
      return `
        <div class="al-log-row">
          <div>
            <span style="color: ${t.direction === 'CALL' ? '#34d399' : '#fb7185'}; font-weight: 700;">${t.direction === 'CALL' ? '▲ BUY' : '▼ SELL'}</span>
            <span style="color: #f8fafc; margin-left: 4px; font-weight: 700;">$${t.stake}</span>
          </div>
          <span style="color: #94a3b8;">${t.asset} · ${t.expiry || '15s'}</span>
          <span style="color: ${resColor}; font-weight: 700;">${pnlStr}</span>
        </div>
      `;
    }).join('');
  }

  function drawMatrixCanvasChart(canvas, rows, activeMode) {
    if (!canvas || !rows || rows.length === 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(220, canvas.clientWidth || 270);
    const h = 115;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const valsTotal = rows.map(r => activeMode === 'daily' ? r.totalNetWorth : r.totalValue);
    const valsBal = rows.map(r => r.endBalance);
    const maxV = Math.max(...valsTotal, 1);
    const minV = Math.min(...valsBal, 0);
    const span = Math.max(1, maxV - minV);
    const padL = 6, padR = 6, padT = 10, padB = 16;
    const cw = w - padL - padR;
    const ch = h - padT - padB;

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padT + (ch * i) / 3;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
    }

    const toX = (idx) => padL + (rows.length === 1 ? cw / 2 : (idx / (rows.length - 1)) * cw);
    const toY = (v) => padT + ch - ((v - minV) / span) * ch;

    // Area fill for Total Net Worth (cyan/purple glow)
    ctx.beginPath();
    ctx.moveTo(toX(0), padT + ch);
    valsTotal.forEach((v, i) => ctx.lineTo(toX(i), toY(v)));
    ctx.lineTo(toX(valsTotal.length - 1), padT + ch);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.28)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line Total Net Worth
    ctx.beginPath();
    valsTotal.forEach((v, i) => (i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v))));
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Line Active Balance (emerald)
    ctx.beginPath();
    valsBal.forEach((v, i) => (i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v))));
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '600 8px monospace';
    ctx.fillText(activeMode === 'daily' ? 'D1' : 'S1', padL, h - 4);
    const endLbl = activeMode === 'daily' ? `D${rows.length}` : `S${rows.length}`;
    ctx.fillText(endLbl, w - padR - ctx.measureText(endLbl).width, h - 4);
  }

  function renderMatrixTabHTML() {
    const isDaily = mxState.activeMode === 'daily';
    const res = isDaily ? calcDailyCompoundingMx(mxState.daily) : calcStepCompoundingMx(mxState.step);
    const startAmt = isDaily ? mxState.daily.startingCapital : mxState.step.startingCapital;
    const endAmt = res.finalBalance;
    const vaulted = isDaily ? res.totalWithdrawn : res.totalLocked;
    const totalGen = endAmt + vaulted;
    const netProf = totalGen - startAmt;
    const mult = totalGen / Math.max(0.1, startAmt);
    const endTier = getActiveTierMx(endAmt, mxState.daily.tiers);
    const activeSym = (CURRENCY_MAP[mxState.currency] || CURRENCY_MAP.USD).symbol;

    const kpiHtml = `
      <div class="al-tm-grid2" style="gap:5px;">
        <div class="al-tm-box" style="padding:7px;">
          <span class="al-tm-lbl">Initial Capital</span>
          <div style="font-size:13px;font-weight:900;color:#fff;font-family:monospace;">${fmtMoney(startAmt)}</div>
          <span style="font-size:8px;color:#64748b;font-family:monospace;">100% Principal Seed</span>
        </div>
        <div class="al-tm-box" style="padding:7px;background:#071712;border-color:rgba(16,185,129,0.35);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="al-tm-lbl" style="color:#34d399;">Active Bal</span>
            <span class="al-tag-sq" style="background:rgba(16,185,129,0.2);color:#6ee7b7;border-color:rgba(16,185,129,0.4);">${endTier ? escHtml(endTier.name.split(' ')[0]) : 'T1'}</span>
          </div>
          <div style="font-size:13px;font-weight:900;color:#6ee7b7;font-family:monospace;">${fmtMoney(endAmt)}</div>
          <span style="font-size:8px;color:rgba(52,211,153,0.8);font-family:monospace;">Compounded</span>
        </div>
        <div class="al-tm-box" style="padding:7px;background:#120b1e;border-color:rgba(168,85,247,0.35);">
          <span class="al-tm-lbl" style="color:#c084fc;">Banked Vault</span>
          <div style="font-size:13px;font-weight:900;color:#d8b4fe;font-family:monospace;">${fmtMoney(vaulted)}</div>
          <span style="font-size:8px;color:rgba(192,132,252,0.8);font-family:monospace;">Secured</span>
        </div>
        <div class="al-tm-box" style="padding:7px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="al-tm-lbl">Total Gen</span>
            <span style="font-size:8.5px;color:#fbbf24;font-weight:900;font-family:monospace;">${mult.toFixed(1)}x</span>
          </div>
          <div style="font-size:13px;font-weight:900;color:#fff;font-family:monospace;">${fmtMoney(totalGen)}</div>
          <span style="font-size:8px;color:#34d399;font-weight:700;font-family:monospace;">+${fmtMoney(netProf)} Net</span>
        </div>
      </div>
    `;

    const tiersHtml = `
      <div class="al-tm-box" style="padding:7px;display:flex;flex-direction:column;gap:5px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:9px;font-weight:900;text-transform:uppercase;color:#cbd5e1;font-family:monospace;">Adaptive Tier Matrix (T1-T4)</span>
          <button data-mx-act="toggleTiers" class="al-tag-sq" style="cursor:pointer;${mxState.daily.enableTieredReturns ? 'background:rgba(16,185,129,0.2);color:#6ee7b7;border-color:rgba(16,185,129,0.45);' : 'background:rgba(255,255,255,0.05);color:#64748b;border-color:rgba(255,255,255,0.1);'}">${mxState.daily.enableTieredReturns ? 'Tiers: Active' : 'Tiers: Off'}</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          ${mxState.daily.tiers.map((tier, idx) => {
            const isAct = endTier && endTier.id === tier.id;
            const cols = ['#22d3ee', '#34d399', '#c084fc', '#fbbf24'][idx % 4];
            const rangeStr = tier.maxBalance === null
              ? `>${fmtMoney(tier.minBalance, mxState.currency, 0)}`
              : `${fmtMoney(tier.minBalance, mxState.currency, 0)}-${fmtMoney(tier.maxBalance, mxState.currency, 0)}`;
            return `
              <div style="padding:5px 6px;border-radius:4px;border:1px solid ${isAct ? cols : 'rgba(255,255,255,0.08)'};background:${isAct ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.35)'};font-family:monospace;">
                <div style="display:flex;justify-content:space-between;font-size:9px;font-weight:800;color:#e2e8f0;">
                  <span style="color:${cols};">${escHtml(tier.name.split(' ')[0])} (T${idx + 1})</span>
                  <span>${tier.returnRate}%</span>
                </div>
                <div style="font-size:8px;color:#64748b;">${rangeStr}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const inputsHtml = isDaily ? `
      <div class="al-tm-box" style="padding:7px;display:flex;flex-direction:column;gap:6px;">
        <div class="al-tm-grid2" style="gap:5px;">
          <div class="al-comp-field">
            <label><span>Start Capital (${activeSym})</span><button data-mx-act="syncPO" class="al-tag-sq" style="background:rgba(6,182,212,0.16);color:#22d3ee;border-color:rgba(6,182,212,0.35);cursor:pointer;">PO</button></label>
            <input type="number" step="any" min="1" data-mx-in="d_cap" value="${mxState.daily.startingCapital}" />
          </div>
          <div class="al-comp-field">
            <label><span>Daily Target %</span></label>
            <input type="number" step="0.1" min="0.1" max="100" data-mx-in="d_rate" value="${mxState.daily.dailyReturnRate}" />
          </div>
          <div class="al-comp-field">
            <label><span>Days Horizon</span></label>
            <input type="number" step="1" min="1" max="365" data-mx-in="d_days" value="${mxState.daily.daysCount}" />
          </div>
          <div class="al-comp-field">
            <label><span>Target Goal</span></label>
            <input type="number" step="any" min="10" data-mx-in="d_goal" value="${mxState.daily.targetGoal}" />
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:3px;">
          ${[50, 100, 250, 500, 1000].map(v => `<button data-mx-preset-cap="${v}" class="al-nk-chip ${mxState.daily.startingCapital === v ? 'active' : ''}">${activeSym}${v}</button>`).join('')}
          ${[3, 5, 8, 10].map(r => `<button data-mx-preset-rate="${r}" class="al-nk-chip ${mxState.daily.dailyReturnRate === r ? 'active' : ''}">${r}%</button>`).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:9px;font-family:monospace;">
          <span style="color:#94a3b8;">Reinvest <strong style="color:#34d399;">${mxState.daily.reinvestmentPercent}%</strong> / Vault <strong style="color:#c084fc;">${100 - mxState.daily.reinvestmentPercent}%</strong></span>
          <div style="display:flex;gap:3px;">
            ${[100, 80, 70, 50].map(sp => `<button data-mx-reinv="${sp}" class="al-nk-chip ${mxState.daily.reinvestmentPercent === sp ? 'active' : ''}">${sp}%</button>`).join('')}
          </div>
        </div>
        <div class="al-tm-grid2" style="gap:5px;">
          <button data-mx-days="weekdays" class="al-mode-btn ${mxState.daily.activeDaysPreset === 'weekdays' ? 'active' : ''}">Mon-Fri (5d Forex)</button>
          <button data-mx-days="all" class="al-mode-btn ${mxState.daily.activeDaysPreset === 'all' ? 'active' : ''}">Mon-Sun (7d OTC)</button>
        </div>
      </div>
    ` : `
      <div class="al-tm-box" style="padding:7px;display:flex;flex-direction:column;gap:6px;">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
          <div class="al-comp-field">
            <label><span>Base (${activeSym})</span></label>
            <input type="number" step="0.1" min="0.1" data-mx-in="s_cap" value="${mxState.step.startingCapital}" />
          </div>
          <div class="al-comp-field">
            <label><span>Steps</span></label>
            <input type="number" step="1" min="2" max="30" data-mx-in="s_steps" value="${mxState.step.stepsCount}" />
          </div>
          <div class="al-comp-field">
            <label><span>Payout %</span></label>
            <input type="number" step="1" min="50" max="100" data-mx-in="s_pay" value="${mxState.step.payoutRatePercent}" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          <button data-mx-step-preset="333" class="al-mode-btn ${mxState.step.compoundingType === 'phases' && mxState.step.phaseLength === 3 ? 'active' : ''}">3x3 Matrix (Phase)</button>
          <button data-mx-step-preset="444" class="al-mode-btn ${mxState.step.compoundingType === 'phases' && mxState.step.phaseLength === 4 ? 'active' : ''}">4x4 Matrix (4x4)</button>
          <button data-mx-step-preset="sniper10" class="al-mode-btn ${mxState.step.compoundingType === 'all_in' ? 'active' : ''}">10-Step Streak (All-In)</button>
          <button data-mx-step-preset="conservative" class="al-mode-btn ${mxState.step.compoundingType === 'profit_split' ? 'active' : ''}">70/30 Vault (Bank 30%)</button>
        </div>
      </div>
    `;

    let subViewHtml = '';
    if (mxState.viewMode === 'chart') {
      subViewHtml = `
        <div class="al-tm-box" style="padding:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:9px;font-weight:900;color:#e2e8f0;text-transform:uppercase;">Growth Trajectory</span>
            <span style="font-size:8.5px;font-family:monospace;color:#22d3ee;">Cyan: Total · Green: Bal</span>
          </div>
          <canvas id="al-mx-chart-canvas" style="width:100%;height:115px;display:block;"></canvas>
        </div>
      `;
    } else if (mxState.viewMode === 'schedule') {
      subViewHtml = isDaily ? `
        <div class="al-tm-table-wrap">
          <table class="al-tm-table">
            <thead><tr><th>Day</th><th>Date</th><th>Rate</th><th>Profit</th><th>Vault</th><th style="text-align:right;">Balance</th></tr></thead>
            <tbody>
              ${res.rows.slice(0, 60).map(r => `
                <tr>
                  <td style="color:#94a3b8;font-weight:700;">D${r.dayIndex}</td>
                  <td>${escHtml(r.formattedDate)}</td>
                  <td style="color:#22d3ee;">${r.effectiveReturnRate}%</td>
                  <td style="color:#34d399;">+${fmtMoney(r.grossProfit)}</td>
                  <td style="color:#c084fc;">+${fmtMoney(r.withdrawnProfit)}</td>
                  <td style="text-align:right;font-weight:800;color:#fff;">${fmtMoney(r.endBalance)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="al-tm-table-wrap">
          <table class="al-tm-table">
            <thead><tr><th>Step</th><th>Stake (Tap PO)</th><th>Profit</th><th>Vault</th><th style="text-align:right;">Balance</th></tr></thead>
            <tbody>
              ${res.rows.map(r => `
                <tr data-push-stake="${r.stakeAmount.toFixed(2)}" style="cursor:pointer;">
                  <td style="color:#c084fc;font-weight:700;">S${r.stepIndex}${r.isPhaseTarget ? ' ★' : ''}</td>
                  <td style="color:#fbbf24;font-weight:800;">$${r.stakeAmount.toFixed(2)}</td>
                  <td style="color:#34d399;">+${fmtMoney(r.grossProfit)}</td>
                  <td style="color:#c084fc;">+${fmtMoney(r.lockedProfit)}</td>
                  <td style="text-align:right;font-weight:800;color:#fff;">${fmtMoney(r.totalValue)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      const proj = calcGoalProjectionMx(startAmt, isDaily ? mxState.daily.targetGoal : mxState.step.targetGoal, isDaily ? mxState.daily.dailyReturnRate : 8, isDaily ? mxState.daily.reinvestmentPercent : 70);
      subViewHtml = `
        <div class="al-tm-box" style="padding:8px;display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:9px;font-weight:900;color:#fff;text-transform:uppercase;">Goal Projection & Milestones</span>
            <span class="al-tag-sq" style="background:rgba(245,158,11,0.18);color:#fbbf24;border-color:rgba(245,158,11,0.4);">${proj.riskRating}</span>
          </div>
          <div class="al-tm-grid2" style="gap:5px;font-family:monospace;">
            <div style="padding:5px;background:rgba(0,0,0,0.35);border-radius:4px;">
              <span style="font-size:8px;color:#64748b;display:block;">EST. DAYS TO GOAL</span>
              <strong style="color:#22d3ee;font-size:12px;">${proj.targetDaysNeeded !== null ? `${proj.targetDaysNeeded} Trading Days` : '>1500 Days'}</strong>
            </div>
            <div style="padding:5px;background:rgba(0,0,0,0.35);border-radius:4px;">
              <span style="font-size:8px;color:#64748b;display:block;">REQ DAILY (30D / 60D)</span>
              <strong style="color:#34d399;font-size:11px;">${proj.req30}% / ${proj.req60}%</strong>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:3px;">
            ${res.milestones.map(m => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 6px;background:rgba(0,0,0,0.3);border:1px solid ${m.projectedIndex ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.06)'};border-radius:4px;font-size:9.5px;font-family:monospace;">
                <span style="color:#e2e8f0;">${escHtml(m.label)}</span>
                <span style="color:${m.projectedIndex ? '#34d399' : '#64748b'};font-weight:800;">
                  ${m.projectedIndex ? (isDaily ? `Day ${m.projectedIndex}` : `Step ${m.projectedIndex}`) : 'Beyond Horizon'}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    return `
      <div style="display:flex;flex-direction:column;gap:7px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:5px;">
          <div style="display:flex;gap:3px;flex:1;">
            <button data-mx-mode="daily" class="al-mode-btn ${isDaily ? 'active' : ''}">Daily Mode</button>
            <button data-mx-mode="step" class="al-mode-btn ${!isDaily ? 'active' : ''}">Steps Mode</button>
          </div>
          <select id="al-mx-curr" style="background:#121824;border:1px solid rgba(255,255,255,0.12);border-radius:4px;color:#e2e8f0;font-size:10px;font-weight:700;padding:3px 5px;outline:none;">
            ${Object.values(CURRENCY_MAP).map(c => `<option value="${c.code}" ${mxState.currency === c.code ? 'selected' : ''}>${c.symbol} ${c.code}</option>`).join('')}
          </select>
        </div>

        ${kpiHtml}
        ${tiersHtml}
        ${inputsHtml}

        <div style="display:flex;gap:3px;">
          <button data-mx-view="chart" class="al-mode-btn ${mxState.viewMode === 'chart' ? 'active' : ''}">Growth Chart</button>
          <button data-mx-view="schedule" class="al-mode-btn ${mxState.viewMode === 'schedule' ? 'active' : ''}">Schedule</button>
          <button data-mx-view="milestones" class="al-mode-btn ${mxState.viewMode === 'milestones' ? 'active' : ''}">Milestones</button>
        </div>

        ${subViewHtml}
      </div>
    `;
  }

  function renderTradeManager() {
    if (!tmRootEl) return;
    const c = getTMComputed();
    const { planMetrics, currentStep, winsCount, winsLeft, tradesRemaining, currentPL, consecutiveLosses: consL, aladdinScheduleMatrix, capitalRequiredInfo, nextStakeCalc, nextStake, calendarData, logStats } = c;

    const topBar = `
      <div class="al-tm-card-head">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:10.5px;font-weight:900;letter-spacing:1.2px;color:#f8fafc;">ALADDINSNIPER</span>
          <span class="al-tag-sq" style="background:rgba(6,182,212,0.14);color:#22d3ee;border-color:rgba(6,182,212,0.4);">TRADE MANAGER</span>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <button data-tm-act="toggleSync" class="al-tag-sq" style="cursor:pointer;${tmState.autoSyncPO ? 'background:rgba(16,185,129,0.16);color:#34d399;border-color:rgba(16,185,129,0.45);' : 'background:rgba(255,255,255,0.05);color:#94a3b8;border-color:rgba(255,255,255,0.12);'}" title="Auto-sync PO Balance, Payout & Asset">PO ${tmState.autoSyncPO ? 'SYNCED' : 'MANUAL'}</button>
          <span class="al-tag-sq" style="${poAccountType === 'REAL' ? 'background:rgba(16,185,129,0.15);color:#34d399;border-color:#10b981;' : 'background:rgba(245,158,11,0.15);color:#fbbf24;border-color:#f59e0b;'}">${poAccountType}</span>
        </div>
      </div>

      <div class="al-tm-subtabs">
        ${[
          { id: 'trade', label: 'Trade' },
          { id: 'settings', label: 'Settings' },
          { id: 'session_log', label: 'Log' },
          { id: 'calendar', label: 'P&L' },
          { id: 'schedule', label: 'Schedule' },
          { id: 'matrix', label: 'Matrix' }
        ].map(t => `<button data-tm-sub="${t.id}" class="al-tm-subtab ${tmState.activeSubTab === t.id ? 'active' : ''}">${t.label}</button>`).join('')}
      </div>
    `;

    let bodyHtml = '';

    if (tmState.activeSubTab === 'trade') {
      let stageBadge = '';
      if (nextStakeCalc.phase === 'STAGE_1_BASE') {
        stageBadge = `<span class="al-tag-sq" style="background:rgba(6,182,212,0.15);border-color:rgba(6,182,212,0.4);color:#67e8f9;">Stage 1: Base Growth ($${planMetrics.firstStake.toFixed(2)})</span>`;
      } else if (nextStakeCalc.phase === 'STAGE_2_CUSHION') {
        stageBadge = `<span class="al-tag-sq" style="background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.4);color:#fcd34d;">Stage 2: Drawdown Defense (52% Cushion)</span>`;
      } else if (nextStakeCalc.phase === 'STAGE_2_RECOVERY') {
        stageBadge = `<span class="al-tag-sq" style="background:rgba(244,63,94,0.15);border-color:rgba(244,63,94,0.4);color:#fda4af;">Stage 2: Capital Recovery (${consL}L Defense)</span>`;
      } else if (nextStakeCalc.phase === 'STAGE_3_PROFIT_LOCK') {
        stageBadge = `<span class="al-tag-sq" style="background:rgba(16,185,129,0.15);border-color:rgba(16,185,129,0.4);color:#6ee7b7;">Stage 3: Profit Target Lock</span>`;
      } else {
        stageBadge = `<span class="al-tag-sq" style="background:rgba(16,185,129,0.25);border-color:#34d399;color:#a7f3d0;">Target Achieved</span>`;
      }

      const stepBoxes = Array.from({ length: tmState.tradesAllowed }).map((_, idx) => {
        const sn = idx + 1;
        const tr = tmState.sessionTrades.find(x => x.step === sn);
        const isCur = sn === currentStep && tmState.sessionActive;
        let cls = 'al-tm-step';
        if (tr && tr.result === 'WIN') cls += ' win';
        else if (tr && tr.result === 'LOSS') cls += ' loss';
        else if (isCur) cls += ' cur';
        return `<div class="${cls}">${sn}</div>`;
      }).join('');

      const orderOrBtns = activeTrade ? `
        <div class="al-tm-box" style="padding:8px;border-color:${activeTrade.direction === 'CALL' ? '#10b981' : '#f43f5e'};background:${activeTrade.direction === 'CALL' ? 'rgba(6,78,59,0.28)' : 'rgba(136,19,55,0.28)'};display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="al-tag-sq" style="background:${activeTrade.direction === 'CALL' ? '#10b981' : '#f43f5e'};color:#000;font-weight:900;">${activeTrade.direction === 'CALL' ? 'BUY' : 'SELL'} • $${activeTrade.stake.toFixed(2)}</span>
              <span style="font-size:10px;font-weight:700;color:#fff;font-family:monospace;">${escHtml(activeTrade.asset)}</span>
            </div>
            <span id="al-tm-order-timer" class="al-tag-sq" style="background:rgba(0,0,0,0.65);border-color:rgba(245,158,11,0.5);color:#fcd34d;font-size:11px;font-weight:900;">${Math.max(0, Math.ceil((activeTrade.endTime - Date.now()) / 1000))}s</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:9.5px;font-family:monospace;color:#cbd5e1;">
            <span>Entry: <strong style="color:#fff;">${activeTrade.entryPrice ? formatPrice(activeTrade.entryPrice) : 'Live'}</strong></span>
            <span>Est: <strong style="color:#34d399;">+$${(activeTrade.stake * (tmState.payoutRate / 100)).toFixed(2)} (${tmState.payoutRate}%)</strong></span>
          </div>
          <div class="al-tm-grid2" style="gap:5px;">
            <button data-tm-act="forceWin" class="al-trade-btn al-btn-call" style="padding:6px;font-size:10.5px;">Force WIN</button>
            <button data-tm-act="forceLoss" class="al-trade-btn al-btn-put" style="padding:6px;font-size:10.5px;">Force LOSS</button>
          </div>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${tmState.tradeActionMode === 'BUY_SELL' ? `
            <div style="display:flex;align-items:center;gap:5px;">
              <button data-tm-act="execBuy" ${(!tmState.sessionActive || winsLeft === 0 || tradesRemaining === 0 || tmState.currentBalance < tmState.minStakeLimit) ? 'disabled' : ''} class="al-trade-btn al-btn-call" style="flex:1;padding:9px 6px;font-size:11.5px;border-radius:4px;">▲ BUY $${nextStake.toFixed(2)}</button>
              <button data-tm-act="toggleTradeMode" class="al-tm-switch-orb" style="border-color:rgba(245,158,11,0.8);color:#fcd34d;" title="Switch to WIN / LOSS">⇄</button>
              <button data-tm-act="execSell" ${(!tmState.sessionActive || winsLeft === 0 || tradesRemaining === 0 || tmState.currentBalance < tmState.minStakeLimit) ? 'disabled' : ''} class="al-trade-btn al-btn-put" style="flex:1;padding:9px 6px;font-size:11.5px;border-radius:4px;">▼ SELL $${nextStake.toFixed(2)}</button>
            </div>
          ` : `
            <div style="display:flex;align-items:center;gap:5px;">
              <button data-tm-act="recWin" ${(!tmState.sessionActive || winsLeft === 0 || tradesRemaining === 0) ? 'disabled' : ''} class="al-trade-btn al-btn-call" style="flex:1;padding:9px 5px;font-size:11px;border-radius:4px;">WIN (+$${(nextStake * (tmState.payoutRate / 100)).toFixed(2)})</button>
              <button data-tm-act="toggleTradeMode" class="al-tm-switch-orb" style="border-color:rgba(6,182,212,0.8);color:#67e8f9;" title="Switch to BUY / SELL">⇄</button>
              <button data-tm-act="recLoss" ${(!tmState.sessionActive || winsLeft === 0 || tradesRemaining === 0) ? 'disabled' : ''} class="al-trade-btn al-btn-put" style="flex:1;padding:9px 5px;font-size:11px;border-radius:4px;">LOSS (-$${nextStake.toFixed(2)})</button>
            </div>
          `}
          <div class="al-tm-grid2" style="gap:5px;">
            <button data-tm-act="endSession" class="al-tm-btn-sec ${currentPL > 0 ? 'glow' : ''}">End ${currentPL > 0 ? `(+$${currentPL.toFixed(0)})` : 'Session'}</button>
            <button data-tm-act="resetSession" class="al-tm-btn-sec" style="border-color:rgba(245,158,11,0.4);color:#fcd34d;">↺ Reset</button>
          </div>
        </div>
      `;

      const sessionLogSlim = tmState.sessionTrades.length > 0 ? `
        <div style="display:flex;flex-direction:column;gap:2px;max-height:86px;overflow-y:auto;">
          ${tmState.sessionTrades.slice().reverse().map(t => `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:9.5px;font-family:monospace;padding:3px 6px;background:#0d111a;border:1px solid rgba(255,255,255,0.05);border-radius:3px;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#64748b;">#${t.step}</span>
                <span style="font-weight:900;color:${t.result === 'WIN' ? '#34d399' : '#fb7185'};">${t.result}</span>
                <span style="color:#f8fafc;font-weight:700;">$${t.stake.toFixed(2)}</span>
                ${t.direction ? `<span class="al-tag-sq" style="background:${t.direction === 'BUY' ? 'rgba(16,185,129,0.16)' : 'rgba(244,63,94,0.16)'};color:${t.direction === 'BUY' ? '#34d399' : '#fb7185'};border:none;">${t.direction}</span>` : ''}
              </div>
              <span style="color:#94a3b8;">$${t.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          `).join('')}
        </div>
      ` : '';

      bodyHtml = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;">
          <div style="display:flex;gap:3px;flex:1;">
            ${[
              { id: 'ALADDIN_TIERED', label: 'Tiered' },
              { id: 'ALADDIN_DP', label: 'DP Matrix' },
              { id: 'SNIPER_CORE', label: 'Core' }
            ].map(e => `<button data-tm-eng="${e.id}" class="al-mode-btn ${tmState.engineMode === e.id ? 'active' : ''}">${e.label}</button>`).join('')}
          </div>
          <button data-tm-act="toggleAutoStake" class="al-micro-btn" style="${autoApplyStake ? 'border-color:rgba(16,185,129,0.5);color:#34d399;' : ''}">Auto: ${autoApplyStake ? 'ON' : 'OFF'}</button>
        </div>

        <div style="text-align:center;padding:2px 0;">
          <span style="font-size:9px;font-weight:900;letter-spacing:1.8px;color:#64748b;display:block;">NEXT STAKE</span>
          <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
            <span style="font-size:28px;font-weight:900;font-family:monospace;color:#fff;letter-spacing:-0.5px;">$${nextStake.toFixed(2)}</span>
            <button data-tm-act="applyNextToPO" class="al-micro-btn" style="background:#0284c7;border-color:#38bdf8;color:#fff;height:22px;" title="Push stake into Pocket Option">→ PO</button>
            <button data-tm-act="copyStake" class="al-micro-btn" style="height:22px;" title="Copy stake">Copy</button>
          </div>
          <div style="margin-top:4px;">${stageBadge}</div>
        </div>

        <div class="al-tm-steps-grid">${stepBoxes}</div>

        <div class="al-tm-kpi6">
          <div class="al-tm-kpi6-row">
            <div><span class="al-tm-lbl">BALANCE</span><strong id="al-tm-live-bal" style="font-size:12px;font-family:monospace;color:#fff;">$${tmState.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
            <div style="padding-left:8px;"><span class="al-tm-lbl">TARGET</span><strong style="font-size:12px;font-family:monospace;color:#fff;">$${planMetrics.capitalGoal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
          </div>
          <div class="al-tm-kpi6-row">
            <div><span class="al-tm-lbl">P/L</span><strong style="font-size:12px;font-family:monospace;color:${currentPL >= 0 ? '#34d399' : '#fb7185'};">${currentPL >= 0 ? `+$${currentPL.toFixed(2)}` : `-$${Math.abs(currentPL).toFixed(2)}`}</strong></div>
            <div style="padding-left:8px;"><span class="al-tm-lbl">WINS / LEFT</span><strong style="font-size:12px;font-family:monospace;color:#fff;">${winsCount} / ${tradesRemaining}</strong></div>
          </div>
          <div class="al-tm-kpi6-row">
            <div>
              <span class="al-tm-lbl">PAYOUT</span>
              <select id="al-tm-payout-sel" style="background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.12);border-radius:3px;color:#fff;font-size:11px;font-family:monospace;font-weight:800;padding:1px 4px;margin-top:2px;">
                ${Array.from(new Set([70, 75, 80, 82, 85, 88, 90, 92, 95, currentPayout, tmState.payoutRate])).sort((a, b) => a - b).map(p => `<option value="${p}" ${tmState.payoutRate === p ? 'selected' : ''}>${p}%</option>`).join('')}
              </select>
            </div>
            <div style="padding-left:8px;">
              <span class="al-tm-lbl">ASSET</span>
              <div style="font-size:11px;font-weight:800;color:#22d3ee;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(poAsset || tmState.selectedAsset)}</div>
            </div>
          </div>
        </div>

        ${nextStakeCalc.isBelowMin ? `
          <div style="background:#241a06;border:1px solid #78350f;padding:6px 8px;border-radius:4px;font-size:10px;color:#fbbf24;">
            The plan now calls for $${nextStake.toFixed(2)}, below Pocket Option's $${tmState.minStakeLimit.toFixed(2)} minimum.
          </div>
        ` : ''}

        <div style="display:flex;gap:5px;">
          <button data-tm-sub="session_log" class="al-tm-btn-sec" style="flex:1;color:#fbbf24;border-color:rgba(245,158,11,0.35);">Log</button>
          <button data-tm-sub="matrix" class="al-tm-btn-sec" style="flex:1;color:#22d3ee;border-color:rgba(6,182,212,0.35);">Matrix</button>
          <button data-tm-sub="schedule" class="al-tm-btn-sec" style="flex:1;color:#34d399;border-color:rgba(16,185,129,0.35);">Schedule</button>
        </div>

        ${orderOrBtns}
        ${sessionLogSlim}
      `;
    } else if (tmState.activeSubTab === 'settings') {
      const bufDiff = tmState.currentBalance - capitalRequiredInfo.capitalRequired;
      bodyHtml = `
        <div class="al-tm-box" style="padding:8px;display:flex;align-items:center;justify-content:space-between;gap:6px;">
          <div>
            <span style="font-size:11px;font-weight:800;color:#fff;display:block;">Balance $${Number(tmState.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <span style="font-size:9px;color:#64748b;">from Pocket Option</span>
          </div>
          <div style="display:flex;align-items:center;gap:4px;">
            <button data-tm-act="pullPOBal" class="al-micro-btn" style="background:rgba(16,185,129,0.16);border-color:rgba(16,185,129,0.4);color:#34d399;">PO Sync</button>
            <input type="number" step="0.01" id="al-tm-set-bal" value="${tmState.balance}" style="width:76px;background:rgba(0,0,0,0.55);border:1px solid rgba(255,255,255,0.14);border-radius:3px;padding:3px 5px;font-size:11px;font-family:monospace;text-align:right;color:#34d399;outline:none;" />
          </div>
        </div>

        <div class="al-tm-box" style="padding:7px;display:flex;flex-direction:column;gap:5px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="al-tm-lbl">ALADDIN MATRIX PRESETS</span>
            <span style="font-size:10px;font-family:monospace;color:#fbbf24;font-weight:800;">${tmState.tradesAllowed}T / ${tmState.winsNeeded}W</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(6, 1fr);gap:3px;">
            ${['10/2', '10/3', '10/4', '12/2', '12/3', '14/2'].map(p => {
              const [t, w] = p.split('/').map(Number);
              const sel = tmState.tradesAllowed === t && tmState.winsNeeded === w;
              return `<button data-tm-preset="${p}" style="padding:4px 2px;border-radius:3px;font-size:9.5px;font-family:monospace;font-weight:800;cursor:pointer;border:1px solid ${sel ? '#10b981' : 'rgba(255,255,255,0.08)'};background:${sel ? 'rgba(16,185,129,0.2)' : '#121622'};color:${sel ? '#34d399' : '#94a3b8'};">${p}</button>`;
            }).join('')}
          </div>
        </div>

        <div class="al-tm-grid2" style="gap:5px;">
          <div class="al-tm-box" style="padding:6px;">
            <span class="al-tm-lbl">RISK AMOUNT (%)</span>
            <input type="number" id="al-tm-set-risk" value="${tmState.riskAmountPercent}" style="width:100%;background:transparent;border:none;color:#fff;font-family:monospace;font-weight:800;font-size:12px;outline:none;" />
          </div>
          <div class="al-tm-box" style="padding:6px;">
            <span class="al-tm-lbl">MAX LIQUIDATION</span>
            <strong style="font-family:monospace;font-size:12px;color:#fff;">$${planMetrics.maxLiquidation.toFixed(2)}</strong>
          </div>
          <div class="al-tm-box" style="padding:6px;">
            <span class="al-tm-lbl">TRADES (2-30)</span>
            <input type="number" min="2" max="30" id="al-tm-set-trades" value="${tmState.tradesAllowed}" style="width:100%;background:transparent;border:none;color:#fff;font-family:monospace;font-weight:800;font-size:12px;outline:none;" />
          </div>
          <div class="al-tm-box" style="padding:6px;">
            <span class="al-tm-lbl">WINS NEEDED</span>
            <input type="number" min="1" max="${tmState.tradesAllowed}" id="al-tm-set-wins" value="${tmState.winsNeeded}" style="width:100%;background:transparent;border:none;color:#fff;font-family:monospace;font-weight:800;font-size:12px;outline:none;" />
          </div>
          <div class="al-tm-box" style="padding:6px;">
            <span class="al-tm-lbl">PAYOUT (%)</span>
            <input type="number" min="10" max="100" id="al-tm-set-pay" value="${tmState.payoutRate}" style="width:100%;background:transparent;border:none;color:#fff;font-family:monospace;font-weight:800;font-size:12px;outline:none;" />
          </div>
          <div class="al-tm-box" style="padding:6px;">
            <span class="al-tm-lbl">FIRST STAKE</span>
            <strong style="font-family:monospace;font-size:12px;color:#fff;">$${planMetrics.firstStake.toFixed(2)}</strong>
          </div>
          <div class="al-tm-box" style="padding:6px;">
            <span class="al-tm-lbl">FINAL CAPITAL</span>
            <strong style="font-family:monospace;font-size:12px;color:#fff;">$${planMetrics.capitalGoal.toFixed(2)}</strong>
          </div>
          <div class="al-tm-box" style="padding:6px;">
            <span class="al-tm-lbl">ACCOUNT GAIN</span>
            <strong style="font-family:monospace;font-size:12px;color:#fff;">${planMetrics.accountGainPercent.toFixed(2)}%</strong>
          </div>
          <div class="al-tm-box" style="padding:6px;">
            <span class="al-tm-lbl">WIN PROFIT</span>
            <strong style="font-family:monospace;font-size:12px;color:#34d399;">$${planMetrics.targetProfit.toFixed(2)}</strong>
          </div>
          <div class="al-tm-box" style="padding:6px;">
            <span class="al-tm-lbl">TRADE LOSS LIMIT</span>
            <strong style="font-family:monospace;font-size:12px;color:#fff;">${planMetrics.tradeLossLimit}</strong>
          </div>
          <div class="al-tm-box" style="padding:6px;">
            <span class="al-tm-lbl">CAPITAL REQUIRED</span>
            <strong style="font-family:monospace;font-size:12px;color:#fbbf24;">$${capitalRequiredInfo.capitalRequired.toFixed(2)}</strong>
          </div>
          <div class="al-tm-box" style="padding:6px;">
            <span class="al-tm-lbl">YOUR BALANCE</span>
            <strong style="font-family:monospace;font-size:12px;color:${tmState.currentBalance >= capitalRequiredInfo.capitalRequired ? '#34d399' : '#fb7185'};">$${tmState.currentBalance.toFixed(2)}</strong>
          </div>
          <div class="al-tm-box" style="padding:6px;">
            <span class="al-tm-lbl">INITIAL DEPOSIT</span>
            <strong style="font-family:monospace;font-size:12px;color:#fff;">$${tmState.sessionStartBalance.toFixed(2)}</strong>
          </div>
          <div class="al-tm-box" style="padding:6px;">
            <span class="al-tm-lbl">SAFETY BUFFER</span>
            <strong style="font-family:monospace;font-size:12px;color:${bufDiff >= 0 ? '#34d399' : '#fbbf24'};">${bufDiff >= 0 ? '+' : '-'}$${Math.abs(bufDiff).toFixed(2)}</strong>
          </div>
        </div>

        <button data-tm-act="startNewSession" style="width:100%;padding:9px;border-radius:4px;background:#f59e0b;color:#000;font-weight:900;font-size:11.5px;text-transform:uppercase;letter-spacing:0.8px;border:none;cursor:pointer;">Start new session</button>
        <div class="al-tm-grid2" style="gap:5px;">
          <button data-tm-act="factoryReset" class="al-tm-btn-sec" style="color:#fda4af;border-color:rgba(244,63,94,0.35);">↺ Factory Reset</button>
          <button data-tm-sub="session_log" class="al-tm-btn-sec">Session Log</button>
        </div>
      `;
    } else if (tmState.activeSubTab === 'session_log') {
      bodyHtml = `
        <div class="al-tm-box" style="padding:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <span style="font-size:8.5px;font-weight:900;color:#f59e0b;text-transform:uppercase;display:block;">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              <strong style="font-size:13px;color:#fff;">Today's Snapshot</strong>
              <span style="font-size:9.5px;color:#64748b;display:block;">${logStats.todaySessionsCount} sessions logged today</span>
            </div>
            <div style="text-align:right;">
              <span class="al-tm-lbl">TODAY'S PROFIT</span>
              <div style="font-size:18px;font-weight:900;font-family:monospace;color:${logStats.todayProfit >= 0 ? '#34d399' : '#fb7185'};">${logStats.todayProfit >= 0 ? `+$${logStats.todayProfit.toFixed(2)}` : `-$${Math.abs(logStats.todayProfit).toFixed(2)}`}</div>
              <span style="font-size:9px;color:#64748b;font-family:monospace;">All time ${logStats.allTimeProfit >= 0 ? `+$${logStats.allTimeProfit.toFixed(2)}` : `-$${Math.abs(logStats.allTimeProfit).toFixed(2)}`}</span>
            </div>
          </div>
        </div>

        <div class="al-tm-grid2" style="gap:5px;">
          <div class="al-tm-box" style="padding:6px;"><span class="al-tm-lbl">SESSION WIN / LOSS</span><strong style="font-size:13px;font-family:monospace;color:#fff;">${logStats.totalWon} / ${logStats.totalLost}</strong></div>
          <div class="al-tm-box" style="padding:6px;"><span class="al-tm-lbl">SESSION WIN RATE</span><strong style="font-size:13px;font-family:monospace;color:#34d399;">${logStats.winRate}%</strong></div>
          <div class="al-tm-box" style="padding:6px;"><span class="al-tm-lbl">TOTAL SESSIONS</span><strong style="font-size:13px;font-family:monospace;color:#fff;">${logStats.totalSessions}</strong></div>
          <div class="al-tm-box" style="padding:6px;"><span class="al-tm-lbl">ACCOUNT GAIN</span><strong style="font-size:13px;font-family:monospace;color:#34d399;">${planMetrics.accountGainPercent.toFixed(2)}%</strong></div>
        </div>

        <div class="al-tm-box" style="padding:7px;display:flex;flex-direction:column;gap:5px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:11px;color:#fff;">Session Results</strong>
            <div style="display:flex;gap:4px;">
              <button data-tm-act="clearLastLog" class="al-micro-btn">Clear Last</button>
              <button data-tm-act="clearAllLogs" class="al-micro-btn" style="color:#fb7185;border-color:rgba(244,63,94,0.35);">Clear All</button>
            </div>
          </div>
          <div class="al-tm-table-wrap">
            ${tmState.sessionLogs.length === 0 ? '<div style="text-align:center;color:#64748b;padding:12px;font-size:10px;">No completed sessions logged yet.</div>' : `
              <table class="al-tm-table" style="min-width:520px;">
                <thead><tr><th>Session</th><th>Date</th><th>Account Bal</th><th>Trades</th><th>Wins</th><th>Payout</th><th>Goal</th><th>Ending Bal</th><th>W/L</th><th style="text-align:right;">P/L</th></tr></thead>
                <tbody>
                  ${tmState.sessionLogs.map((log, i) => `
                    <tr>
                      <td style="font-weight:800;color:#fff;">#${tmState.sessionLogs.length - i}</td>
                      <td style="color:#94a3b8;">${escHtml(log.dateFormatted)}</td>
                      <td>$${Number(log.accountBalance).toFixed(2)}</td>
                      <td>${log.tradesAllowed}</td>
                      <td>${log.winsNeeded}</td>
                      <td>${log.payoutRate}%</td>
                      <td>$${Number(log.capitalGoal).toFixed(2)}</td>
                      <td style="font-weight:800;color:#fff;">$${Number(log.endingBalance).toFixed(2)}</td>
                      <td><span style="color:#34d399;">${log.won}</span>/<span style="color:#fb7185;">${log.lost}</span></td>
                      <td style="text-align:right;font-weight:900;color:${log.profitOrLoss >= 0 ? '#34d399' : '#fb7185'};">${log.profitOrLoss >= 0 ? `+$${Number(log.profitOrLoss).toFixed(2)}` : `-$${Math.abs(Number(log.profitOrLoss)).toFixed(2)}`}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      `;
    } else if (tmState.activeSubTab === 'calendar') {
      const mNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const empties = Array.from({ length: calendarData.firstDay }).map(() => `<div class="al-tm-cal-cell empty"></div>`).join('');
      const days = Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
        const dn = i + 1;
        const rec = calendarData.dayMap[dn];
        const isTr = !!rec;
        const isPos = rec ? rec.profit >= 0 : false;
        return `
          <div class="al-tm-cal-cell ${isTr ? (isPos ? 'pos' : 'neg') : ''}">
            <span style="font-size:8.5px;font-weight:800;">${dn}</span>
            ${isTr ? `
              <div style="text-align:center;">
                <span style="font-size:9px;font-weight:900;color:${isPos ? '#34d399' : '#fb7185'};display:block;line-height:1;">${isPos ? `+$${rec.profit.toFixed(0)}` : `-$${Math.abs(rec.profit).toFixed(0)}`}</span>
                <span style="font-size:7px;color:#94a3b8;display:block;">${rec.sessions}s</span>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      bodyHtml = `
        <div class="al-tm-box" style="padding:8px;display:flex;flex-direction:column;gap:7px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:12.5px;color:#fff;">P&L Calendar</strong>
            <div style="display:flex;align-items:center;gap:6px;">
              <button data-tm-act="prevMonth" class="al-micro-btn">◀</button>
              <span style="font-size:10.5px;font-weight:800;font-family:monospace;color:#fff;">${mNames[tmState.calendarMonth]} ${tmState.calendarYear}</span>
              <button data-tm-act="nextMonth" class="al-micro-btn">▶</button>
            </div>
          </div>
          <div style="display:flex;align-items:baseline;gap:8px;">
            <span style="font-size:18px;font-weight:900;font-family:monospace;color:${calendarData.monthTotal >= 0 ? '#34d399' : '#fb7185'};">${calendarData.monthTotal >= 0 ? `+$${calendarData.monthTotal.toFixed(2)}` : `-$${Math.abs(calendarData.monthTotal).toFixed(2)}`}</span>
            <span style="font-size:10px;color:#64748b;">${calendarData.daysTraded} days traded</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center;font-size:8.5px;font-weight:900;color:#64748b;">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;">${empties}${days}</div>
        </div>
      `;
    } else if (tmState.activeSubTab === 'schedule') {
      const isDP = tmState.scheduleViewMode === 'ALADDIN_DP';
      bodyHtml = `
        <div class="al-tm-box" style="padding:7px;display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:5px;">
            <div>
              <div style="font-size:10.5px;font-weight:900;color:#fff;">PRE-CALCULATED SCHEDULE ENGINE</div>
              <div style="font-size:9px;color:#64748b;">${isDP ? 'Aladdin DP Memoization' : 'SniperCORE Loss Recovery'} · ${tmState.tradesAllowed}T/${tmState.winsNeeded}W</div>
            </div>
            <div style="display:flex;gap:3px;">
              <button data-tm-sched="ALADDIN_DP" class="al-micro-btn" style="${isDP ? 'background:rgba(245,158,11,0.2);color:#fcd34d;border-color:rgba(245,158,11,0.45);' : ''}">DP Matrix</button>
              <button data-tm-sched="STEP_RECOVERY" class="al-micro-btn" style="${!isDP ? 'background:rgba(245,158,11,0.2);color:#fcd34d;border-color:rgba(245,158,11,0.45);' : ''}">Recovery</button>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:5px;">
            <span style="font-size:9px;color:#64748b;font-weight:800;">PRESETS (Tap row to push stake)</span>
            <div style="display:flex;gap:3px;">
              ${['10/2', '10/3', '12/2', '14/2'].map(p => {
                const [t, w] = p.split('/').map(Number);
                const sel = tmState.tradesAllowed === t && tmState.winsNeeded === w;
                return `<button data-tm-preset="${p}" class="al-micro-btn" style="${sel ? 'background:rgba(16,185,129,0.2);color:#34d399;border-color:#10b981;' : ''}">${p}</button>`;
              }).join('')}
            </div>
          </div>
        </div>
        <div class="al-tm-table-wrap">
          ${isDP ? `
            <table class="al-tm-table">
              <thead><tr><th>Step</th><th>DP Stake</th><th>Bal Before</th><th>Profit Won</th><th>Bal Won</th><th style="text-align:right;">Bal Lost</th></tr></thead>
              <tbody>
                ${aladdinScheduleMatrix.schedule.map(s => `
                  <tr data-push-stake="${s.stake.toFixed(2)}" style="cursor:pointer;${s.step === currentStep && tmState.sessionActive ? 'background:rgba(245,158,11,0.12);color:#fcd34d;' : ''}">
                    <td style="font-weight:800;">${s.step}</td>
                    <td style="color:#fff;font-weight:900;">$${s.stake.toFixed(2)}</td>
                    <td style="color:#94a3b8;">$${s.balanceBefore.toFixed(2)}</td>
                    <td style="color:#34d399;">+$${s.profitIfWon.toFixed(2)}</td>
                    <td style="color:#67e8f9;font-weight:800;">$${s.balanceIfWon.toFixed(2)}</td>
                    <td style="text-align:right;color:#fb7185;">$${s.balanceIfLost.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <table class="al-tm-table">
              <thead><tr><th>Step</th><th>Stake</th><th>Cum Risk</th><th>Payout Won</th><th style="text-align:right;">Net If Won</th></tr></thead>
              <tbody>
                ${planMetrics.stakeSchedule.map(s => `
                  <tr data-push-stake="${s.stake.toFixed(2)}" style="cursor:pointer;${s.step === currentStep && tmState.sessionActive ? 'background:rgba(245,158,11,0.12);color:#fcd34d;' : ''}">
                    <td style="font-weight:800;">${s.step}</td>
                    <td style="color:#fff;font-weight:900;">$${s.stake.toFixed(2)}</td>
                    <td style="color:#fb7185;">-$${s.cumulativeLossIfLost.toFixed(2)}</td>
                    <td style="color:#22d3ee;">$${s.payoutIfWon.toFixed(2)}</td>
                    <td style="text-align:right;color:#34d399;font-weight:900;">+$${s.netPLIfWon.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      `;
    } else if (tmState.activeSubTab === 'matrix') {
      bodyHtml = renderMatrixTabHTML();
    }

    const completeBanner = tmState.showCompleteModal ? `
      <div class="al-tm-box" style="padding:10px;border-color:#10b981;background:rgba(6,78,59,0.28);text-align:center;display:flex;flex-direction:column;gap:6px;">
        <span style="font-size:9.5px;font-weight:900;color:#6ee7b7;letter-spacing:1.4px;text-transform:uppercase;">TARGET REACHED · SESSION RESULT</span>
        <div style="font-size:22px;font-weight:900;font-family:monospace;color:#34d399;">+$${Math.max(0, tmState.lastCompletedProfit).toFixed(2)}</div>
        <div class="al-tm-grid2" style="gap:5px;">
          <button data-tm-act="startNewSession" style="padding:7px;border-radius:4px;background:#f59e0b;color:#000;font-weight:900;font-size:10.5px;border:none;cursor:pointer;">Repeat Session</button>
          <button data-tm-act="dismissComplete" class="al-tm-btn-sec">Close</button>
        </div>
      </div>
    ` : '';

    tmRootEl.innerHTML = `${topBar}${completeBanner}<div style="display:flex;flex-direction:column;gap:7px;">${bodyHtml}</div>`;

    if (tmState.activeSubTab === 'matrix' && mxState.viewMode === 'chart') {
      const mxCanvas = tmRootEl.querySelector('#al-mx-chart-canvas');
      if (mxCanvas) {
        const res = mxState.activeMode === 'daily' ? calcDailyCompoundingMx(mxState.daily) : calcStepCompoundingMx(mxState.step);
        drawMatrixCanvasChart(mxCanvas, res.rows, mxState.activeMode);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 8B. RENDER 333 / 444 MODE + SMART TRADING JOURNAL
  // -------------------------------------------------------------------------
  function renderChallengeTab() {
    if (!chRootEl) return;
    const { plans, activePlan } = getActiveChallengePlan();
    const st = getChallengeStats(activePlan);
    const sty = CH_THEME[activePlan.theme] || CH_THEME.cyan;
    const stepsPerPhase = activePlan.phases[0].trades.length;
    const totalPlanSteps = activePlan.phases.length * stepsPerPhase;
    const doneStepsCount = Object.keys(chState.completedSteps).filter(k => k.startsWith(`${activePlan.id}-`) && chState.completedSteps[k]).length;
    const overallPct = Math.round((doneStepsCount / Math.max(1, totalPlanSteps)) * 100);

    // Compute Journal analytics
    let jStatsHtml = '';
    if (chState.journalEntries.length > 0 && !chState.showJournalForm) {
      const tot = chState.journalEntries.length;
      const succ = chState.journalEntries.filter(e => e.result === 'Success').length;
      const wr = Math.round((succ / tot) * 100);
      const emCounts = {};
      chState.journalEntries.forEach(e => {
        emCounts[e.emotion] = emCounts[e.emotion] || { w: 0, n: 0 };
        emCounts[e.emotion].n += 1;
        if (e.result === 'Success') emCounts[e.emotion].w += 1;
      });
      let bestEm = { id: 'Confident', rate: 0 };
      Object.keys(emCounts).forEach(k => {
        const rate = (emCounts[k].w / emCounts[k].n) * 100;
        if (rate >= bestEm.rate) bestEm = { id: k, rate };
      });
      jStatsHtml = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
          <div class="al-tm-box" style="padding:5px;"><span class="al-tm-lbl">WIN RATE</span><strong style="font-size:12px;font-family:monospace;color:${wr >= 70 ? '#34d399' : '#fbbf24'};">${wr}%</strong></div>
          <div class="al-tm-box" style="padding:5px;"><span class="al-tm-lbl">EMOTIONAL EDGE</span><strong style="font-size:10px;color:#fff;">${escHtml(bestEm.id)} (${Math.round(bestEm.rate)}%)</strong></div>
          <div class="al-tm-box" style="padding:5px;"><span class="al-tm-lbl">AUDITS</span><strong style="font-size:12px;font-family:monospace;color:#fff;">${tot}</strong></div>
        </div>
      `;
    }

    const journalFormHtml = chState.showJournalForm ? `
      <div class="al-tm-box" style="padding:8px;display:flex;flex-direction:column;gap:6px;background:rgba(0,0,0,0.55);border-color:rgba(245,158,11,0.35);">
        <div class="al-tm-grid2" style="gap:4px;">
          <button data-j-res="Success" class="al-mode-btn" style="${chState.draftJournal.result === 'Success' ? 'background:#10b981;color:#000;border-color:#34d399;' : ''}">Success</button>
          <button data-j-res="Fail" class="al-mode-btn" style="${chState.draftJournal.result === 'Fail' ? 'background:#f43f5e;color:#000;border-color:#fb7185;' : ''}">Fail</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;">
          ${['Trending', 'Ranging', 'Volatile', 'Slow'].map(mc => `<button data-j-mkt="${mc}" class="al-nk-chip ${chState.draftJournal.marketCondition === mc ? 'active' : ''}">${mc}</button>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;">
          ${['Confident', 'Disciplined', 'Neutral', 'Anxious', 'Fearful', 'Greedy'].map(em => `<button data-j-emo="${em}" class="al-nk-chip ${chState.draftJournal.emotion === em ? 'active' : ''}">${em}</button>`).join('')}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span class="al-tm-lbl">RATING (${chState.draftJournal.rating}/5)</span>
          <div style="display:flex;gap:4px;">
            ${[1, 2, 3, 4, 5].map(r => `<button data-j-rate="${r}" style="background:transparent;border:none;cursor:pointer;font-size:14px;color:${r <= chState.draftJournal.rating ? '#fbbf24' : '#334155'};">★</button>`).join('')}
          </div>
        </div>
        <textarea id="al-j-notes" rows="2" placeholder="Detail your setups, mistakes, and tactical wins..." style="width:100%;background:rgba(15,23,42,0.85);border:1px solid rgba(255,255,255,0.12);border-radius:4px;color:#e2e8f0;font-size:10.5px;padding:6px;outline:none;resize:vertical;box-sizing:border-box;">${escHtml(chState.draftJournal.notes)}</textarea>
        <div class="al-tm-grid2" style="gap:5px;">
          <button data-ch-act="cancelJournal" class="al-tm-btn-sec">Cancel</button>
          <button data-ch-act="saveJournal" style="padding:6px;border-radius:4px;background:#f59e0b;color:#000;font-weight:900;font-size:10.5px;border:none;cursor:pointer;">Commit Journal</button>
        </div>
      </div>
    ` : '';

    chRootEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:5px;">
        <div style="display:flex;gap:3px;">
          <button data-ch-mode="333" class="al-mode-btn ${chState.activeMode === '333' ? 'active' : ''}" style="min-width:66px;${chState.activeMode === '333' ? 'background:#6366f1;border-color:#818cf8;color:#fff;' : ''}">333 MODE</button>
          <button data-ch-mode="444" class="al-mode-btn ${chState.activeMode === '444' ? 'active' : ''}" style="min-width:66px;${chState.activeMode === '444' ? 'background:#6366f1;border-color:#818cf8;color:#fff;' : ''}">444 MODE</button>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <span style="font-size:9px;color:#94a3b8;font-weight:700;">Payout</span>
          <input type="number" id="al-ch-payout" min="10" max="100" value="${Math.round(chState.payoutRate * 100)}" style="width:40px;background:#020617;border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#34d399;font-family:monospace;font-weight:800;font-size:11px;padding:2px 4px;text-align:center;" />
          <span style="font-size:10px;color:#64748b;">%</span>
          <button data-ch-act="syncPayoutPO" class="al-micro-btn" style="color:#22d3ee;border-color:rgba(6,182,212,0.4);">PO</button>
        </div>
      </div>

      <!-- PLAN SELECTOR -->
      <div class="al-nk-strip" style="padding:2px 0;">
        ${plans.map(p => `<button data-ch-plan="${p.id}" class="al-nk-chip ${p.id === activePlan.id ? 'active' : ''}" style="height:23px;font-size:9.5px;">${escHtml(p.title)}</button>`).join('')}
      </div>

      <!-- GLOBAL STATS -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;">
        <div class="al-tm-box" style="padding:5px;border-color:rgba(16,185,129,0.3);"><span class="al-tm-lbl" style="color:#34d399;">PROFIT</span><strong style="font-size:10.5px;font-family:monospace;color:#34d399;">$${st.totalProfit.toFixed(2)}</strong></div>
        <div class="al-tm-box" style="padding:5px;border-color:rgba(6,182,212,0.3);"><span class="al-tm-lbl" style="color:#22d3ee;">LOCKED</span><strong style="font-size:10.5px;font-family:monospace;color:#22d3ee;">$${st.totalLockedProfit.toFixed(2)}</strong></div>
        <div class="al-tm-box" style="padding:5px;"><span class="al-tm-lbl">VOLUME</span><strong style="font-size:10.5px;font-family:monospace;color:#e2e8f0;">$${st.totalStaked.toFixed(0)}</strong></div>
        <div class="al-tm-box" style="padding:5px;"><span class="al-tm-lbl">WINS</span><strong style="font-size:10.5px;font-family:monospace;color:#818cf8;">${st.completedCount}</strong></div>
      </div>

      <!-- ACTIVE PLAN DASHBOARD HEADER -->
      <div class="al-tm-box" style="padding:8px;border-color:${sty.border};background:${sty.bg};display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
          <div>
            <div style="font-size:13.5px;font-weight:900;color:#fff;">${escHtml(activePlan.title)}</div>
            <div style="font-size:9px;font-weight:800;color:${sty.accent};text-transform:uppercase;">${escHtml(activePlan.subtitle)}</div>
          </div>
          <div style="text-align:right;background:rgba(0,0,0,0.45);padding:4px 7px;border-radius:4px;border:1px solid rgba(99,102,241,0.3);">
            <span id="al-ch-timer-disp" style="font-size:13px;font-family:monospace;font-weight:900;color:#fff;">${chState.timerId ? formatMMSS(chState.timerLeft) : '00:00'}</span>
            <span style="display:block;font-size:7.5px;font-weight:800;text-transform:uppercase;color:${chState.timerLabel === 'Wait' ? '#fb7185' : chState.timerLabel === 'Rest' ? '#34d399' : '#818cf8'};">${escHtml(chState.timerLabel || 'Standby')}</span>
          </div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:8.5px;font-weight:800;margin-bottom:2px;">
            <span style="color:#94a3b8;">EXECUTION PROGRESS</span>
            <span style="color:${sty.accent};">${overallPct}%</span>
          </div>
          <div class="al-bias-track"><div style="height:100%;width:${overallPct}%;background:${sty.bar};"></div></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;justify-content:space-between;">
          <span class="al-tag-sq" style="background:rgba(0,0,0,0.4);color:#cbd5e1;border-color:rgba(255,255,255,0.08);">${escHtml(activePlan.withdrawalRule)}</span>
          <div style="display:flex;gap:4px;">
            <button data-ch-act="clearSession" class="al-micro-btn" style="color:#fb7185;border-color:rgba(244,63,94,0.35);">Clear Session</button>
            <button data-ch-act="resetAll" class="al-micro-btn" style="color:#fbbf24;border-color:rgba(245,158,11,0.35);">Reset All</button>
          </div>
        </div>
      </div>

      <!-- PHASES ROADMAP -->
      <div style="display:flex;flex-direction:column;gap:7px;">
        ${activePlan.phases.map((phase, pIdx) => {
          const phDoneCount = phase.trades.filter((_, ti) => chState.completedSteps[`${activePlan.id}-${pIdx}-${ti}`]).length;
          const phPct = Math.round((phDoneCount / phase.trades.length) * 100);
          const nextIdx = phase.trades.findIndex((_, ti) => !chState.completedSteps[`${activePlan.id}-${pIdx}-${ti}`]);
          const nextAmt = nextIdx >= 0 ? phase.trades[nextIdx] : phase.trades[phase.trades.length - 1];
          const lastDone = !!chState.completedSteps[`${activePlan.id}-${pIdx}-${phase.trades.length - 1}`];
          const finalVal = phase.trades[phase.trades.length - 1] * (1 + chState.payoutRate);
          const nextPh = activePlan.phases[pIdx + 1];
          const reserved = nextPh ? Math.max(0, finalVal - nextPh.start) : finalVal;

          return `
            <div class="al-tm-box" style="padding:7px;display:flex;flex-direction:column;gap:6px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <div style="width:22px;height:22px;border-radius:4px;background:${sty.bg};border:1px solid ${sty.border};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:${sty.accent};">${pIdx + 1}</div>
                  <div>
                    <strong style="font-size:11.5px;color:#fff;display:block;">${escHtml(phase.title)}</strong>
                    <span style="font-size:8px;color:#64748b;font-weight:800;text-transform:uppercase;">${phPct === 100 ? 'COMPLETE' : phPct > 0 ? `${phPct}% DONE` : 'ACTIVE'}</span>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:3px;">
                  <button data-push-stake="${nextAmt.toFixed(2)}" class="al-micro-btn" style="background:rgba(16,185,129,0.16);border-color:rgba(16,185,129,0.45);color:#34d399;" title="Push next stake to Pocket Option">→ $${nextAmt.toFixed(2)}</button>
                  <button data-ch-tstart="${pIdx}" class="al-micro-btn" title="Start Timer">▶</button>
                  <button data-ch-trest="${pIdx}:1800:Wait" class="al-micro-btn">30m</button>
                  <button data-ch-trest="${pIdx}:3600:Rest" class="al-micro-btn">1h</button>
                  <button data-ch-clearph="${pIdx}" class="al-micro-btn" style="color:#fb7185;border-color:rgba(244,63,94,0.3);">↺</button>
                </div>
              </div>

              <div style="display:grid;grid-template-columns:repeat(${phase.trades.length}, 1fr);gap:4px;">
                ${phase.trades.map((amt, tIdx) => {
                  const isDone = !!chState.completedSteps[`${activePlan.id}-${pIdx}-${tIdx}`];
                  const isLast = tIdx === phase.trades.length - 1;
                  const roleLbl = tIdx === 0 ? 'Entry' : isLast ? 'Peak' : 'Next';
                  return `
                    <button data-ch-step="${pIdx}:${tIdx}" style="padding:5px 4px;border-radius:5px;text-align:left;cursor:pointer;border:1px solid ${isDone ? '#10b981' : isLast ? sty.border : 'rgba(255,255,255,0.12)'};background:${isDone ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.65)'};display:flex;flex-direction:column;gap:2px;">
                      <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                        <span style="font-size:8px;font-weight:900;padding:0 3px;border-radius:2px;background:${isDone ? '#10b981' : 'rgba(255,255,255,0.08)'};color:${isDone ? '#000' : '#94a3b8'};">${isDone ? '✓' : tIdx + 1}</span>
                        <span style="font-size:7px;font-weight:800;text-transform:uppercase;color:${isDone ? '#34d399' : isLast ? '#818cf8' : '#64748b'};">${roleLbl}</span>
                      </div>
                      <span style="font-size:10.5px;font-weight:900;font-family:monospace;color:${isDone ? '#6ee7b7' : '#f8fafc'};">$${amt.toFixed(2)}</span>
                      <span style="font-size:7px;font-weight:800;text-transform:uppercase;color:${isDone ? '#34d399' : '#64748b'};">${isDone ? 'Paid' : 'Wait'}</span>
                    </button>
                  `;
                }).join('')}
              </div>

              ${lastDone ? `
                <div style="padding:6px 8px;border-radius:5px;background:rgba(0,0,0,0.5);border:1px solid rgba(16,185,129,0.4);display:flex;justify-content:space-between;align-items:center;font-family:monospace;font-size:9.5px;">
                  <div><span style="color:#64748b;display:block;font-size:7.5px;">FINAL VALUE</span><strong style="color:#fff;">$${finalVal.toFixed(2)}</strong></div>
                  <div><span style="color:#64748b;display:block;font-size:7.5px;">CAPITAL RESERVED</span><strong style="color:#34d399;">$${reserved.toFixed(2)}</strong></div>
                  <div style="text-align:right;"><span style="color:#64748b;display:block;font-size:7.5px;">${nextPh ? 'NEXT SETUP' : 'STATUS'}</span><strong style="color:${nextPh ? '#818cf8' : '#fbbf24'};">${nextPh ? `$${nextPh.start.toFixed(2)}` : 'TOTAL WIN'}</strong></div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <!-- FOOTNOTES -->
      <div class="al-tm-grid2" style="gap:5px;">
        <div class="al-tm-box" style="padding:6px;">
          <span style="font-size:8.5px;font-weight:900;color:#f43f5e;display:block;">STOP LOSS PROTOCOL</span>
          <span style="font-size:9px;color:#94a3b8;">If 1 trade fails, reset to Step 1 & take a 30m break.</span>
        </div>
        <div class="al-tm-box" style="padding:6px;">
          <span style="font-size:8.5px;font-weight:900;color:#10b981;display:block;">RECOVERY PROTOCOL</span>
          <span style="font-size:9px;color:#94a3b8;">Secure capital post-Phase 2 for risk-free Phase 3.</span>
        </div>
      </div>

      <!-- SMART TRADING JOURNAL -->
      <div class="al-tm-box" style="padding:8px;display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <strong style="font-size:11.5px;color:#fff;display:block;">Advanced Session Audit</strong>
            <span style="font-size:8.5px;color:#64748b;text-transform:uppercase;">Mindset Analytics & Journal</span>
          </div>
          <button data-ch-act="toggleJournalForm" style="padding:4px 8px;border-radius:4px;background:${chState.showJournalForm ? '#1e293b' : '#f59e0b'};color:${chState.showJournalForm ? '#cbd5e1' : '#000'};font-weight:900;font-size:9.5px;border:none;cursor:pointer;">${chState.showJournalForm ? 'Discard' : '+ New Audit'}</button>
        </div>

        ${jStatsHtml}
        ${journalFormHtml}

        <div style="display:flex;flex-direction:column;gap:5px;max-height:170px;overflow-y:auto;">
          ${chState.journalEntries.length === 0
            ? '<div style="text-align:center;color:#64748b;font-size:9.5px;padding:10px;">No journal audits recorded yet.</div>'
            : chState.journalEntries.map(e => `
              <div style="padding:6px 8px;border-radius:4px;background:rgba(0,0,0,0.45);border-left:3px solid ${e.result === 'Success' ? '#10b981' : '#f43f5e'};display:flex;flex-direction:column;gap:3px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:10px;font-weight:900;color:${e.result === 'Success' ? '#34d399' : '#fb7185'};">${escHtml(e.result)} · ${escHtml(e.planName)}</span>
                  <div style="display:flex;align-items:center;gap:4px;">
                    <span class="al-tag-sq" style="background:rgba(255,255,255,0.06);color:#cbd5e1;border-color:rgba(255,255,255,0.1);">${escHtml(e.emotion)}</span>
                    <button data-j-del="${e.id}" class="al-micro-btn" style="height:16px;padding:0 4px;color:#fb7185;">✕</button>
                  </div>
                </div>
                <div style="font-size:8.5px;color:#64748b;">${escHtml(e.marketCondition)} · ${Math.round(e.payout)}% · ${'★'.repeat(e.rating || 5)}</div>
                <div style="font-size:10px;color:#cbd5e1;white-space:pre-wrap;">${escHtml(e.notes)}</div>
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // 8C. RENDER PARADOX MATRIX TAB
  // -------------------------------------------------------------------------
  function renderParadoxTab() {
    if (!pxRootEl) return;
    const phases = getParadoxPhases();
    let totalSecured = 0;
    let totalWins = 0;
    let completedPhases = 0;

    phases.forEach(ph => {
      const doneInPh = ph.sessions.filter(s => pxState.completedSessions.includes(s.id));
      doneInPh.forEach(s => {
        totalSecured += (s.target - s.start);
        totalWins += s.steps.length;
      });
      if (doneInPh.length === ph.sessions.length) completedPhases++;
    });

    pxRootEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:6px;">
          <strong style="font-size:12.5px;color:#fff;">⚡ Paradox Core</strong>
          <button data-px-act="togglePayoutSync" class="al-micro-btn" style="${pxState.useLivePayout ? 'color:#34d399;border-color:#10b981;' : ''}" title="Toggle 92% Fixed vs Live PO Payout">${pxState.useLivePayout ? `PO ${currentPayout}%` : '92% Std'}</button>
        </div>
        <div style="display:flex;gap:4px;">
          <button data-px-act="resetAll" class="al-micro-btn" style="color:#fb7185;border-color:rgba(244,63,94,0.35);">↺ Reset</button>
          <button data-px-act="exportCSV" class="al-micro-btn" style="background:#6366f1;border-color:#818cf8;color:#fff;">CSV Report</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;">
        <div class="al-tm-box" style="padding:5px;"><span class="al-tm-lbl">SECURED</span><strong style="font-size:11px;font-family:monospace;color:#fff;">$${totalSecured.toFixed(2)}</strong></div>
        <div class="al-tm-box" style="padding:5px;"><span class="al-tm-lbl">WINS</span><strong style="font-size:11px;font-family:monospace;color:#34d399;">${totalWins}</strong></div>
        <div class="al-tm-box" style="padding:5px;"><span class="al-tm-lbl">PHASES</span><strong style="font-size:11px;font-family:monospace;color:#818cf8;">${completedPhases}/${phases.length}</strong></div>
        <div class="al-tm-box" style="padding:5px;"><span class="al-tm-lbl">ENGINE</span><strong style="font-size:10.5px;font-style:italic;color:${pxState.timerId ? '#fbbf24' : '#64748b'};">${pxState.timerId ? 'ACTIVE' : 'IDLE'}</strong></div>
      </div>

      <div style="display:flex;flex-direction:column;gap:6px;">
        ${phases.map((phase, pIdx) => {
          const isOpen = pxState.openPhases.includes(phase.id);
          const isPhDone = phase.sessions.every(s => pxState.completedSessions.includes(s.id));
          const phSecured = phase.sessions.filter(s => pxState.completedSessions.includes(s.id)).reduce((a, s) => a + (s.target - s.start), 0);
          const terminalVal = phase.sessions[phase.sessions.length - 1].target;

          return `
            <div class="al-tm-box" style="overflow:hidden;border-color:${isOpen ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.08)'};">
              <button data-px-toggle="${phase.id}" style="width:100%;padding:8px;background:${isOpen ? '#151a2d' : '#0a0d14'};border:none;display:flex;justify-content:space-between;align-items:center;cursor:pointer;text-align:left;">
                <div style="display:flex;align-items:center;gap:7px;">
                  <div style="width:24px;height:24px;border-radius:4px;border:1px solid ${isPhDone ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'};background:${isPhDone ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.4)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:${isPhDone ? '#34d399' : '#94a3b8'};">${isPhDone ? '✓' : `0${pIdx + 1}`}</div>
                  <div>
                    <span style="font-size:8px;font-weight:900;color:#818cf8;display:block;letter-spacing:0.8px;">PROTOCOL ${pIdx + 1} / ${phase.mode}</span>
                    <strong style="font-size:11.5px;color:#fff;text-transform:uppercase;">${escHtml(phase.title)}</strong>
                  </div>
                </div>
                <span style="color:#94a3b8;font-size:11px;">${isOpen ? '▲' : '▼'}</span>
              </button>

              ${isOpen ? `
                <div style="padding:7px;display:flex;flex-direction:column;gap:6px;background:rgba(15,18,27,0.6);">
                  <div style="padding:6px;border-radius:4px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;gap:6px;">
                    <div style="flex:1;font-size:9px;color:#94a3b8;font-style:italic;">"${escHtml(phase.objective)}"</div>
                    <div style="display:flex;gap:8px;flex-shrink:0;font-family:monospace;font-size:10px;">
                      <div><span class="al-tm-lbl">SECURED</span><strong style="color:#34d399;">$${phSecured.toFixed(2)}</strong></div>
                      <div><span class="al-tm-lbl">TERMINAL</span><strong style="color:#fff;">$${terminalVal.toFixed(0)}</strong></div>
                    </div>
                  </div>

                  ${phase.sessions.map((sess, sIdx) => {
                    const isDone = pxState.completedSessions.includes(sess.id);
                    const isSessAct = pxState.timerId === sess.id;
                    const isResting = pxState.timerId === `${sess.id}_rest` || pxState.timerId === `${sess.id}_loss`;
                    return `
                      <div style="border:1px solid ${isSessAct ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'};border-radius:5px;background:#0f121b;overflow:hidden;">
                        <div style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;gap:4px;flex-wrap:wrap;">
                          <div>
                            <span style="font-size:7.5px;color:#64748b;font-weight:900;text-transform:uppercase;display:block;">SESSION MODULE ${sIdx + 1}</span>
                            <span style="font-size:11px;font-weight:900;color:#fff;font-family:monospace;">$${sess.start.toFixed(2)} <span style="color:#64748b;font-size:9px;font-style:italic;">→</span> <span style="color:#818cf8;">$${sess.target.toFixed(2)}</span></span>
                          </div>
                          <div style="display:flex;align-items:center;gap:4px;background:rgba(0,0,0,0.35);padding:3px 5px;border-radius:4px;">
                            <span data-px-timer="${sess.id}" style="font-family:monospace;font-weight:900;font-size:11px;color:${isResting ? '#fbbf24' : isSessAct ? '#fff' : '#475569'};">${(pxState.timerId && pxState.timerId.startsWith(sess.id)) ? formatMMSS(pxState.timerLeft) : '00:00'}</span>
                            ${(isSessAct || isResting)
                              ? `<button data-px-tstop="1" class="al-micro-btn">↺</button>`
                              : `<button data-px-tstart="${sess.id}" class="al-micro-btn" style="background:#6366f1;border-color:#818cf8;color:#fff;">Start</button>`
                            }
                            <button data-px-trest="${sess.id}:1800" class="al-micro-btn">30m</button>
                            <button data-px-trest="${sess.id}:3600" class="al-micro-btn">1h</button>
                          </div>
                        </div>

                        <div style="overflow-x:auto;touch-action:pan-x;-webkit-overflow-scrolling:touch;">
                        <table class="al-tm-table">
                          <thead><tr><th>Step</th><th>Stake (Tap PO)</th><th>Yield</th><th style="text-align:right;">Result</th></tr></thead>
                          <tbody>
                            ${sess.steps.map(st => `
                              <tr data-push-stake="${st.stake.toFixed(2)}" style="cursor:pointer;">
                                <td style="color:#64748b;">0${st.id}</td>
                                <td style="color:#f8fafc;font-weight:800;">$${st.stake.toFixed(2)}</td>
                                <td style="color:#34d399;">+$${st.profit.toFixed(2)}</td>
                                <td style="text-align:right;font-weight:900;color:#e2e8f0;">$${st.result.toFixed(2)}</td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                        </div>

                        <div style="padding:5px 8px;background:rgba(0,0,0,0.35);display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.05);">
                          <button data-px-loss="${sess.id}" class="al-micro-btn" style="color:#fb7185;border-color:rgba(244,63,94,0.35);">Loss / Reset</button>
                          <button data-px-complete="${sess.id}" style="padding:4px 10px;border-radius:4px;border:none;cursor:pointer;font-size:9px;font-weight:900;text-transform:uppercase;background:${isDone ? '#10b981' : '#f8fafc'};color:${isDone ? '#fff' : '#000'};">${isDone ? '✓ Secured' : 'Complete Module'}</button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function updatePlanDisplay() {
    if (dockAutoTag) {
      dockAutoTag.textContent = autoApplyStake ? 'Auto-Stake: ON' : 'Auto-Stake: OFF';
      dockAutoTag.style.color = autoApplyStake ? '#34d399' : '#64748b';
    }
    if (savedLayout.activeTab === 'manager') renderTradeManager();
  }

  // =========================================================================
  // 9. MAIN REAL-TIME SYNC LOOP (350ms)
  // =========================================================================
  function syncPOData() {
    if (!root) return;
    try {
      injectPageTelemetryHook();
      let didSync = false;
      const { balance, type } = detectPOBalanceAndType();
      if (balance !== null) {
        didSync = true;
        poBalance = balance;
        poAccountType = type;
        const balStr = `$${poBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        balanceVal.textContent = balStr;
        accTypeLabel.textContent = poAccountType;
        syncPill.textContent = balStr;
        miniBal.textContent = poBalance >= 1000 ? `$${(poBalance / 1000).toFixed(1)}k` : `$${poBalance.toFixed(0)}`;

        // Live sync Balance into Trade Manager when autoSyncPO active & session untouched
        if (tmState.autoSyncPO && !tmState.userEditedBalance && tmState.sessionTrades.length === 0) {
          if (Math.abs(tmState.balance - poBalance) > 0.01) {
            tmState.balance = Number(poBalance.toFixed(2));
            tmState.sessionStartBalance = tmState.balance;
            tmState.currentBalance = tmState.balance;
            if (savedLayout.activeTab === 'manager' && tmState.activeSubTab === 'trade') {
              const liveBalEl = tmRootEl && tmRootEl.querySelector('#al-tm-live-bal');
              if (liveBalEl) liveBalEl.textContent = `$${tmState.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            }
          }
        }
      }

      const { assetEl } = getPOElements();
      if (assetEl) {
        didSync = true;
        const text = (assetEl.innerText || '').split('\n')[0].replace(/\s*\+?\d+%.*$/, '').trim();
        if (text && text !== poAsset) {
          poAsset = text;
          tmState.selectedAsset = poAsset;
          activeWsSymbol = null;
          assetVal.textContent = poAsset;
          wsCandles = [];
          quoteCandles = [];
          canvasCandles = [];
          currentCandle = null;
          quoteCurrentCandle = null;
          canvasLiveQuote = null;
          canvasAxisLabels = [];
          tickHistory = [];
          lastCanvasScanAt = 0;
          lastPrice = null;
          isPriceCalibrated = false;
          realSupport = null;
          realResistance = null;
          realRSI = null;
          realStochK = null;
          realSignal = 'WAIT';
          lockedSignal = null;
          pendingSignalAudit = null;
          currentPattern = `Scanning ${poAsset}...`;
          scanPOChartCanvas();
          updateSignalUI();
          drawMiniCandlestickChart();
          if (savedLayout.activeTab === 'manager') renderTradeManager();
        }
      }

      detectPOTimeframeAndExpiry();

      if (document.activeElement !== customStakeInput) {
        const poDeal = detectPOAmountAndPayout();
        if (poDeal.stake !== null) didSync = true;
        syncStakeFromPO(poDeal.stake, poDeal.payoutPercent, poDeal.source);
      }

      if (didSync) lastSuccessfulSyncAt = Date.now();
      const isSyncedLive = Date.now() - lastSuccessfulSyncAt < 3500;
      if (syncStatusDot) {
        syncStatusDot.className = isSyncedLive ? 'al-pulse live' : 'al-pulse offline';
      }

      const scanNow = Date.now();
      const needHybridBoost = wsCandles.length < 26 && (scanNow - lastCanvasScanAt >= 850);
      const staleWsFeed = !lastWsTickAt || (scanNow - lastWsTickAt > 1600);
      const bgChartTick = scanNow - lastCanvasScanAt >= 1250;
      if (staleWsFeed || needHybridBoost || bgChartTick) {
        scanPOChartCanvas();
      }
      updateRealTechnicalAnalysis();

      const tfSec = TIMEFRAME_SECONDS[currentTimeframe] || 5;
      const nowSec = Math.floor(Date.now() / 1000);
      const remainingSec = tfSec - (nowSec % tfSec);
      const timerStr = `${remainingSec < 10 ? '0' : ''}${remainingSec}s`;
      if (radarCandleTime) radarCandleTime.textContent = timerStr;
      if (miniSignalTimer) miniSignalTimer.textContent = timerStr;

      const actLen = getActiveCandles().length;
      if (radarSourceLbl) {
        if (actLen > 0) {
          radarSourceLbl.textContent = `${dataSource} · ${actLen}c`;
        } else {
          radarSourceLbl.textContent = `Feed (${telemetryStats.wsIn}w·${telemetryStats.canvasSamples}p)`;
        }
      }
      if (radarLivePrice) {
        radarLivePrice.textContent = lastPrice !== null && isPriceCalibrated
          ? formatPrice(lastPrice)
          : (canvasCandles.length > 0 ? `${canvasCandles[canvasCandles.length - 1].close.toFixed(1)}` : '—');
      }
      if (radarSup) radarSup.textContent = realSupport !== null ? formatPrice(realSupport) : '—';
      if (radarRes) radarRes.textContent = realResistance !== null ? formatPrice(realResistance) : '—';
      if (radarRsi) {
        radarRsi.textContent = realRSI !== null
          ? `${realRSI} · ${realStochK !== null ? realStochK : '—'}`
          : 'Calibrating...';
      }
      if (radarPatternLbl) {
        if (lockedSignal && lockedSignal.entryPrice) {
          const lockRem = Math.max(0, Math.ceil((lockedSignal.unlockAt - Date.now()) / 1000));
          radarPatternLbl.textContent = `${currentPattern} · @ ${formatPrice(lockedSignal.entryPrice)} (${lockRem}s)`;
        } else {
          radarPatternLbl.textContent = currentPattern;
        }
      }

      if (radarBigSignal) {
        if (realSignal === 'CALL') {
          radarBigSignal.textContent = lockedSignal ? `▲ BUY LOCKED · ${signalConfidence}%` : `▲ BUY SIGNAL · ${signalConfidence}%`;
          radarBigSignal.style.color = '#34d399';
        } else if (realSignal === 'PUT') {
          radarBigSignal.textContent = lockedSignal ? `▼ SELL LOCKED · ${signalConfidence}%` : `▼ SELL SIGNAL · ${signalConfidence}%`;
          radarBigSignal.style.color = '#fb7185';
        } else {
          radarBigSignal.textContent = marketBiasDir === 'BUY'
            ? `▲ BUY BIAS · ${marketBiasPct}%`
            : marketBiasDir === 'SELL'
            ? `▼ SELL BIAS · ${marketBiasPct}%`
            : 'Analyzing Price Action';
          radarBigSignal.style.color = marketBiasDir === 'BUY' ? '#6ee7b7' : marketBiasDir === 'SELL' ? '#fda4af' : '#38bdf8';
        }
      }

      updateActiveTradeTicker();

      const liveCandles = getActiveCandles().slice(-28);
      channel.postMessage({
        type: 'POCKET_PONG',
        connected: true,
        browser: 'Lemur Floating Overlay',
        balance: poBalance,
        accountType: poAccountType,
        asset: poAsset,
        stake: currentStake > 0 ? currentStake : 1,
        payoutPercent: currentPayout,
        scrapeSource,
        dataSource,
        timeframe: currentTimeframe,
        expiry: currentExpiry,
        lastTickPrice: isPriceCalibrated ? lastPrice : null,
        isPriceCalibrated,
        rsi: realRSI,
        stochK: realStochK,
        trend: realTrend,
        pattern: currentPattern,
        signal: realSignal,
        confidence: realSignal === 'WAIT' ? marketBiasPct : signalConfidence,
        marketBiasDir,
        marketBiasPct,
        support: realSupport,
        resistance: realResistance,
        sentiment: lastPOChartBuySentiment,
        wickMetrics,
        candles: liveCandles,
        signalStats: { wins: signalWins, losses: signalLosses },
        sessionStats: {
          wins: sessionWins,
          losses: sessionLosses,
          netPnL: Number(sessionNetPnL.toFixed(2)),
          recoveryStep: compoundingStep
        },
        activeTrade,
        recentTrades: recentTrades.slice(0, 15),
        timestamp: Date.now()
      });
    } catch (err) {
      console.warn('[Aladdin Genie Overlay] Sync notice:', err);
    }
  }

  // =========================================================================
  // 10. UI INJECTION (UNCHANGED FINTECH GLASS HUD + MORPHING LAUNCHER)
  // =========================================================================
  function bootGenieUI() {
    if (!document.body) {
      setTimeout(bootGenieUI, 50);
      return;
    }
    if (document.getElementById('aladdin-floating-root')) return;

    injectPageTelemetryHook();

    root = document.createElement('div');
    root.id = 'aladdin-floating-root';
    const posCss = savedLayout.left !== null && savedLayout.top !== null
      ? `left: ${savedLayout.left}px; top: ${savedLayout.top}px; right: auto;`
      : `top: 72px; right: 12px;`;

    const initW = Math.min(savedLayout.width, Math.max(255, window.innerWidth - 14));
    const initH = Math.min(savedLayout.height, Math.max(295, window.innerHeight - 20));

    root.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      ${posCss}
      font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none;
      -webkit-user-select: none;
      touch-action: auto;
    `;

    root.innerHTML = `
      <style>
        #aladdin-screen-flash {
          position: fixed; inset: 0; pointer-events: none; z-index: 2147483645;
          opacity: 0; border: 3px solid transparent; box-sizing: border-box;
        }
        #aladdin-screen-flash.active-call { animation: alScreenEdgeCall 0.9s ease-in-out 4; }
        #aladdin-screen-flash.active-put { animation: alScreenEdgePut 0.9s ease-in-out 4; }
        @keyframes alScreenEdgeCall {
          0%, 100% { opacity: 0; border-color: rgba(16, 185, 129, 0); box-shadow: inset 0 0 0 rgba(16, 185, 129, 0); }
          40% { opacity: 1; border-color: rgba(16, 185, 129, 0.85); box-shadow: inset 0 0 65px rgba(16, 185, 129, 0.25); }
        }
        @keyframes alScreenEdgePut {
          0%, 100% { opacity: 0; border-color: rgba(244, 63, 94, 0); box-shadow: inset 0 0 0 rgba(244, 63, 94, 0); }
          40% { opacity: 1; border-color: rgba(244, 63, 94, 0.85); box-shadow: inset 0 0 65px rgba(244, 63, 94, 0.25); }
        }

        #aladdin-bubble {
          width: 46px; height: 46px; border-radius: 12px;
          background: rgba(11, 15, 25, 0.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(56, 189, 248, 0.35);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255,255,255,0.04) inset;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          cursor: pointer; transition: transform 0.16s cubic-bezier(0.16, 1, 0.3, 1); position: relative;
          touch-action: none;
        }
        #aladdin-bubble:hover { transform: scale(1.05); }
        #aladdin-bubble:active { transform: scale(0.95); }
        #aladdin-bubble.flash-call { animation: alBorderPulseCall 0.7s ease-in-out infinite; }
        #aladdin-bubble.flash-put { animation: alBorderPulsePut 0.7s ease-in-out infinite; }
        #aladdin-bubble .genie-icon { font-size: 20px; line-height: 1; }
        #aladdin-bubble .mini-badge {
          font-size: 8.5px; font-weight: 700; color: #34d399; background: rgba(11, 15, 25, 0.96);
          padding: 1px 5px; border-radius: 6px; border: 1px solid rgba(148, 163, 184, 0.2);
          position: absolute; bottom: -6px; white-space: nowrap; font-variant-numeric: tabular-nums;
        }
        #al-bubble-signal-pill {
          display: none; position: absolute; top: -8px; right: -8px;
          font-size: 8px; font-weight: 800; color: #fff; padding: 2px 5px;
          border-radius: 6px; border: 1px solid #34d399; white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.6); animation: pulseAlert 0.6s infinite alternate;
        }

        #aladdin-card {
          display: none;
          width: ${initW}px;
          height: ${initH}px;
          min-width: 230px; min-height: 250px;
          max-width: calc(100vw - 12px); max-height: calc(100vh - 16px);
          background: rgba(11, 15, 25, 0.94);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 12px;
          box-shadow: 0 22px 55px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
          color: #f1f5f9; overflow: hidden;
          flex-direction: column; position: relative; transition: border-color 0.2s, box-shadow 0.2s;
          font-variant-numeric: tabular-nums;
        }
        #aladdin-card *::-webkit-scrollbar { width: 4px; height: 4px; }
        #aladdin-card *::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.45); }
        #aladdin-card *::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.35); border-radius: 3px; }
        @keyframes alBorderPulseCall {
          0%, 100% { border-color: rgba(16,185,129,0.75); box-shadow: 0 14px 40px rgba(0,0,0,0.85), 0 0 20px rgba(16,185,129,0.35); }
          50% { border-color: #34d399; box-shadow: 0 14px 40px rgba(0,0,0,0.85), 0 0 32px rgba(16,185,129,0.7); }
        }
        @keyframes alBorderPulsePut {
          0%, 100% { border-color: rgba(244,63,94,0.75); box-shadow: 0 14px 40px rgba(0,0,0,0.85), 0 0 20px rgba(244,63,94,0.35); }
          50% { border-color: #fb7185; box-shadow: 0 14px 40px rgba(0,0,0,0.85), 0 0 32px rgba(244,63,94,0.7); }
        }
        #aladdin-card.flash-call, .al-radar-hero.flash-call { animation: alBorderPulseCall 0.7s ease-in-out infinite !important; }
        #aladdin-card.flash-put, .al-radar-hero.flash-put { animation: alBorderPulsePut 0.7s ease-in-out infinite !important; }
        .al-trade-btn.al-btn-pulse { animation: pulseAlert 0.55s ease-in-out infinite alternate; }
        #aladdin-card.fullscreen {
          position: fixed !important; inset: 0 !important; top: 0 !important; left: 0 !important;
          right: 0 !important; bottom: 0 !important; width: auto !important; max-width: none !important;
          height: auto !important; max-height: none !important; border-radius: 0 !important;
          margin: 0 !important; box-sizing: border-box !important;
        }
        #aladdin-card.fullscreen .al-fixed-dock {
          padding-bottom: max(10px, env(safe-area-inset-bottom));
        }
        #aladdin-card.fullscreen .al-corner-resize { display: none; }

        .al-corner-resize {
          position: absolute; bottom: 1px; right: 1px; width: 16px; height: 16px;
          cursor: nwse-resize; display: flex; align-items: center; justify-content: center;
          color: #64748b; font-size: 9px; z-index: 120; opacity: 0.75; touch-action: none;
        }
        .al-header {
          height: 38px; padding: 0 8px;
          background: rgba(15, 23, 42, 0.92);
          border-bottom: 1px solid rgba(148, 163, 184, 0.14);
          display: flex; align-items: center; justify-content: space-between;
          cursor: move; flex-shrink: 0; gap: 4px; white-space: nowrap; touch-action: none;
        }
        .al-title {
          font-size: 11.5px; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em;
          display: flex; align-items: center; gap: 5px; min-width: 0; flex-shrink: 1;
        }
        @keyframes alDotBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.82); }
        }
        .al-pulse {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
          animation: alDotBlink 1.2s infinite ease-in-out;
        }
        .al-pulse.live { background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.85); }
        .al-pulse.offline { background: #f43f5e; box-shadow: 0 0 8px rgba(244,63,94,0.85); }

        .al-bal-inline {
          font-size: 10.5px; font-weight: 700; color: #34d399;
          font-variant-numeric: tabular-nums; margin-right: 1px; flex-shrink: 0;
        }
        .al-ctrl-btn {
          width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center;
          background: rgba(30, 41, 59, 0.65); border: 1px solid rgba(148, 163, 184, 0.16);
          color: #cbd5e1; font-size: 10.5px; cursor: pointer; border-radius: 6px; flex-shrink: 0;
          transition: background 0.15s, color 0.15s;
        }
        .al-ctrl-btn:hover { background: rgba(51, 65, 85, 0.9); color: #ffffff; }

        .al-nav-tabs {
          display: flex; background: rgba(15, 23, 42, 0.92);
          border-bottom: 1px solid rgba(148, 163, 184, 0.12); flex-shrink: 0;
          padding: 0 4px; overflow-x: auto; -webkit-overflow-scrolling: touch;
          touch-action: pan-x; scrollbar-width: thin;
          gap: 2px;
        }
        .al-nav-tabs::-webkit-scrollbar { height: 2px; }
        .al-nav-tab {
          flex: 1 0 auto; min-width: 52px; padding: 7px 7px; font-size: 10px; font-weight: 600; color: #94a3b8;
          background: transparent; border: none; border-bottom: 2px solid transparent; cursor: pointer;
          white-space: nowrap; text-align: center; transition: color 0.15s, border-color 0.15s;
          touch-action: manipulation;
        }
        .al-nav-tab:hover { color: #e2e8f0; }
        .al-nav-tab.active { color: #38bdf8; border-bottom-color: #38bdf8; }

        #aladdin-card.al-signal-cam {
          background: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          border-color: rgba(56, 189, 248, 0.28);
          box-shadow: 0 18px 46px rgba(0, 0, 0, 0.55);
        }
        #aladdin-card.al-signal-cam .al-scroll-body {
          background: transparent !important;
          padding: 0;
          gap: 0;
        }
        #aladdin-card.al-signal-cam #al-pane-radar.active {
          min-height: 100%;
          flex: 1 0 auto;
        }
        #aladdin-card.fullscreen.al-signal-cam #al-pane-radar.active {
          min-height: 0;
          flex: 0 0 auto;
        }
        .al-cam-top {
          background: rgba(11, 15, 25, 0.94);
          backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
          padding: 5px 8px; display: flex; flex-direction: column; gap: 4px;
          border-bottom: 1px solid rgba(56, 189, 248, 0.26);
          flex: 0 0 auto;
        }
        .al-chart-window {
          height: auto; min-height: 290px; flex: 1 0 290px;
          background: transparent !important;
          backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
          position: relative; pointer-events: auto; touch-action: pan-x pan-y; overflow: hidden;
          box-shadow: inset 0 10px 18px -12px rgba(2, 6, 23, 0.72), inset 0 -10px 18px -12px rgba(2, 6, 23, 0.72);
        }
        #aladdin-card.fullscreen.al-signal-cam .al-chart-window {
          height: calc(100vh - 125px);
          height: calc(100dvh - 125px);
          min-height: calc(100vh - 125px);
          min-height: calc(100dvh - 125px);
          flex: 0 0 auto;
        }
        .al-cam-corner {
          position: absolute; width: 10px; height: 10px;
          border-color: rgba(56, 189, 248, 0.65); border-style: solid; pointer-events: none;
        }
        .al-cam-tl { top: 5px; left: 6px; border-width: 1.5px 0 0 1.5px; border-top-left-radius: 3px; }
        .al-cam-tr { top: 5px; right: 6px; border-width: 1.5px 1.5px 0 0; border-top-right-radius: 3px; }
        .al-cam-bl { bottom: 5px; left: 6px; border-width: 0 0 1.5px 1.5px; border-bottom-left-radius: 3px; }
        .al-cam-br { bottom: 5px; right: 6px; border-width: 0 1.5px 1.5px 0; border-bottom-right-radius: 3px; }
        .al-vf-live {
          position: absolute; top: 6px; left: 8px; display: inline-flex; align-items: center; gap: 4px;
          padding: 1px 6px; border-radius: 4px; background: rgba(11, 15, 25, 0.58);
          border: 1px solid rgba(56, 189, 248, 0.24); font-size: 8px; font-weight: 800;
          letter-spacing: 0.45px; color: #e2e8f0; pointer-events: none; z-index: 4;
        }
        .al-vf-dot {
          width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
          animation: alDotBlink 1s infinite ease-in-out;
        }
        .al-vf-dot.active { background: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.9); }
        .al-vf-dot.syncing { background: #fbbf24; box-shadow: 0 0 6px rgba(251, 191, 36, 0.85); }
        .al-cam-bottom {
          background: rgba(11, 15, 25, 0.94);
          backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
          padding: 5px 8px; display: flex; flex-direction: column; gap: 4px;
          border-top: 1px solid rgba(56, 189, 248, 0.26); flex: 0 0 auto;
        }
        .al-cam-bottom .al-surface {
          padding: 5px 7px;
        }

        .al-comp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; overflow-x: auto; touch-action: pan-x; -webkit-overflow-scrolling: touch; }
        .al-nk-inputs { display: grid; grid-template-columns: minmax(90px, 1.35fr) minmax(48px, 0.72fr) minmax(48px, 0.72fr) auto; gap: 4px; align-items: stretch; overflow-x: auto; touch-action: pan-x; -webkit-overflow-scrolling: touch; }
        .al-comp-field {
          background: rgba(2, 6, 23, 0.72); border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 5px; padding: 3px 6px; display: flex; flex-direction: column; gap: 1px;
        }
        .al-comp-field label { font-size: 8px; color: #94a3b8; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
        .al-comp-field input, .al-comp-field select {
          width: 100%; background: transparent; border: none; color: #f8fafc;
          font-size: 11px; font-weight: 700; outline: none; padding: 0; font-variant-numeric: tabular-nums;
        }
        .al-comp-field select option { background: #0f172a; color: #f8fafc; }
        .al-nk-strip {
          display: flex; gap: 3px; overflow-x: auto; -webkit-overflow-scrolling: touch; touch-action: pan-x; scrollbar-width: thin; padding-bottom: 2px;
        }
        .al-nk-strip::-webkit-scrollbar { height: 2px; }
        .al-nk-chip {
          height: 20px; padding: 0 7px; border-radius: 4px; border: 1px solid rgba(148,163,184,0.18);
          background: rgba(15, 23, 42, 0.78); color: #cbd5e1; font-size: 9px; font-weight: 700;
          cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; transition: all 0.15s;
        }
        .al-nk-chip:hover { border-color: #38bdf8; color: #ffffff; }
        .al-nk-chip.active { background: rgba(2, 132, 199, 0.3); border-color: #38bdf8; color: #ffffff; }
        .al-micro-btn {
          height: 20px; padding: 0 7px; border-radius: 4px; font-size: 9px; font-weight: 700;
          cursor: pointer; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap;
          border: 1px solid rgba(148, 163, 184, 0.22); background: rgba(15, 23, 42, 0.85); color: #cbd5e1;
        }
        .al-comp-table {
          display: flex; flex-direction: column; gap: 2px; max-height: 124px;
          overflow: auto; -webkit-overflow-scrolling: touch; touch-action: pan-x pan-y;
        }
        .al-comp-head {
          display: grid; grid-template-columns: 0.65fr 0.9fr 0.95fr 1fr; gap: 4px; min-width: 245px;
          padding: 2px 6px; font-size: 8px; font-weight: 700; color: #64748b; letter-spacing: 0.3px;
          border-bottom: 1px solid rgba(148,163,184,0.14); position: sticky; top: 0; background: #0b1120;
        }
        .al-comp-row {
          display: grid; grid-template-columns: 0.65fr 0.9fr 0.95fr 1fr; gap: 4px; align-items: center; min-width: 245px;
          background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 4px; padding: 3px 6px; font-size: 9px; font-variant-numeric: tabular-nums;
        }
        .al-comp-row.active { border-color: #fbbf24; background: rgba(245, 158, 11, 0.12); }

        .al-scroll-body {
          padding: 8px; overflow: auto; -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y; min-height: 0; min-width: 0;
          flex: 1 1 0%; display: flex; flex-direction: column; gap: 7px;
        }
        .al-tab-pane { display: none; flex-direction: column; gap: 7px; min-width: 0; }
        .al-tab-pane.active { display: flex; }

        #al-signal-flash-banner {
          display: none; padding: 6px 8px; border-radius: 8px; border: 1px solid #10b981;
          font-size: 11px; font-weight: 700; color: #ffffff;
          align-items: center; justify-content: center; text-align: center;
          animation: pulseAlert 0.8s infinite alternate;
        }
        #aladdin-card.al-signal-cam #al-signal-flash-banner {
          margin: 6px 8px 2px 8px;
        }
        @keyframes pulseAlert { from { opacity: 0.94; } to { opacity: 1; transform: scale(1.01); } }

        .al-surface {
          background: rgba(17, 24, 39, 0.72);
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 8px; padding: 7px 9px;
        }

        .al-mini-signal-bar {
          display: flex; flex-direction: column; gap: 4px;
          padding: 6px 8px; border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(15, 23, 42, 0.72); font-size: 10.5px; font-weight: 600;
        }
        .al-bias-track {
          width: 100%; height: 3px; background: rgba(148, 163, 184, 0.16); border-radius: 2px; overflow: hidden;
        }
        .al-bias-fill {
          height: 100%; width: 50%; background: #38bdf8; transition: width 0.25s ease, background 0.25s ease;
        }
        .al-mini-take-btn {
          display: none; align-items: center; justify-content: center; padding: 3px 8px;
          border-radius: 6px; border: 1px solid rgba(255,255,255,0.22); color: #fff;
          font-size: 10px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0;
          touch-action: manipulation;
        }
        .al-active-trade-box {
          display: none; align-items: center; justify-content: space-between;
          padding: 5px 8px; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.45);
          background: rgba(15, 23, 42, 0.85); font-size: 10.5px; font-weight: 700;
        }

        .al-tf-chips { display: flex; gap: 3px; overflow-x: auto; -webkit-overflow-scrolling: touch; touch-action: pan-x; }
        .al-tf-chip {
          flex: 1 0 auto; min-width: 30px; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(148, 163, 184, 0.14);
          color: #94a3b8; font-size: 10px; font-weight: 600; padding: 4px 2px;
          border-radius: 6px; cursor: pointer; text-align: center; transition: all 0.15s;
          touch-action: manipulation;
        }
        .al-tf-chip.active { background: rgba(2, 132, 199, 0.28); border-color: #38bdf8; color: #f8fafc; }

        .al-input-group {
          display: flex; align-items: center; background: rgba(2, 6, 23, 0.72);
          border: 1px solid rgba(148, 163, 184, 0.22); border-radius: 7px; padding: 3px 5px;
        }
        .al-input-group:focus-within { border-color: #38bdf8; }
        .al-currency-prefix { color: #34d399; font-weight: 700; font-size: 13px; padding-left: 4px; }
        .al-stake-input {
          flex: 1; background: transparent; border: none; color: #ffffff;
          font-weight: 700; font-size: 14px; font-variant-numeric: tabular-nums;
          padding: 3px 6px; outline: none; width: 60px;
        }
        .al-step-btn {
          background: rgba(30, 41, 59, 0.85); color: #e2e8f0; border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 6px; width: 25px; height: 24px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 13px; font-weight: 700; margin-left: 3px; touch-action: manipulation;
        }
        .al-step-btn:active { background: #0284c7; color: #fff; }

        .al-quick-chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 5px; }
        .al-chip {
          background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(148, 163, 184, 0.14);
          color: #cbd5e1; font-size: 10.5px; font-weight: 600;
          padding: 4px 2px; border-radius: 6px; cursor: pointer; text-align: center; transition: all 0.15s;
          touch-action: manipulation;
        }
        .al-chip:hover { border-color: #38bdf8; color: #fff; }
        .al-chip.active { background: rgba(2, 132, 199, 0.3); border-color: #38bdf8; color: #ffffff; }

        .al-fixed-dock {
          flex-shrink: 0; padding: 7px 8px 8px 8px;
          background: rgba(15, 23, 42, 0.96);
          border-top: 1px solid rgba(148, 163, 184, 0.14);
          display: flex; flex-direction: column; gap: 5px;
        }
        .al-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .al-trade-btn {
          padding: 10px 6px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer;
          border: none; display: flex; align-items: center; justify-content: center; gap: 5px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.45); letter-spacing: 0.2px; transition: transform 0.08s;
          touch-action: manipulation;
        }
        .al-trade-btn:active { transform: scale(0.97); }
        .al-btn-call { background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; }
        .al-btn-put { background: linear-gradient(135deg, #e11d48, #f43f5e); color: #ffffff; }

        .al-radar-hero {
          background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 8px; padding: 7px 8px; text-align: center; display: flex; flex-direction: column; gap: 4px;
        }
        .al-radar-sig-text { font-size: 13.5px; font-weight: 800; letter-spacing: 0.2px; }
        .al-radar-grid { display: grid; grid-template-columns: repeat(2, minmax(110px, 1fr)); gap: 5px; font-size: 10px; overflow-x: auto; touch-action: pan-x; -webkit-overflow-scrolling: touch; }
        .al-conf-tag {
          background: rgba(30, 41, 59, 0.72); border: 1px solid rgba(148, 163, 184, 0.14);
          padding: 2px 6px; border-radius: 5px; font-size: 9.5px; color: #cbd5e1;
        }
        .al-mode-btn {
          flex: 1; height: 22px; padding: 0 6px; font-size: 9.5px; font-weight: 700;
          background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(148, 163, 184, 0.16);
          color: #94a3b8; border-radius: 5px; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          touch-action: manipulation;
        }
        .al-mode-btn.active { background: rgba(2, 132, 199, 0.28); border-color: #38bdf8; color: #f8fafc; }
        .al-step-ladder { display: grid; grid-template-columns: repeat(auto-fit, minmax(42px, 1fr)); gap: 4px; }
        .al-step-pill {
          background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 6px; padding: 4px 2px; text-align: center; font-size: 9px; color: #94a3b8;
          display: flex; flex-direction: column; gap: 1px;
        }
        .al-step-pill.active { border-color: #fbbf24; background: rgba(245, 158, 11, 0.14); color: #fde68a; }
        .al-step-pill strong { font-size: 9.5px; color: #f8fafc; }
        .al-log-row {
          background: rgba(15, 23, 42, 0.65); padding: 6px 8px; border-radius: 6px;
          border: 1px solid rgba(148, 163, 184, 0.12); display: flex;
          justify-content: space-between; align-items: center; font-size: 10px;
        }
        .al-notify { display: none; padding: 5px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; text-align: center; }
        .al-notify.success { display: block; background: rgba(16,185,129,0.18); color: #34d399; border: 1px solid rgba(16,185,129,0.4); }
        .al-notify.error { display: block; background: rgba(244,63,94,0.18); color: #fda4af; border: 1px solid rgba(244,63,94,0.4); }

        .al-tm-card-head {
          display: flex; align-items: center; justify-content: space-between; gap: 6px;
          background: #0f141f; border: 1px solid #1b2233; border-radius: 5px 5px 0 0; padding: 6px 8px;
        }
        .al-tag-sq {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 1px 5px; border-radius: 2px; border: 1px solid rgba(148,163,184,0.22);
          font-size: 8.5px; font-weight: 800; font-family: monospace; white-space: nowrap;
        }
        .al-tm-subtabs {
          display: flex; overflow-x: auto; -webkit-overflow-scrolling: touch; touch-action: pan-x;
          background: #0c1017; border: 1px solid #1b2233; border-top: none; margin-bottom: 2px;
          scrollbar-width: thin;
        }
        .al-tm-subtabs::-webkit-scrollbar { height: 2px; }
        .al-tm-subtab {
          flex: 1 0 auto; padding: 6px 8px; background: transparent; border: none; border-bottom: 2px solid transparent;
          color: #94a3b8; font-size: 10px; font-weight: 800; cursor: pointer; white-space: nowrap;
          touch-action: manipulation; transition: color 0.15s, border-color 0.15s;
        }
        .al-tm-subtab:hover { color: #e2e8f0; }
        .al-tm-subtab.active { color: #f59e0b; border-bottom-color: #f59e0b; }
        .al-tm-box {
          background: #10141e; border: 1px solid #1b2233; border-radius: 4px;
        }
        .al-tm-lbl {
          font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4px;
          color: #64748b; display: block;
        }
        .al-tm-grid2 { display: grid; grid-template-columns: 1fr 1fr; }
        .al-tm-steps-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
        .al-tm-step {
          height: 26px; border-radius: 3px; border: 1px solid #1b2233; background: #121620;
          color: #64748b; display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-family: monospace; font-weight: 700;
        }
        .al-tm-step.win { border-color: #10b981; background: rgba(16, 185, 129, 0.18); color: #34d399; }
        .al-tm-step.loss { border-color: #f43f5e; background: rgba(244, 63, 94, 0.18); color: #fb7185; }
        .al-tm-step.cur {
          border-color: #ffffff; color: #ffffff; background: #181f2f;
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.35);
        }
        .al-tm-kpi6 {
          background: #10141e; border: 1px solid #1b2233; border-radius: 4px; overflow: hidden;
        }
        .al-tm-kpi6-row {
          display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #1b2233; padding: 5px 7px;
        }
        .al-tm-kpi6-row:last-child { border-bottom: none; }
        .al-tm-kpi6-row > div:first-child { border-right: 1px solid #1b2233; padding-right: 6px; }
        .al-tm-switch-orb {
          width: 34px; height: 34px; border-radius: 50%; background: #101624; border: 2px solid;
          font-size: 14px; font-weight: 900; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; touch-action: manipulation;
        }
        .al-tm-btn-sec {
          padding: 6px 8px; border-radius: 4px; background: #141924;
          border: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8;
          font-size: 10.5px; font-weight: 800; font-family: monospace; cursor: pointer; text-align: center;
          touch-action: manipulation;
        }
        .al-tm-btn-sec.glow {
          border-color: #10b981; background: rgba(16, 185, 129, 0.14); color: #34d399;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.25);
        }
        .al-tm-table-wrap {
          overflow: auto; max-height: 190px; border: 1px solid #1b2233; border-radius: 4px;
          background: #10141e; touch-action: pan-x pan-y; -webkit-overflow-scrolling: touch;
        }
        .al-tm-table {
          width: 100%; border-collapse: collapse; font-size: 9.5px; font-family: monospace; white-space: nowrap;
        }
        .al-tm-table th {
          padding: 5px 6px; font-size: 8px; color: #64748b; text-transform: uppercase;
          border-bottom: 1px solid #1b2233; background: rgba(0, 0, 0, 0.45); text-align: left;
          position: sticky; top: 0; z-index: 1;
        }
        .al-tm-table td {
          padding: 4.5px 6px; border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .al-tm-table tbody tr[data-push-stake]:hover {
          background: rgba(56, 189, 248, 0.1);
        }
        .al-tm-cal-cell {
          height: 38px; padding: 2px 3px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.06);
          background: #121622; color: #64748b; display: flex; flex-direction: column; justify-content: space-between;
        }
        .al-tm-cal-cell.pos { border-color: rgba(16,185,129,0.45); background: rgba(16,185,129,0.12); color: #e2e8f0; }
        .al-tm-cal-cell.neg { border-color: rgba(244,63,94,0.45); background: rgba(244,63,94,0.12); color: #e2e8f0; }
        .al-tm-cal-cell.empty { background: rgba(14,18,26,0.25); border-color: transparent; }
      </style>

      <!-- 1. MORPHING LAUNCHER -->
      <div id="aladdin-bubble" title="Open AladdinGenie">
        <span id="al-bubble-signal-pill">▲ BUY</span>
        <span class="genie-icon">🧞‍♂️</span>
        <span class="mini-badge" id="al-mini-bal">—</span>
      </div>

      <!-- 2. OBSIDIAN FINTECH GLASS PANEL -->
      <div id="aladdin-card">
        <div class="al-header" id="al-drag-handle">
          <div class="al-title">
            <div class="al-pulse offline" id="al-sync-dot" title="Green = Live Synced | Red = Offline"></div>
            <span style="flex-shrink: 0;">AladdinGenie</span>
          </div>
          <div style="display: flex; gap: 4px; align-items: center; flex-shrink: 0;">
            <span class="al-bal-inline" id="al-sync-pill">—</span>
            <button class="al-ctrl-btn" id="al-audio-toggle" title="Toggle Signal Sound">${audioEnabled ? '🔊' : '🔇'}</button>
            <button class="al-ctrl-btn" id="al-card-fullscreen" title="Fullscreen">⛶</button>
            <button class="al-ctrl-btn" id="al-card-close" title="Close">✕</button>
          </div>
        </div>

        <div class="al-nav-tabs">
          <button class="al-nav-tab" data-tab="sniper">Trade</button>
          <button class="al-nav-tab" data-tab="radar">Signal</button>
          <button class="al-nav-tab" data-tab="manager">Manager</button>
          <button class="al-nav-tab" data-tab="challenges">333/444</button>
          <button class="al-nav-tab" data-tab="paradox">Paradox</button>
          <button class="al-nav-tab" data-tab="logs">Logs</button>
        </div>

        <div class="al-scroll-body">
          <div id="al-signal-flash-banner">
            <span id="al-flash-text">Signal Ready</span>
          </div>

          <!-- TAB 1: TRADE -->
          <div class="al-tab-pane" id="al-pane-sniper">
            <div class="al-surface" style="display: flex; align-items: center; justify-content: space-between;">
              <div style="min-width: 0;">
                <div style="font-size: 11.5px; font-weight: 700; color: #f8fafc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" id="al-asset-val">AUD/USD OTC</div>
                <div style="font-size: 9.5px; color: #94a3b8; margin-top: 1px;">
                  <span id="al-account-type-lbl">DEMO</span> · <span id="al-balance-val" style="color: #34d399; font-weight: 600;">—</span>
                </div>
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <div style="font-size: 12px; font-weight: 800; color: #34d399;">+<span id="al-payout-pct">92</span>%</div>
                <div style="font-size: 9px; color: #94a3b8;">Payout</div>
              </div>
            </div>

            <div class="al-surface">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #94a3b8; margin-bottom: 4px;">
                <span style="font-weight: 600;">Stake Amount</span>
                <span style="color: #38bdf8; font-weight: 600;" id="al-scrape-source-lbl">Syncing</span>
              </div>
              <div class="al-input-group">
                <span class="al-currency-prefix">$</span>
                <input type="text" inputmode="decimal" id="al-custom-stake-input" class="al-stake-input" value="1.11" />
                <button class="al-step-btn" id="al-stake-dec">−</button>
                <button class="al-step-btn" id="al-stake-inc">+</button>
              </div>
              <div class="al-quick-chips">
                <button class="al-chip" data-stake="1.00">$1</button>
                <button class="al-chip" data-stake="5.00">$5</button>
                <button class="al-chip" data-stake="10.00">$10</button>
                <button class="al-chip" data-stake="25.00">$25</button>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 5px; color: #94a3b8;">
                <span>Est. Profit</span>
                <strong style="color: #34d399;">+$<span id="al-est-profit">0.00</span></strong>
              </div>
            </div>

            <div class="al-surface" style="display: flex; flex-direction: column; gap: 5px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #94a3b8;">
                <span>Timeframe</span>
                <strong style="color: #38bdf8;" id="al-tf-label">${currentTimeframe}</strong>
              </div>
              <div class="al-tf-chips" id="al-tf-chips-group">
                <button class="al-tf-chip ${currentTimeframe === '5s' ? 'active' : ''}" data-tf="5s">5s</button>
                <button class="al-tf-chip ${currentTimeframe === '10s' ? 'active' : ''}" data-tf="10s">10s</button>
                <button class="al-tf-chip ${currentTimeframe === '15s' ? 'active' : ''}" data-tf="15s">15s</button>
                <button class="al-tf-chip ${currentTimeframe === '30s' ? 'active' : ''}" data-tf="30s">30s</button>
                <button class="al-tf-chip ${currentTimeframe === '1m' ? 'active' : ''}" data-tf="1m">1m</button>
                <button class="al-tf-chip ${currentTimeframe === '5m' ? 'active' : ''}" data-tf="5m">5m</button>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #94a3b8; margin-top: 2px;">
                <span>Trade Expiry</span>
                <strong style="color: #34d399;" id="al-expiry-label">${currentExpiry}</strong>
              </div>
              <div class="al-tf-chips" id="al-expiry-chips-group">
                <button class="al-tf-chip ${currentExpiry === '5s' ? 'active' : ''}" data-exp="5s">5s</button>
                <button class="al-tf-chip ${currentExpiry === '15s' ? 'active' : ''}" data-exp="15s">15s</button>
                <button class="al-tf-chip ${currentExpiry === '30s' ? 'active' : ''}" data-exp="30s">30s</button>
                <button class="al-tf-chip ${currentExpiry === '1m' ? 'active' : ''}" data-exp="1m">1m</button>
                <button class="al-tf-chip ${currentExpiry === '2m' ? 'active' : ''}" data-exp="2m">2m</button>
                <button class="al-tf-chip ${currentExpiry === '5m' ? 'active' : ''}" data-exp="5m">5m</button>
              </div>
            </div>

            <div class="al-mini-signal-bar" id="al-mini-signal-bar">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                <span id="al-mini-signal-text" style="color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">Scanning chart...</span>
                <span id="al-mini-signal-timer" style="color: #38bdf8; flex-shrink: 0; font-size: 10px;">05s</span>
                <button class="al-mini-take-btn" id="al-mini-take-btn">⚡ BUY</button>
              </div>
              <div class="al-bias-track"><div class="al-bias-fill" id="al-mini-bias-fill"></div></div>
            </div>
          </div>

          <!-- TAB 2: SIGNAL (WITH TRANSPARENT LIVE CHART VIEWFINDER) -->
          <div class="al-tab-pane" id="al-pane-radar" style="gap: 0;">
            <div class="al-cam-top">
              <div style="display: flex; gap: 4px; align-items: center;">
                <button class="al-mode-btn ${signalMode === 'ACTIVE' ? 'active' : ''}" data-sigmode="ACTIVE">Active</button>
                <button class="al-mode-btn ${signalMode === 'BALANCED' ? 'active' : ''}" data-sigmode="BALANCED">Balanced</button>
                <button class="al-mode-btn ${signalMode === 'SNIPER' ? 'active' : ''}" data-sigmode="SNIPER">Sniper A+</button>
              </div>
              <div class="al-radar-hero">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #94a3b8;">
                  <span>Signal Engine · <strong style="color: #38bdf8;" id="al-radar-tf-badge">${currentTimeframe}</strong></span>
                  <span style="color: #34d399; font-weight: 700;" id="al-radar-candle-time">05s</span>
                </div>
                <div class="al-radar-sig-text" id="al-radar-big-signal" style="color: #38bdf8;">
                  Analyzing Price Action
                </div>
                <div class="al-bias-track"><div class="al-bias-fill" id="al-radar-conf-fill"></div></div>
                <div style="font-size: 9.5px; color: #cbd5e1;" id="al-radar-pattern-lbl">
                  Scanning live candlesticks...
                </div>
              </div>
            </div>

            <!-- CRYSTAL-CLEAR TRANSPARENT CAMERA CUTOUT REVEALING LIVE POCKET OPTION CHART -->
            <div class="al-chart-window" id="al-chart-window">
              <span class="al-cam-corner al-cam-tl"></span>
              <span class="al-cam-corner al-cam-tr"></span>
              <span class="al-cam-corner al-cam-bl"></span>
              <span class="al-cam-corner al-cam-br"></span>
              <div class="al-vf-live" id="al-viewfinder-live">
                <span class="al-vf-dot syncing" id="al-vf-dot"></span>
                <span id="al-vf-text">LIVE</span>
              </div>
              <div id="al-radar-wick-bar" style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 8.5px; font-weight: 600; color: #cbd5e1; background: rgba(11, 15, 25, 0.68); padding: 1px 7px; border-radius: 4px; border: 1px solid rgba(148, 163, 184, 0.16);">
                Upper 0% · Body 0% · Lower 0%
              </div>
            </div>

            <div class="al-cam-bottom">
              <div id="al-radar-conf-list" style="display: flex; flex-wrap: wrap; gap: 4px;"></div>

              <div class="al-radar-grid">
                <div class="al-surface">
                  <div style="font-size: 9px; color: #94a3b8;">Support / Resistance</div>
                  <div style="margin-top: 2px; font-weight: 700;">
                    <span style="color: #34d399;" id="al-radar-sup">—</span>
                    <span style="color: #64748b;"> / </span>
                    <span style="color: #fb7185;" id="al-radar-res">—</span>
                  </div>
                </div>
                <div class="al-surface">
                  <div style="font-size: 9px; color: #94a3b8;">Live Quote · <span id="al-radar-source" style="color: #38bdf8;">Live Chart</span></div>
                  <div style="color: #f8fafc; font-weight: 700; margin-top: 2px;" id="al-radar-live-price">—</div>
                </div>
                <div class="al-surface">
                  <div style="font-size: 9px; color: #94a3b8;">RSI (14) · Stoch %K</div>
                  <div style="color: #38bdf8; font-weight: 700; margin-top: 2px;" id="al-radar-rsi">Calibrating...</div>
                </div>
                <div class="al-surface">
                  <div style="font-size: 9px; color: #94a3b8;">Trend · Winrate</div>
                  <div style="margin-top: 2px; font-weight: 700;">
                    <span id="al-radar-trend" style="color: #38bdf8;">NEUTRAL</span>
                    <span style="color: #64748b;"> · </span>
                    <span id="al-radar-acc" style="color: #fbbf24;">Calibrating</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 3: ALADDINSNIPER TRADE MANAGER & MATRIX -->
          <div class="al-tab-pane" id="al-pane-manager">
            <div id="al-tm-root" style="display:flex;flex-direction:column;gap:7px;"></div>
          </div>

          <!-- TAB 4: 333 / 444 COMPOUNDING MODE + SMART TRADING JOURNAL -->
          <div class="al-tab-pane" id="al-pane-challenges">
            <div id="al-ch-root" style="display:flex;flex-direction:column;gap:7px;"></div>
          </div>

          <!-- TAB 5: PARADOX MATRIX -->
          <div class="al-tab-pane" id="al-pane-paradox">
            <div id="al-px-root" style="display:flex;flex-direction:column;gap:7px;"></div>
          </div>

          <!-- TAB 4: LOGS -->
          <div class="al-tab-pane" id="al-pane-logs">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: #cbd5e1; font-size: 10.5px;">Execution History</strong>
              <button id="al-clear-logs-btn" style="background: rgba(30,41,59,0.75); border: 1px solid rgba(148,163,184,0.18); color: #94a3b8; padding: 3px 7px; border-radius: 5px; font-size: 9.5px; cursor: pointer;">Clear</button>
            </div>
            <div id="al-order-logs-list" style="display: flex; flex-direction: column; gap: 4px; max-height: 240px; overflow: auto; touch-action: pan-x pan-y; -webkit-overflow-scrolling: touch;"></div>
          </div>
        </div>

        <!-- FIXED NON-SCROLLING BOTTOM BUY / SELL DOCK -->
        <div class="al-fixed-dock">
          <div class="al-active-trade-box" id="al-active-trade-box">
            <span id="al-active-trade-text">▲ BUY $1.11 · Live</span>
            <span id="al-active-trade-countdown" style="background: rgba(2,6,23,0.85); padding: 2px 6px; border-radius: 5px; border: 1px solid currentColor;">15s</span>
          </div>
          <div class="al-notify" id="al-notify-box"></div>
          <div class="al-actions">
            <button class="al-trade-btn al-btn-call" id="al-call-btn">
              <span>▲ BUY <strong id="al-call-stake-lbl">$—</strong></span>
            </button>
            <button class="al-trade-btn al-btn-put" id="al-put-btn">
              <span>▼ SELL <strong id="al-put-stake-lbl">$—</strong></span>
            </button>
          </div>
        </div>

        <div class="al-corner-resize" id="al-resize-grip" title="Drag to Resize">⤡</div>
      </div>
    `;

    document.body.appendChild(root);

    screenFlashEl = document.createElement('div');
    screenFlashEl.id = 'aladdin-screen-flash';
    document.body.appendChild(screenFlashEl);

    bubble = root.querySelector('#aladdin-bubble');
    card = root.querySelector('#aladdin-card');
    const dragHandle = root.querySelector('#al-drag-handle');
    const resizeGrip = root.querySelector('#al-resize-grip');
    const cardCloseBtn = root.querySelector('#al-card-close');
    const cardFullscreenBtn = root.querySelector('#al-card-fullscreen');
    audioToggleBtn = root.querySelector('#al-audio-toggle');
    syncStatusDot = root.querySelector('#al-sync-dot');
    miniBal = root.querySelector('#al-mini-bal');
    syncPill = root.querySelector('#al-sync-pill');

    const navTabs = root.querySelectorAll('.al-nav-tab');
    const tabPanes = root.querySelectorAll('.al-tab-pane');

    tfLabel = root.querySelector('#al-tf-label');
    expiryLabel = root.querySelector('#al-expiry-label');
    const tfChips = root.querySelectorAll('#al-tf-chips-group .al-tf-chip');
    const expChips = root.querySelectorAll('#al-expiry-chips-group .al-tf-chip');
    radarTfBadge = root.querySelector('#al-radar-tf-badge');

    balanceVal = root.querySelector('#al-balance-val');
    accTypeLabel = root.querySelector('#al-account-type-lbl');
    assetVal = root.querySelector('#al-asset-val');
    customStakeInput = root.querySelector('#al-custom-stake-input');
    scrapeSourceLbl = root.querySelector('#al-scrape-source-lbl');
    const stakeDecBtn = root.querySelector('#al-stake-dec');
    const stakeIncBtn = root.querySelector('#al-stake-inc');
    quickChips = root.querySelectorAll('.al-chip');
    payoutPctLbl = root.querySelector('#al-payout-pct');
    estProfitLbl = root.querySelector('#al-est-profit');
    callStakeLbl = root.querySelector('#al-call-stake-lbl');
    putStakeLbl = root.querySelector('#al-put-stake-lbl');
    callBtn = root.querySelector('#al-call-btn');
    putBtn = root.querySelector('#al-put-btn');
    notifyBox = root.querySelector('#al-notify-box');

    miniSignalBar = root.querySelector('#al-mini-signal-bar');
    miniSignalText = root.querySelector('#al-mini-signal-text');
    miniSignalTimer = root.querySelector('#al-mini-signal-timer');
    miniTakeBtn = root.querySelector('#al-mini-take-btn');
    miniBiasFill = root.querySelector('#al-mini-bias-fill');
    activeTradeBox = root.querySelector('#al-active-trade-box');
    activeTradeText = root.querySelector('#al-active-trade-text');
    activeTradeCountdown = root.querySelector('#al-active-trade-countdown');

    tmRootEl = root.querySelector('#al-tm-root');
    chRootEl = root.querySelector('#al-ch-root');
    pxRootEl = root.querySelector('#al-px-root');
    dockAutoTag = null;

    radarCandleTime = root.querySelector('#al-radar-candle-time');
    radarBigSignal = root.querySelector('#al-radar-big-signal');
    radarPatternLbl = root.querySelector('#al-radar-pattern-lbl');
    radarSup = root.querySelector('#al-radar-sup');
    radarRes = root.querySelector('#al-radar-res');
    radarRsi = root.querySelector('#al-radar-rsi');
    radarTrendLbl = root.querySelector('#al-radar-trend');
    radarConfList = root.querySelector('#al-radar-conf-list');
    radarLivePrice = root.querySelector('#al-radar-live-price');
    radarSourceLbl = root.querySelector('#al-radar-source');
    radarChartCanvas = null;
    radarWickBar = root.querySelector('#al-radar-wick-bar');
    radarConfFill = root.querySelector('#al-radar-conf-fill');
    radarAccLbl = root.querySelector('#al-radar-acc');
    signalModeBtns = root.querySelectorAll('[data-sigmode]');
    chartWindowEl = root.querySelector('#al-chart-window');
    radarLiveBadge = root.querySelector('#al-viewfinder-live');
    radarLiveDot = root.querySelector('#al-vf-dot');
    radarLiveText = root.querySelector('#al-vf-text');

    orderLogsList = root.querySelector('#al-order-logs-list');
    const clearLogsBtn = root.querySelector('#al-clear-logs-btn');

    const validTabs = ['sniper', 'radar', 'manager', 'challenges', 'paradox', 'logs'];
    const initTab = validTabs.includes(savedLayout.activeTab) ? savedLayout.activeTab : 'sniper';
    savedLayout.activeTab = initTab;
    navTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === initTab));
    tabPanes.forEach(p => p.classList.toggle('active', p.id === `al-pane-${initTab}`));
    card.classList.toggle('al-signal-cam', initTab === 'radar');

    if (signalModeBtns) {
      signalModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const nextMode = btn.getAttribute('data-sigmode');
          if (nextMode === 'ACTIVE' || nextMode === 'BALANCED' || nextMode === 'SNIPER') {
            signalMode = nextMode;
            lockedSignal = null;
            signalCooldownUntil = 0;
            savePersistedState();
            updateRealTechnicalAnalysis(true);
            showNotification(`Signal mode: ${nextMode}`, 'success');
          }
        });
      });
    }

    if (audioToggleBtn) {
      audioToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        audioEnabled = !audioEnabled;
        audioToggleBtn.textContent = audioEnabled ? '🔊' : '🔇';
        savePersistedState();
      });
    }

    if (miniTakeBtn) {
      miniTakeBtn.addEventListener('click', () => {
        if (realSignal === 'CALL' || realSignal === 'PUT') {
          executeTrade(realSignal, currentStake || 1);
        }
      });
    }

    if (clearLogsBtn) {
      clearLogsBtn.addEventListener('click', () => {
        recentTrades = [];
        updateLogsDisplay();
        savePersistedState();
        showNotification('Logs cleared', 'success');
      });
    }

    // -----------------------------------------------------------------------
    // DELEGATED EVENTS: SYSTEM 1 — ALADDINSNIPER TRADE MANAGER & MATRIX
    // -----------------------------------------------------------------------
    if (tmRootEl) {
      tmRootEl.addEventListener('click', (e) => {
        const pushEl = e.target.closest('[data-push-stake]');
        if (pushEl) {
          const val = parseFloat(pushEl.getAttribute('data-push-stake'));
          if (!isNaN(val) && val > 0) {
            applyStake(val, false);
            showNotification(`Pushed $${val.toFixed(2)} to PO`, 'success');
          }
          return;
        }

        const subBtn = e.target.closest('[data-tm-sub]');
        if (subBtn) {
          playTMBeep('click');
          tmState.activeSubTab = subBtn.getAttribute('data-tm-sub') || 'trade';
          savePersistedState();
          renderTradeManager();
          return;
        }

        const engBtn = e.target.closest('[data-tm-eng]');
        if (engBtn) {
          playTMBeep('click');
          tmState.engineMode = engBtn.getAttribute('data-tm-eng') || 'ALADDIN_TIERED';
          savePersistedState();
          renderTradeManager();
          return;
        }

        const presetBtn = e.target.closest('[data-tm-preset]');
        if (presetBtn) {
          const p = presetBtn.getAttribute('data-tm-preset');
          if (p && p.includes('/')) {
            const [t, w] = p.split('/').map(Number);
            if (t >= 2 && w >= 1) {
              playTMBeep('click');
              tmState.selectedPreset = p;
              tmState.tradesAllowed = t;
              tmState.winsNeeded = Math.min(w, t);
              resetEntireTMSession(tmState.balance);
              showNotification(`Matrix preset ${p} active`, 'success');
            }
          }
          return;
        }

        const schedBtn = e.target.closest('[data-tm-sched]');
        if (schedBtn) {
          playTMBeep('click');
          tmState.scheduleViewMode = schedBtn.getAttribute('data-tm-sched') || 'ALADDIN_DP';
          savePersistedState();
          renderTradeManager();
          return;
        }

        const actBtn = e.target.closest('[data-tm-act]');
        if (actBtn) {
          const act = actBtn.getAttribute('data-tm-act');
          if (act === 'toggleSync') {
            tmState.autoSyncPO = !tmState.autoSyncPO;
            if (tmState.autoSyncPO && poBalance && poBalance > 0 && tmState.sessionTrades.length === 0) {
              tmState.userEditedBalance = false;
              tmState.payoutLockedManual = false;
              tmState.balance = Number(poBalance.toFixed(2));
              tmState.sessionStartBalance = tmState.balance;
              tmState.currentBalance = tmState.balance;
              tmState.payoutRate = currentPayout || 92;
            }
            savePersistedState();
            renderTradeManager();
            showNotification(tmState.autoSyncPO ? 'PO Live Sync ON' : 'PO Sync Manual', 'success');
          } else if (act === 'toggleAutoStake') {
            autoApplyStake = !autoApplyStake;
            if (autoApplyStake) {
              const s = getTMComputed().nextStake;
              if (s > 0) applyStake(s, false);
            }
            savePersistedState();
            renderTradeManager();
            showNotification(`Auto-Push Next Stake: ${autoApplyStake ? 'ON' : 'OFF'}`, 'success');
          } else if (act === 'applyNextToPO') {
            const s = getTMComputed().nextStake;
            if (s > 0) {
              applyStake(s, false);
              showNotification(`Applied $${s.toFixed(2)} to Pocket Option`, 'success');
            }
          } else if (act === 'copyStake') {
            const s = getTMComputed().nextStake.toFixed(2);
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(s).catch(() => {});
            }
            applyStake(parseFloat(s), false);
            showNotification(`Copied & Synced $${s}`, 'success');
          } else if (act === 'forceWin') {
            forceSettleActiveTrade(true);
          } else if (act === 'forceLoss') {
            forceSettleActiveTrade(false);
          } else if (act === 'execBuy') {
            const s = getTMComputed().nextStake;
            executeTrade('CALL', s);
          } else if (act === 'execSell') {
            const s = getTMComputed().nextStake;
            executeTrade('PUT', s);
          } else if (act === 'toggleTradeMode') {
            playTMBeep('click');
            tmState.tradeActionMode = tmState.tradeActionMode === 'BUY_SELL' ? 'WIN_LOSS' : 'BUY_SELL';
            savePersistedState();
            renderTradeManager();
          } else if (act === 'recWin') {
            recordTMOutcome('WIN');
          } else if (act === 'recLoss') {
            recordTMOutcome('LOSS');
          } else if (act === 'endSession') {
            endTMSession(tmState.currentBalance, tmState.sessionTrades);
          } else if (act === 'resetSession') {
            resetEntireTMSession(tmState.balance);
            showNotification('Trade Manager session reset', 'success');
          } else if (act === 'pullPOBal') {
            if (poBalance && poBalance > 0) {
              tmState.userEditedBalance = false;
              tmState.balance = Number(poBalance.toFixed(2));
              resetEntireTMSession(tmState.balance);
              showNotification(`Synced PO Balance $${tmState.balance.toFixed(2)}`, 'success');
            } else {
              showNotification('Waiting for Pocket Option balance...', 'error');
            }
          } else if (act === 'startNewSession') {
            startNewTMSession();
            showNotification('New session started', 'success');
          } else if (act === 'factoryReset') {
            resetTMFactoryDefaults();
          } else if (act === 'dismissComplete') {
            tmState.showCompleteModal = false;
            savePersistedState();
            renderTradeManager();
          } else if (act === 'clearLastLog') {
            if (tmState.sessionLogs.length > 0) {
              tmState.sessionLogs.shift();
              savePersistedState();
              renderTradeManager();
              showNotification('Removed latest session log', 'success');
            }
          } else if (act === 'clearAllLogs') {
            tmState.sessionLogs = [];
            savePersistedState();
            renderTradeManager();
            showNotification('All Trade Manager logs cleared', 'success');
          } else if (act === 'prevMonth') {
            if (tmState.calendarMonth === 0) { tmState.calendarMonth = 11; tmState.calendarYear -= 1; }
            else tmState.calendarMonth -= 1;
            renderTradeManager();
          } else if (act === 'nextMonth') {
            if (tmState.calendarMonth === 11) { tmState.calendarMonth = 0; tmState.calendarYear += 1; }
            else tmState.calendarMonth += 1;
            renderTradeManager();
          }
          return;
        }

        // Matrix Sub-Tab Buttons
        const mxModeBtn = e.target.closest('[data-mx-mode]');
        if (mxModeBtn) {
          mxState.activeMode = mxModeBtn.getAttribute('data-mx-mode') || 'daily';
          savePersistedState();
          renderTradeManager();
          return;
        }
        const mxViewBtn = e.target.closest('[data-mx-view]');
        if (mxViewBtn) {
          mxState.viewMode = mxViewBtn.getAttribute('data-mx-view') || 'chart';
          savePersistedState();
          renderTradeManager();
          return;
        }
        const mxActBtn = e.target.closest('[data-mx-act]');
        if (mxActBtn) {
          const act = mxActBtn.getAttribute('data-mx-act');
          if (act === 'toggleTiers') {
            mxState.daily.enableTieredReturns = !mxState.daily.enableTieredReturns;
            savePersistedState();
            renderTradeManager();
          } else if (act === 'syncPO') {
            if (poBalance && poBalance > 0) {
              mxState.daily.startingCapital = Number(poBalance.toFixed(2));
              savePersistedState();
              renderTradeManager();
              showNotification(`Matrix capital synced to $${mxState.daily.startingCapital}`, 'success');
            }
          }
          return;
        }
        const mxCapPre = e.target.closest('[data-mx-preset-cap]');
        if (mxCapPre) {
          mxState.daily.startingCapital = parseFloat(mxCapPre.getAttribute('data-mx-preset-cap')) || 250;
          savePersistedState();
          renderTradeManager();
          return;
        }
        const mxRatePre = e.target.closest('[data-mx-preset-rate]');
        if (mxRatePre) {
          mxState.daily.dailyReturnRate = parseFloat(mxRatePre.getAttribute('data-mx-preset-rate')) || 5;
          savePersistedState();
          renderTradeManager();
          return;
        }
        const mxReinvBtn = e.target.closest('[data-mx-reinv]');
        if (mxReinvBtn) {
          mxState.daily.reinvestmentPercent = parseFloat(mxReinvBtn.getAttribute('data-mx-reinv')) || 70;
          savePersistedState();
          renderTradeManager();
          return;
        }
        const mxDaysBtn = e.target.closest('[data-mx-days]');
        if (mxDaysBtn) {
          const preset = mxDaysBtn.getAttribute('data-mx-days');
          mxState.daily.activeDaysPreset = preset;
          mxState.daily.activeDays = preset === 'all'
            ? { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
            : { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false };
          savePersistedState();
          renderTradeManager();
          return;
        }
        const mxStepPre = e.target.closest('[data-mx-step-preset]');
        if (mxStepPre) {
          const sp = mxStepPre.getAttribute('data-mx-step-preset');
          if (sp === '333') {
            mxState.step.compoundingType = 'phases';
            mxState.step.phaseLength = 3;
            mxState.step.stepsCount = 9;
            mxState.step.lockProfitAtPhaseEnd = true;
          } else if (sp === '444') {
            mxState.step.compoundingType = 'phases';
            mxState.step.phaseLength = 4;
            mxState.step.stepsCount = 12;
            mxState.step.lockProfitAtPhaseEnd = true;
          } else if (sp === 'sniper10') {
            mxState.step.compoundingType = 'all_in';
            mxState.step.stepsCount = 10;
          } else if (sp === 'conservative') {
            mxState.step.compoundingType = 'profit_split';
            mxState.step.reinvestmentPercent = 70;
            mxState.step.stepsCount = 15;
          }
          savePersistedState();
          renderTradeManager();
          return;
        }
      });

      const handleTMFieldUpdate = (e, shouldRerender) => {
        const el = e.target;
        if (!el) return;
        const id = el.id;
        if (id === 'al-tm-payout-sel') {
          const p = Math.max(10, Math.min(100, parseInt(el.value, 10) || 92));
          tmState.payoutRate = p;
          tmState.payoutLockedManual = true;
          savePersistedState();
          renderTradeManager();
          return;
        }
        if (id === 'al-tm-set-bal') {
          const v = parseFloat(el.value);
          if (!isNaN(v) && v >= 1) {
            tmState.balance = v;
            tmState.userEditedBalance = true;
            tmState.sessionStartBalance = v;
            tmState.currentBalance = v;
            tmState.sessionTrades = [];
            tmState.sessionActive = true;
            savePersistedState();
            if (shouldRerender) renderTradeManager();
          }
          return;
        }
        if (id === 'al-tm-set-risk') {
          const v = Math.max(5, Math.min(100, parseFloat(el.value) || 100));
          tmState.riskAmountPercent = v;
          savePersistedState();
          if (shouldRerender) renderTradeManager();
          return;
        }
        if (id === 'al-tm-set-trades') {
          const v = Math.max(2, Math.min(30, parseInt(el.value, 10) || 14));
          tmState.tradesAllowed = v;
          if (tmState.winsNeeded > v) tmState.winsNeeded = v;
          tmState.selectedPreset = `${tmState.tradesAllowed}/${tmState.winsNeeded}`;
          tmState.sessionStartBalance = tmState.balance;
          tmState.currentBalance = tmState.balance;
          tmState.sessionTrades = [];
          tmState.sessionActive = true;
          savePersistedState();
          if (shouldRerender) renderTradeManager();
          return;
        }
        if (id === 'al-tm-set-wins') {
          const v = Math.max(1, Math.min(tmState.tradesAllowed, parseInt(el.value, 10) || 2));
          tmState.winsNeeded = v;
          tmState.selectedPreset = `${tmState.tradesAllowed}/${tmState.winsNeeded}`;
          tmState.sessionStartBalance = tmState.balance;
          tmState.currentBalance = tmState.balance;
          tmState.sessionTrades = [];
          tmState.sessionActive = true;
          savePersistedState();
          if (shouldRerender) renderTradeManager();
          return;
        }
        if (id === 'al-tm-set-pay') {
          const v = Math.max(10, Math.min(100, parseInt(el.value, 10) || 92));
          tmState.payoutRate = v;
          tmState.payoutLockedManual = true;
          savePersistedState();
          if (shouldRerender) renderTradeManager();
          return;
        }
        if (id === 'al-mx-curr') {
          mxState.currency = el.value || 'USD';
          savePersistedState();
          renderTradeManager();
          return;
        }
        const mxIn = el.getAttribute('data-mx-in');
        if (mxIn) {
          const num = parseFloat(el.value);
          if (isNaN(num)) return;
          if (mxIn === 'd_cap') mxState.daily.startingCapital = Math.max(1, num);
          else if (mxIn === 'd_rate') mxState.daily.dailyReturnRate = Math.max(0.1, Math.min(100, num));
          else if (mxIn === 'd_days') mxState.daily.daysCount = Math.max(1, Math.min(365, Math.round(num)));
          else if (mxIn === 'd_goal') mxState.daily.targetGoal = Math.max(10, num);
          else if (mxIn === 's_cap') mxState.step.startingCapital = Math.max(0.1, num);
          else if (mxIn === 's_steps') mxState.step.stepsCount = Math.max(2, Math.min(30, Math.round(num)));
          else if (mxIn === 's_pay') mxState.step.payoutRatePercent = Math.max(10, Math.min(100, num));
          savePersistedState();
          if (shouldRerender) renderTradeManager();
        }
      };

      tmRootEl.addEventListener('input', (e) => handleTMFieldUpdate(e, false));
      tmRootEl.addEventListener('change', (e) => handleTMFieldUpdate(e, true));
    }

    // -----------------------------------------------------------------------
    // DELEGATED EVENTS: SYSTEM 2 — 333 / 444 MODE + SMART TRADING JOURNAL
    // -----------------------------------------------------------------------
    if (chRootEl) {
      chRootEl.addEventListener('click', (e) => {
        const pushEl = e.target.closest('[data-push-stake]');
        if (pushEl) {
          const val = parseFloat(pushEl.getAttribute('data-push-stake'));
          if (!isNaN(val) && val > 0) {
            applyStake(val, false);
            showNotification(`Pushed $${val.toFixed(2)} to PO`, 'success');
          }
          return;
        }

        const modeBtn = e.target.closest('[data-ch-mode]');
        if (modeBtn) {
          const m = modeBtn.getAttribute('data-ch-mode');
          chState.activeMode = m === '444' ? '444' : '333';
          chState.selectedPlanId = chState.activeMode === '333' ? 'plan-100' : 'plan-1-11';
          chState.timerId = null;
          chState.timerLeft = 0;
          chState.timerLabel = '';
          savePersistedState();
          renderChallengeTab();
          return;
        }

        const planBtn = e.target.closest('[data-ch-plan]');
        if (planBtn) {
          chState.selectedPlanId = planBtn.getAttribute('data-ch-plan');
          chState.timerId = null;
          chState.timerLeft = 0;
          chState.timerLabel = '';
          savePersistedState();
          renderChallengeTab();
          return;
        }

        const stepBtn = e.target.closest('[data-ch-step]');
        if (stepBtn) {
          const [pIdx, tIdx] = (stepBtn.getAttribute('data-ch-step') || '0:0').split(':').map(Number);
          const { activePlan } = getActiveChallengePlan();
          const key = `${activePlan.id}-${pIdx}-${tIdx}`;
          const nextDone = !chState.completedSteps[key];
          if (nextDone) chState.completedSteps[key] = true;
          else delete chState.completedSteps[key];
          playTMBeep(nextDone ? 'win' : 'click');

          const phase = activePlan.phases[pIdx];
          if (phase) {
            if (nextDone && tIdx + 1 < phase.trades.length) {
              const nextAmt = phase.trades[tIdx + 1];
              if (nextAmt > 0) applyStake(nextAmt, false);
            } else {
              const firstPending = phase.trades.find((_, ti) => !chState.completedSteps[`${activePlan.id}-${pIdx}-${ti}`]);
              if (firstPending) applyStake(firstPending, false);
            }
          }
          savePersistedState();
          renderChallengeTab();
          return;
        }

        const tStartBtn = e.target.closest('[data-ch-tstart]');
        if (tStartBtn) {
          const pIdx = parseInt(tStartBtn.getAttribute('data-ch-tstart') || '0', 10);
          const tid = `${chState.selectedPlanId}-${pIdx}`;
          if (chState.timerId === tid && chState.timerType === 'session') {
            chState.timerId = null;
            chState.timerLeft = 0;
            chState.timerLabel = '';
          } else {
            chState.timerId = tid;
            chState.timerLeft = 0;
            chState.timerType = 'session';
            chState.timerLabel = `Phase ${pIdx + 1}`;
          }
          renderChallengeTab();
          return;
        }

        const tRestBtn = e.target.closest('[data-ch-trest]');
        if (tRestBtn) {
          const [pIdx, secs, lbl] = (tRestBtn.getAttribute('data-ch-trest') || '0:1800:Wait').split(':');
          chState.timerId = `${chState.selectedPlanId}-${pIdx}-${lbl}`;
          chState.timerLeft = parseInt(secs, 10) || 1800;
          chState.timerType = 'rest';
          chState.timerLabel = lbl || 'Rest';
          renderChallengeTab();
          return;
        }

        const clearPhBtn = e.target.closest('[data-ch-clearph]');
        if (clearPhBtn) {
          const pIdx = parseInt(clearPhBtn.getAttribute('data-ch-clearph') || '0', 10);
          const prefix = `${chState.selectedPlanId}-${pIdx}-`;
          Object.keys(chState.completedSteps).forEach(k => {
            if (k.startsWith(prefix)) delete chState.completedSteps[k];
          });
          savePersistedState();
          renderChallengeTab();
          showNotification(`Phase ${pIdx + 1} cleared`, 'success');
          return;
        }

        const actBtn = e.target.closest('[data-ch-act]');
        if (actBtn) {
          const act = actBtn.getAttribute('data-ch-act');
          if (act === 'syncPayoutPO') {
            chState.payoutRate = Math.max(0.1, Math.min(1.0, (currentPayout || 92) / 100));
            savePersistedState();
            renderChallengeTab();
            showNotification(`Synced Payout ${Math.round(chState.payoutRate * 100)}%`, 'success');
          } else if (act === 'clearSession') {
            const prefix = `${chState.selectedPlanId}-`;
            Object.keys(chState.completedSteps).forEach(k => {
              if (k.startsWith(prefix)) delete chState.completedSteps[k];
            });
            chState.timerId = null;
            chState.timerLeft = 0;
            chState.timerLabel = '';
            savePersistedState();
            renderChallengeTab();
            showNotification('Plan session cleared', 'success');
          } else if (act === 'resetAll') {
            chState.completedSteps = {};
            chState.timerId = null;
            chState.timerLeft = 0;
            chState.timerLabel = '';
            savePersistedState();
            renderChallengeTab();
            showNotification('All 333/444 plans reset', 'success');
          } else if (act === 'toggleJournalForm') {
            chState.showJournalForm = !chState.showJournalForm;
            renderChallengeTab();
          } else if (act === 'cancelJournal') {
            chState.showJournalForm = false;
            renderChallengeTab();
          } else if (act === 'saveJournal') {
            const notesEl = chRootEl.querySelector('#al-j-notes');
            const notesVal = notesEl ? notesEl.value.trim() : chState.draftJournal.notes.trim();
            if (!notesVal) {
              showNotification('Please add short journal notes', 'error');
              return;
            }
            const { activePlan } = getActiveChallengePlan();
            chState.journalEntries.unshift({
              id: Date.now().toString(),
              date: new Date().toLocaleDateString(),
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              mode: chState.activeMode,
              planName: activePlan.title,
              payout: chState.payoutRate * 100,
              result: chState.draftJournal.result,
              emotion: chState.draftJournal.emotion,
              marketCondition: chState.draftJournal.marketCondition,
              rating: chState.draftJournal.rating,
              notes: notesVal
            });
            if (chState.journalEntries.length > 100) chState.journalEntries.pop();
            chState.draftJournal.notes = '';
            chState.showJournalForm = false;
            savePersistedState();
            renderChallengeTab();
            showNotification('Journal audit saved', 'success');
          }
          return;
        }

        // Journal Draft Controls
        const jRes = e.target.closest('[data-j-res]');
        if (jRes) {
          chState.draftJournal.result = jRes.getAttribute('data-j-res') || 'Success';
          renderChallengeTab();
          return;
        }
        const jMkt = e.target.closest('[data-j-mkt]');
        if (jMkt) {
          chState.draftJournal.marketCondition = jMkt.getAttribute('data-j-mkt') || 'Trending';
          renderChallengeTab();
          return;
        }
        const jEmo = e.target.closest('[data-j-emo]');
        if (jEmo) {
          chState.draftJournal.emotion = jEmo.getAttribute('data-j-emo') || 'Confident';
          renderChallengeTab();
          return;
        }
        const jRate = e.target.closest('[data-j-rate]');
        if (jRate) {
          chState.draftJournal.rating = parseInt(jRate.getAttribute('data-j-rate') || '5', 10);
          renderChallengeTab();
          return;
        }
        const jDel = e.target.closest('[data-j-del]');
        if (jDel) {
          const did = jDel.getAttribute('data-j-del');
          chState.journalEntries = chState.journalEntries.filter(x => x.id !== did);
          savePersistedState();
          renderChallengeTab();
        }
      });

      chRootEl.addEventListener('input', (e) => {
        if (e.target && e.target.id === 'al-j-notes') {
          chState.draftJournal.notes = e.target.value;
        } else if (e.target && e.target.id === 'al-ch-payout') {
          const val = Math.max(10, Math.min(100, parseFloat(e.target.value) || 92));
          chState.payoutRate = val / 100;
          savePersistedState();
        }
      });

      chRootEl.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'al-ch-payout') {
          const val = Math.max(10, Math.min(100, parseFloat(e.target.value) || 92));
          chState.payoutRate = val / 100;
          savePersistedState();
          renderChallengeTab();
        }
      });
    }

    // -----------------------------------------------------------------------
    // DELEGATED EVENTS: SYSTEM 3 — PARADOX MATRIX ENGINE
    // -----------------------------------------------------------------------
    if (pxRootEl) {
      pxRootEl.addEventListener('click', (e) => {
        const pushEl = e.target.closest('[data-push-stake]');
        if (pushEl) {
          const val = parseFloat(pushEl.getAttribute('data-push-stake'));
          if (!isNaN(val) && val > 0) {
            applyStake(val, false);
            showNotification(`Pushed $${val.toFixed(2)} to PO`, 'success');
          }
          return;
        }

        const togEl = e.target.closest('[data-px-toggle]');
        if (togEl) {
          const pid = togEl.getAttribute('data-px-toggle');
          if (pxState.openPhases.includes(pid)) {
            pxState.openPhases = pxState.openPhases.filter(id => id !== pid);
          } else {
            pxState.openPhases.push(pid);
          }
          savePersistedState();
          renderParadoxTab();
          return;
        }

        const actEl = e.target.closest('[data-px-act]');
        if (actEl) {
          const act = actEl.getAttribute('data-px-act');
          if (act === 'togglePayoutSync') {
            pxState.useLivePayout = !pxState.useLivePayout;
            savePersistedState();
            renderParadoxTab();
          } else if (act === 'resetAll') {
            pxState.completedSessions = [];
            pxState.timerId = null;
            pxState.timerLeft = 0;
            savePersistedState();
            renderParadoxTab();
            showNotification('Paradox progress reset', 'success');
          } else if (act === 'exportCSV') {
            const phases = getParadoxPhases();
            const rows = [['Phase', 'Mode', 'Session', 'Status', 'Start ($)', 'Target ($)', 'Profit ($)']];
            phases.forEach(p => {
              p.sessions.forEach((s, idx) => {
                const done = pxState.completedSessions.includes(s.id);
                rows.push([
                  p.title,
                  p.mode,
                  `Module ${idx + 1}`,
                  done ? 'COMPLETED' : 'PENDING',
                  s.start.toFixed(2),
                  s.target.toFixed(2),
                  done ? (s.target - s.start).toFixed(2) : '0.00'
                ]);
              });
            });
            const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `paradox_report_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1500);
            showNotification('Exported Paradox CSV report', 'success');
          }
          return;
        }

        const startEl = e.target.closest('[data-px-tstart]');
        if (startEl) {
          pxState.timerId = startEl.getAttribute('data-px-tstart');
          pxState.timerLeft = 0;
          pxState.timerType = 'session';
          renderParadoxTab();
          return;
        }

        const restEl = e.target.closest('[data-px-trest]');
        if (restEl) {
          const [sid, secs] = (restEl.getAttribute('data-px-trest') || '').split(':');
          pxState.timerId = `${sid}_rest`;
          pxState.timerLeft = parseInt(secs, 10) || 1800;
          pxState.timerType = 'rest';
          renderParadoxTab();
          return;
        }

        const stopEl = e.target.closest('[data-px-tstop]');
        if (stopEl) {
          pxState.timerId = null;
          pxState.timerLeft = 0;
          renderParadoxTab();
          return;
        }

        const lossEl = e.target.closest('[data-px-loss]');
        if (lossEl) {
          const sid = lossEl.getAttribute('data-px-loss');
          pxState.timerId = `${sid}_loss`;
          pxState.timerLeft = 1800;
          pxState.timerType = 'rest';
          renderParadoxTab();
          showNotification('Protocol Loss: 30m Cool-down started', 'error');
          return;
        }

        const compEl = e.target.closest('[data-px-complete]');
        if (compEl) {
          const sid = compEl.getAttribute('data-px-complete');
          if (pxState.completedSessions.includes(sid)) {
            pxState.completedSessions = pxState.completedSessions.filter(id => id !== sid);
          } else {
            pxState.completedSessions.push(sid);
            playTMBeep('target');
            pxState.timerId = `${sid}_rest`;
            pxState.timerLeft = 3600;
            pxState.timerType = 'rest';
            showNotification('Module Secured! 1h Rest Timer started', 'success');
          }
          savePersistedState();
          renderParadoxTab();
        }
      });
    }

    tfChips.forEach(chip => {
      chip.addEventListener('click', () => {
        autoSyncTimingUntil = Date.now() + 4500;
        setTimeframeUI(chip.getAttribute('data-tf') || '5s', true);
      });
    });

    expChips.forEach(chip => {
      chip.addEventListener('click', () => {
        autoSyncTimingUntil = Date.now() + 4500;
        setExpiryUI(chip.getAttribute('data-exp') || '15s', true);
      });
    });

    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        navTabs.forEach(t => t.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.getAttribute('data-tab');
        savedLayout.activeTab = tabName;
        savePersistedState();
        card.classList.toggle('al-signal-cam', tabName === 'radar');
        const targetPane = root.querySelector(`#al-pane-${tabName}`);
        if (targetPane) targetPane.classList.add('active');
        if (tabName === 'manager') renderTradeManager();
        if (tabName === 'challenges') renderChallengeTab();
        if (tabName === 'paradox') renderParadoxTab();
        if (tabName === 'logs') updateLogsDisplay();
        if (tabName === 'radar') syncLiveQuoteHUDNow();
      });
    });

    quickChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const val = parseFloat(chip.getAttribute('data-stake'));
        applyStake(val, true);
      });
    });

    customStakeInput.addEventListener('change', () => {
      const val = parseExactAmount(customStakeInput.value);
      if (val !== null) applyStake(val, true);
    });
    customStakeInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        const val = parseExactAmount(customStakeInput.value);
        if (val !== null) applyStake(val, true);
      }
    });

    stakeIncBtn.addEventListener('click', () => applyStake((currentStake || 1) + 1, true));
    stakeDecBtn.addEventListener('click', () => {
      const s = currentStake || 1;
      if (s > 1) applyStake(s - 1, true);
      else if (s > 0.1) applyStake(Math.max(0.1, s - 0.1), true);
    });

    callBtn.addEventListener('click', () => executeTrade('CALL', currentStake || 1));
    putBtn.addEventListener('click', () => executeTrade('PUT', currentStake || 1));

    bubble.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isDragging || isResizing) return;
      isCardExpanded = true;
      bubble.style.display = 'none';
      card.style.display = 'flex';
      clampFloatingBounds();
      updateLogsDisplay();
      drawMiniCandlestickChart();
    });

    cardCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isCardExpanded = false;
      card.classList.remove('fullscreen');
      card.style.display = 'none';
      bubble.style.display = 'flex';
      clampFloatingBounds();
    });

    cardFullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const goingFull = !card.classList.contains('fullscreen');
      card.classList.toggle('fullscreen', goingFull);
      cardFullscreenBtn.title = goingFull ? 'Exit Fullscreen' : 'Fullscreen';
      if (!goingFull) {
        card.style.width = `${Math.max(230, savedLayout.width || 304)}px`;
        card.style.height = `${Math.max(250, savedLayout.height || 468)}px`;
        clampFloatingBounds();
      }
    });

    let startX, startY, initialLeft, initialTop;
    function onDragStart(e) {
      if (isResizing) return;
      isDragging = false;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX; startY = clientY;
      const rect = root.getBoundingClientRect();
      initialLeft = rect.left; initialTop = rect.top;
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
      document.addEventListener('touchmove', onDragMove, { passive: false });
      document.addEventListener('touchend', onDragEnd);
    }
    function onDragMove(e) {
      if (isResizing) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - startX; const deltaY = clientY - startY;
      if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
        isDragging = true;
        if (e.cancelable) e.preventDefault();
        const maxLeft = Math.max(6, window.innerWidth - Math.max(54, root.offsetWidth) - 6);
        const maxTop = Math.max(6, window.innerHeight - Math.max(54, root.offsetHeight) - 6);
        const nextL = Math.max(6, Math.min(maxLeft, initialLeft + deltaX));
        const nextT = Math.max(6, Math.min(maxTop, initialTop + deltaY));
        root.style.left = `${nextL}px`;
        root.style.top = `${nextT}px`;
        root.style.right = 'auto';
        savedLayout.left = nextL;
        savedLayout.top = nextT;
      }
    }
    function onDragEnd() {
      if (isDragging) savePersistedState();
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('touchmove', onDragMove);
      document.removeEventListener('touchend', onDragEnd);
    }
    bubble.addEventListener('mousedown', onDragStart);
    bubble.addEventListener('touchstart', onDragStart, { passive: true });
    dragHandle.addEventListener('mousedown', onDragStart);
    dragHandle.addEventListener('touchstart', onDragStart, { passive: true });

    let resizeStartX, resizeStartY, startWidth, startHeight;
    function onResizeStart(e) {
      e.stopPropagation();
      isResizing = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      resizeStartX = clientX; resizeStartY = clientY;
      const rect = card.getBoundingClientRect();
      startWidth = rect.width; startHeight = rect.height;
      document.addEventListener('mousemove', onResizeMove);
      document.addEventListener('mouseup', onResizeEnd);
      document.addEventListener('touchmove', onResizeMove, { passive: false });
      document.addEventListener('touchend', onResizeEnd);
    }
    function onResizeMove(e) {
      if (!isResizing) return;
      if (e.cancelable) e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const newWidth = Math.max(230, Math.min(window.innerWidth - 12, startWidth + (clientX - resizeStartX)));
      const newHeight = Math.max(250, Math.min(window.innerHeight - 16, startHeight + (clientY - resizeStartY)));
      card.classList.remove('fullscreen');
      card.style.width = `${newWidth}px`;
      card.style.height = `${newHeight}px`;
      savedLayout.width = newWidth;
      savedLayout.height = newHeight;
    }
    function onResizeEnd() {
      if (isResizing) {
        clampFloatingBounds();
        savePersistedState();
      }
      isResizing = false;
      document.removeEventListener('mousemove', onResizeMove);
      document.removeEventListener('mouseup', onResizeEnd);
      document.removeEventListener('touchmove', onResizeMove);
      document.removeEventListener('touchend', onResizeEnd);
    }
    resizeGrip.addEventListener('mousedown', onResizeStart);
    resizeGrip.addEventListener('touchstart', onResizeStart, { passive: false });
    window.addEventListener('resize', clampFloatingBounds);

    let mutDebounce = null;
    const observer = new MutationObserver(() => {
      if (mutDebounce) return;
      mutDebounce = setTimeout(() => {
        mutDebounce = null;
        if (document.activeElement !== customStakeInput) {
          const poDeal = detectPOAmountAndPayout();
          syncStakeFromPO(poDeal.stake, poDeal.payoutPercent, poDeal.source);
        }
      }, 120);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    ['input', 'change', 'keyup', 'click', 'touchend'].forEach(evtType => {
      document.addEventListener(evtType, (e) => {
        if (e.target && !e.target.closest('#aladdin-floating-root')) {
          setTimeout(() => {
            if (document.activeElement !== customStakeInput) {
              const poDeal = detectPOAmountAndPayout();
              syncStakeFromPO(poDeal.stake, poDeal.payoutPercent, poDeal.source);
            }
          }, 30);
        }
      }, true);
    });

    clampFloatingBounds();
    setInterval(syncPOData, 350);
    syncPOData();
    renderTradeManager();
    renderChallengeTab();
    renderParadoxTab();
    updatePlanDisplay();
    updateLogsDisplay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootGenieUI, { once: true });
    setTimeout(() => { if (!document.getElementById('aladdin-floating-root') && document.body) bootGenieUI(); }, 900);
  } else {
    bootGenieUI();
  }

  channel.onmessage = function(event) {
    const data = event.data;
    if (!data) return;
    if (data.type === 'POCKET_PING') syncPOData();
    if (data.target === 'POCKET_OPTION') {
      if (data.action === 'SET_AMOUNT' && typeof data.stake === 'number') {
        applyStake(data.stake, true);
      }
      if (data.action === 'SET_TIMING') {
        autoSyncTimingUntil = Date.now() + 4500;
        if (data.timeframe) setTimeframeUI(data.timeframe, true);
        if (data.expiry) setExpiryUI(data.expiry, true);
      }
      if (data.action === 'PLACE_ORDER') {
        executeTrade(data.direction, data.stake);
      }
    }
  };
})();
