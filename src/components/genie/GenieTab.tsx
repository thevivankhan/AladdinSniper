import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Download, Zap, Target, Bell, TrendingUp, TrendingDown, Volume2, VolumeX, Clock, ShieldCheck, Calculator, SlidersHorizontal } from 'lucide-react';
import { AladdinTradeEngine } from '../../utils/aladdinTradeEngine';
import {
  calculateDailyPlan,
  calculateNKSessionPlan,
  CURRENCY_META,
  DEFAULT_GENIE_COMP_CONFIG,
  findBestTradesForCapital,
  formatCompMoney,
  type ActiveTradingDays,
  type CashFlowFreq,
  type CashFlowType,
  type CurrencyCode,
  type GenieCompConfig,
  type GenieCompMode,
} from '../../utils/genieCompoundingEngine';

interface LiveCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface ActiveTradeState {
  id: string;
  direction: 'CALL' | 'PUT';
  stake: number;
  payoutPercent: number;
  asset: string;
  entryPrice: number | null;
  expirySec: number;
  startTime: number;
  endTime: number;
}

interface TradeLogItem {
  id?: string;
  time: string;
  direction: 'CALL' | 'PUT';
  stake: number;
  asset: string;
  expiry?: string;
  result?: string;
  pnl?: number;
}

interface GenieStatusData {
  connected: boolean;
  browser: string;
  balance: number | null;
  accountType: string;
  asset: string;
  stake: number;
  payoutPercent: number;
  scrapeSource: string;
  dataSource: string;
  timeframe: string;
  expiry: string;
  lastTickPrice: number | null;
  isPriceCalibrated: boolean;
  rsi: number | null;
  stochK: number | null;
  trend: string;
  pattern: string;
  signal: 'CALL' | 'PUT' | 'WAIT';
  confidence: number;
  marketBiasDir: 'BUY' | 'SELL' | 'NEUTRAL';
  marketBiasPct: number;
  support: number | null;
  resistance: number | null;
  sentiment: number | null;
  wickMetrics: { upperPct: number; bodyPct: number; lowerPct: number };
  candles: LiveCandle[];
  signalStats: { wins: number; losses: number };
  sessionStats: { wins: number; losses: number; netPnL: number; recoveryStep: number };
  activeTrade: ActiveTradeState | null;
  recentTrades: TradeLogItem[];
  timestamp: number;
}

const TIMEFRAMES = ['5s', '10s', '15s', '30s', '1m', '5m'];
const EXPIRIES = ['5s', '15s', '30s', '1m', '2m', '5m'];
const TF_SECONDS: Record<string, number> = {
  '5s': 5,
  '10s': 10,
  '15s': 15,
  '30s': 30,
  '1m': 60,
  '2m': 120,
  '5m': 300,
};

function formatHumanSource(raw: string): string {
  if (!raw) return 'Live Chart';
  if (/ws/i.test(raw)) return 'WebSocket Live';
  if (/canvas/i.test(raw)) return 'Live Chart';
  if (/quote/i.test(raw)) return 'Live Quote';
  if (/wait/i.test(raw)) return 'Waiting for Pocket Option';
  return raw;
}

function getPriceDecimals(price: number | null): number {
  if (price === null || !Number.isFinite(price)) return 5;
  const abs = Math.abs(price);
  if (abs >= 1000) return 2;
  if (abs >= 15) return 3;
  return 5;
}

function formatQuotePrice(val: number | null, refPrice: number | null, isCalibrated: boolean): string {
  if (val === null || !Number.isFinite(val)) return '—';
  if (!isCalibrated) return val.toFixed(1);
  const decimals = getPriceDecimals(refPrice ?? val);
  return val.toFixed(decimals);
}

export const GenieTab: React.FC = () => {
  const [genieStatus, setGenieStatus] = useState<GenieStatusData>({
    connected: false,
    browser: 'Pocket Option Bridge',
    balance: null,
    accountType: 'DEMO',
    asset: 'AUD/USD OTC',
    stake: 1.11,
    payoutPercent: 92,
    scrapeSource: 'Syncing',
    dataSource: 'Waiting for Pocket Option',
    timeframe: '5s',
    expiry: '15s',
    lastTickPrice: null,
    isPriceCalibrated: false,
    rsi: null,
    stochK: null,
    trend: 'NEUTRAL',
    pattern: 'Open Pocket Option to begin live candle analysis',
    signal: 'WAIT',
    confidence: 50,
    marketBiasDir: 'NEUTRAL',
    marketBiasPct: 50,
    support: null,
    resistance: null,
    sentiment: null,
    wickMetrics: { upperPct: 0, bodyPct: 0, lowerPct: 0 },
    candles: [],
    signalStats: { wins: 0, losses: 0 },
    sessionStats: { wins: 0, losses: 0, netPnL: 0, recoveryStep: 1 },
    activeTrade: null,
    recentTrades: [],
    timestamp: 0,
  });

  const [copiedUrl, setCopiedUrl] = useState<'loader' | 'direct' | null>(null);
  const [testStakeInput, setTestStakeInput] = useState('1.11');
  const isEditingStakeRef = useRef(false);
  const [candleSec, setCandleSec] = useState(5);
  const [activeRemainingSec, setActiveRemainingSec] = useState<number | null>(null);
  const [signalAlert, setSignalAlert] = useState<'CALL' | 'PUT' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);
  const lastAlertedRef = useRef<{ signal: string | null; time: number }>({ signal: null, time: 0 });
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeframeRef = useRef('5s');

  const [compConfig, setCompConfig] = useState<GenieCompConfig>(() => {
    try {
      const saved = localStorage.getItem('aladdin_genie_comp_cfg_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        const migratedMode: GenieCompMode = parsed.mode === 'DAILY' ? 'DAILY' : 'NK_PLAN';
        return { ...DEFAULT_GENIE_COMP_CONFIG, ...parsed, mode: migratedMode };
      }
    } catch {
      // Ignore storage error
    }
    return DEFAULT_GENIE_COMP_CONFIG;
  });
  const [showRiskDrawer, setShowRiskDrawer] = useState(false);
  const [syncLivePayout, setSyncLivePayout] = useState(true);
  const [nkSession, setNkSession] = useState<{ tradesDone: number; winsAchieved: number; netPnL: number }>({
    tradesDone: 0,
    winsAchieved: 0,
    netPnL: 0,
  });

  useEffect(() => {
    try {
      localStorage.setItem('aladdin_genie_comp_cfg_v1', JSON.stringify(compConfig));
    } catch {
      // Ignore storage error
    }
  }, [compConfig]);

  const effectiveCompConfig = useMemo<GenieCompConfig>(() => ({
    ...compConfig,
    payoutPct: syncLivePayout && genieStatus.payoutPercent > 0 ? genieStatus.payoutPercent : compConfig.payoutPct,
  }), [compConfig, syncLivePayout, genieStatus.payoutPercent]);

  const nkPlanResult = useMemo(
    () => calculateNKSessionPlan(
      {
        capital: effectiveCompConfig.startingCapital,
        totalTrades: effectiveCompConfig.totalTrades,
        winsNeeded: effectiveCompConfig.winsNeeded,
        payoutPct: effectiveCompConfig.payoutPct,
        minStake: effectiveCompConfig.minStake || 1.0,
        currency: effectiveCompConfig.currency,
      },
      nkSession.tradesDone,
      nkSession.winsAchieved,
      nkSession.netPnL
    ),
    [effectiveCompConfig, nkSession]
  );

  const compResult = useMemo(
    () => calculateDailyPlan(effectiveCompConfig, genieStatus.balance),
    [effectiveCompConfig, genieStatus.balance]
  );

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    timeframeRef.current = genieStatus.timeframe;
  }, [genieStatus.timeframe]);

  const playChime = () => {
    if (!soundEnabledRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.008, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Ignore audio autoplay restriction errors
    }
  };

  const triggerVisualAlert = (dir: 'CALL' | 'PUT') => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setSignalAlert(dir);
    playChime();
    flashTimeoutRef.current = setTimeout(() => {
      setSignalAlert(null);
    }, 3600);
  };

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('aladdin_pocket_bridge');
      channel.onmessage = (event) => {
        const data = event.data;
        if (data && data.type === 'POCKET_PONG') {
          const incomingSignal: 'CALL' | 'PUT' | 'WAIT' = data.signal || 'WAIT';
          if (incomingSignal === 'WAIT') {
            lastAlertedRef.current.signal = null;
          } else if (
            (incomingSignal === 'CALL' || incomingSignal === 'PUT') &&
            (lastAlertedRef.current.signal !== incomingSignal || Date.now() - lastAlertedRef.current.time > 12000) &&
            Date.now() - lastAlertedRef.current.time > 6000
          ) {
            lastAlertedRef.current = { signal: incomingSignal, time: Date.now() };
            triggerVisualAlert(incomingSignal);
          }

          const parsedStake = AladdinTradeEngine.parseExactAmount(data.stake);
          if (parsedStake !== null && !isEditingStakeRef.current) {
            setTestStakeInput(Number.isInteger(parsedStake) ? String(parsedStake) : parsedStake.toFixed(2));
          }

          setGenieStatus((prev) => ({
            ...prev,
            connected: true,
            browser: data.browser || prev.browser,
            balance: typeof data.balance === 'number' ? data.balance : prev.balance,
            accountType: data.accountType || prev.accountType,
            asset: data.asset || prev.asset,
            stake: parsedStake !== null ? parsedStake : prev.stake,
            payoutPercent: typeof data.payoutPercent === 'number' && data.payoutPercent > 0 ? data.payoutPercent : prev.payoutPercent,
            scrapeSource: data.scrapeSource || 'PO Synced',
            dataSource: formatHumanSource(data.dataSource || prev.dataSource),
            timeframe: data.timeframe || prev.timeframe,
            expiry: data.expiry || prev.expiry,
            lastTickPrice: typeof data.lastTickPrice === 'number' && data.lastTickPrice > 0 ? data.lastTickPrice : null,
            isPriceCalibrated: Boolean(data.isPriceCalibrated),
            rsi: typeof data.rsi === 'number' ? data.rsi : null,
            stochK: typeof data.stochK === 'number' ? data.stochK : null,
            trend: data.trend || prev.trend,
            pattern: data.pattern || prev.pattern,
            signal: incomingSignal,
            confidence: typeof data.confidence === 'number' ? data.confidence : 50,
            marketBiasDir: data.marketBiasDir || prev.marketBiasDir,
            marketBiasPct: typeof data.marketBiasPct === 'number' ? data.marketBiasPct : prev.marketBiasPct,
            support: typeof data.support === 'number' && data.support > 0 ? data.support : null,
            resistance: typeof data.resistance === 'number' && data.resistance > 0 ? data.resistance : null,
            sentiment: typeof data.sentiment === 'number' ? data.sentiment : null,
            wickMetrics: data.wickMetrics || prev.wickMetrics,
            candles: Array.isArray(data.candles) ? data.candles : prev.candles,
            signalStats: data.signalStats || prev.signalStats,
            sessionStats: data.sessionStats || prev.sessionStats,
            activeTrade: data.activeTrade || null,
            recentTrades: Array.isArray(data.recentTrades) ? data.recentTrades : prev.recentTrades,
            timestamp: Date.now(),
          }));
        }
      };
      channel.postMessage({ type: 'POCKET_PING', source: 'ALADDIN_GENIE_TAB', timestamp: Date.now() });
    } catch (e) {
      console.warn('BroadcastChannel error in GenieTab:', e);
    }

    const pingInterval = setInterval(() => {
      try {
        channel?.postMessage({ type: 'POCKET_PING', source: 'ALADDIN_GENIE_TAB', timestamp: Date.now() });
      } catch {
        // Ignore
      }
      setGenieStatus((prev) => {
        if (prev.connected && prev.timestamp > 0 && Date.now() - prev.timestamp > 4500) {
          return { ...prev, connected: false, dataSource: 'Waiting for Pocket Option' };
        }
        return prev;
      });
    }, 2000);

    const scrapeInterval = setInterval(() => {
      const scraped = AladdinTradeEngine.scrapePocketOptionAmountFromDOM(document, '#genie-tab-root');
      if (scraped.stake !== null) {
        if (!isEditingStakeRef.current) {
          setTestStakeInput(Number.isInteger(scraped.stake) ? String(scraped.stake) : scraped.stake.toFixed(2));
        }
        setGenieStatus((prev) => ({
          ...prev,
          stake: scraped.stake!,
          payoutPercent: scraped.payoutPercent || prev.payoutPercent,
          scrapeSource: 'PO Synced',
        }));
      }
    }, 600);

    const timer = setInterval(() => {
      const tfSec = TF_SECONDS[timeframeRef.current] || 5;
      const nowSec = Math.floor(Date.now() / 1000);
      setCandleSec(tfSec - (nowSec % tfSec));
    }, 500);

    return () => {
      clearInterval(timer);
      clearInterval(pingInterval);
      clearInterval(scrapeInterval);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      if (channel) channel.close();
    };
  }, []);

  useEffect(() => {
    if (!genieStatus.activeTrade) {
      setActiveRemainingSec(null);
      return;
    }
    const tick = () => {
      const rem = Math.ceil((genieStatus.activeTrade!.endTime - Date.now()) / 1000);
      setActiveRemainingSec(rem > 0 ? rem : 0);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [genieStatus.activeTrade]);

  // Real-Time Mini Candlestick + EMA(5) + S/R Canvas Plotter (Zero Simulation)
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let y = 20; y < h; y += 26) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const candles = genieStatus.candles;
    if (!candles || candles.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for live Pocket Option candlesticks...', w / 2, h / 2 + 4);
      return;
    }

    let minP = Infinity;
    let maxP = -Infinity;
    for (const c of candles) {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
    }
    if (genieStatus.support !== null && genieStatus.support < minP) minP = genieStatus.support;
    if (genieStatus.resistance !== null && genieStatus.resistance > maxP) maxP = genieStatus.resistance;

    const span = Math.max(0.00001, maxP - minP);
    const padY = 10;
    const drawH = h - padY * 2;
    const yOf = (val: number) => padY + (1 - (val - minP) / span) * drawH;

    if (genieStatus.resistance !== null) {
      const ry = yOf(genieStatus.resistance);
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(w, ry);
      ctx.stroke();
      ctx.restore();
    }

    if (genieStatus.support !== null) {
      const sy = yOf(genieStatus.support);
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();
      ctx.restore();
    }

    const slotW = (w - 16) / candles.length;
    const bodyW = Math.max(4, Math.floor(slotW * 0.6));
    const emaPoints: { x: number; y: number }[] = [];
    const k = 2 / (5 + 1);
    let runningEma = candles[0].close;

    candles.forEach((c, idx) => {
      const cx = 8 + idx * slotW + slotW / 2;
      runningEma = c.close * k + runningEma * (1 - k);
      emaPoints.push({ x: cx, y: yOf(runningEma) });

      const isBull = c.close >= c.open;
      const color = isBull ? '#10b981' : '#f43f5e';
      const yHigh = yOf(c.high);
      const yLow = yOf(c.low);
      const yOpen = yOf(c.open);
      const yClose = yOf(c.close);

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
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
      ctx.lineWidth = 1.5;
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
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(w, ly);
    ctx.stroke();
    ctx.restore();
  }, [genieStatus.candles, genieStatus.support, genieStatus.resistance]);

  const postBridgeCommand = (payload: Record<string, unknown>) => {
    try {
      const channel = new BroadcastChannel('aladdin_pocket_bridge');
      channel.postMessage({ target: 'POCKET_OPTION', ...payload, timestamp: Date.now() });
      channel.close();
    } catch (e) {
      console.warn('Bridge command error:', e);
    }
  };

  const handleSendStakeToGenie = (amt: number) => {
    const cleanAmt = AladdinTradeEngine.parseExactAmount(amt);
    if (cleanAmt === null) return;
    postBridgeCommand({ action: 'SET_AMOUNT', stake: cleanAmt });
    setGenieStatus((prev) => ({ ...prev, stake: cleanAmt }));
  };

  const handleSetTiming = (tf?: string, exp?: string) => {
    postBridgeCommand({ action: 'SET_TIMING', timeframe: tf, expiry: exp });
    setGenieStatus((prev) => ({
      ...prev,
      timeframe: tf || prev.timeframe,
      expiry: exp || prev.expiry,
    }));
  };

  const handleRemoteOrder = (direction: 'CALL' | 'PUT') => {
    postBridgeCommand({ action: 'PLACE_ORDER', direction, stake: genieStatus.stake });
  };

  const AUTO_LOADER_URL = 'https://raw.githubusercontent.com/thevivankhan/AladdinSniper/main/public/aladdin-genie-loader.user.js';
  const totalSessionTrades = genieStatus.sessionStats.wins + genieStatus.sessionStats.losses;
  const sessionWinRate = totalSessionTrades > 0
    ? ((genieStatus.sessionStats.wins / totalSessionTrades) * 100).toFixed(1)
    : '0.0';
  const totalAuditedSignals = genieStatus.signalStats.wins + genieStatus.signalStats.losses;
  const signalAccuracyPct = totalAuditedSignals > 0
    ? `${((genieStatus.signalStats.wins / totalAuditedSignals) * 100).toFixed(0)}% (${genieStatus.signalStats.wins}/${totalAuditedSignals})`
    : 'Calibrating';

  const biasFillColor = genieStatus.signal === 'CALL' || (genieStatus.signal === 'WAIT' && genieStatus.marketBiasDir === 'BUY')
    ? 'bg-emerald-500'
    : genieStatus.signal === 'PUT' || (genieStatus.signal === 'WAIT' && genieStatus.marketBiasDir === 'SELL')
    ? 'bg-rose-500'
    : 'bg-sky-400';

  return (
    <div id="genie-tab-root" className="space-y-4 font-sans text-slate-100 relative tabular-nums">
      {signalAlert && (
        <div
          aria-hidden="true"
          className={`fixed inset-0 pointer-events-none z-50 border-[3px] animate-pulse transition-all duration-300 ${
            signalAlert === 'CALL'
              ? 'border-emerald-400/90 shadow-[inset_0_0_70px_rgba(16,185,129,0.28)] bg-emerald-500/[0.03]'
              : 'border-rose-500/90 shadow-[inset_0_0_70px_rgba(244,63,94,0.28)] bg-rose-500/[0.03]'
          }`}
        />
      )}

      {/* 1. FINTECH HEADER & ACCOUNT STRIP */}
      <div
        className={`bg-[#0b0f19] border rounded-xl p-4 shadow-xl transition-all duration-200 ${
          signalAlert === 'CALL'
            ? 'border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.35)]'
            : signalAlert === 'PUT'
            ? 'border-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.35)]'
            : 'border-slate-800/90'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center text-xl shadow-inner">
              🧞‍♂️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  AladdinGenie
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                  · {genieStatus.dataSource}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Live Pocket Option Floating HUD · Page-World WS &amp; Canvas Telemetry · 7-Factor Confluence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 cursor-pointer transition-colors"
              title={soundEnabled ? 'Mute Signal Chime' : 'Enable Signal Chime'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <div className={`flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border text-xs font-semibold ${
              genieStatus.connected ? 'border-emerald-500/40 text-emerald-400' : 'border-amber-500/30 text-amber-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${genieStatus.connected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span>{genieStatus.connected ? 'Connected' : 'Waiting for PO'}</span>
            </div>
          </div>
        </div>

        {/* Clean Unboxed KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3">
          <div>
            <span className="text-xs text-slate-400 block">Account Balance ({genieStatus.accountType})</span>
            <div className="text-base font-bold text-emerald-400 mt-0.5 font-mono">
              {genieStatus.balance !== null
                ? `$${genieStatus.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : '—'}
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Active Asset</span>
            <div className="text-base font-bold text-slate-100 mt-0.5 truncate">
              {genieStatus.asset || 'AUD/USD OTC'}
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">
              Live Stake (+{genieStatus.payoutPercent}%)
            </span>
            <div className="text-base font-bold text-amber-300 mt-0.5 font-mono">
              ${Number.isInteger(genieStatus.stake) ? genieStatus.stake : genieStatus.stake.toFixed(2)}
              <span className="text-xs text-emerald-400 ml-1.5 font-medium">
                (+${(genieStatus.stake * (genieStatus.payoutPercent / 100)).toFixed(2)})
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">
              {genieStatus.timeframe.toUpperCase()} Candle Close
            </span>
            <div className="text-base font-bold text-sky-400 mt-0.5 font-mono flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {candleSec < 10 ? `0${candleSec}s` : `${candleSec}s`}
            </div>
          </div>
        </div>
      </div>

      {/* 2. REAL CANDLESTICK ENGINE & LIVE REMOTE EXECUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Panel A: Live Signal Engine & Candle Radar */}
        <div
          className={`bg-[#0b0f19] border rounded-xl p-4 space-y-3 transition-all duration-200 ${
            signalAlert === 'CALL'
              ? 'border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.4)]'
              : signalAlert === 'PUT'
              ? 'border-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.4)]'
              : 'border-slate-800/90'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              Signal Engine
            </span>
            <div className="flex items-center gap-2.5 text-xs">
              <span className="font-mono text-slate-400">
                {genieStatus.timeframe} / {genieStatus.expiry}
              </span>
              <button
                type="button"
                onClick={() => triggerVisualAlert(genieStatus.signal === 'PUT' ? 'PUT' : 'CALL')}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Bell className="w-3 h-3 text-sky-400" />
                Test Alert
              </button>
            </div>
          </div>

          {signalAlert && (
            <div
              className={`px-3 py-2 rounded-lg border text-xs font-bold text-white text-center animate-pulse ${
                signalAlert === 'CALL' ? 'bg-emerald-900/70 border-emerald-400' : 'bg-rose-900/70 border-rose-400'
              }`}
            >
              Active Signal: {signalAlert === 'CALL' ? '▲ BUY' : '▼ SELL'} · ${Number(genieStatus.stake).toFixed(2)} ({genieStatus.expiry})
            </div>
          )}

          {/* Live Signal & Directional Bias Hero */}
          <div
            className={`p-3 bg-slate-900/70 border rounded-lg text-center space-y-2 transition-all ${
              genieStatus.signal === 'CALL'
                ? 'border-emerald-500/50'
                : genieStatus.signal === 'PUT'
                ? 'border-rose-500/50'
                : 'border-slate-800'
            }`}
          >
            <div
              className={`text-lg font-bold tracking-tight ${
                genieStatus.signal === 'CALL'
                  ? 'text-emerald-400'
                  : genieStatus.signal === 'PUT'
                  ? 'text-rose-400'
                  : genieStatus.marketBiasDir === 'BUY'
                  ? 'text-emerald-300'
                  : genieStatus.marketBiasDir === 'SELL'
                  ? 'text-rose-300'
                  : 'text-sky-400'
              }`}
            >
              {genieStatus.signal === 'CALL'
                ? `▲ BUY SIGNAL · ${genieStatus.confidence}%`
                : genieStatus.signal === 'PUT'
                ? `▼ SELL SIGNAL · ${genieStatus.confidence}%`
                : genieStatus.marketBiasDir === 'BUY'
                ? `▲ BUY BIAS · ${genieStatus.marketBiasPct}%`
                : genieStatus.marketBiasDir === 'SELL'
                ? `▼ SELL BIAS · ${genieStatus.marketBiasPct}%`
                : 'Analyzing Price Action'}
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${biasFillColor}`}
                style={{ width: `${Math.max(8, Math.min(100, genieStatus.signal === 'WAIT' ? genieStatus.marketBiasPct : genieStatus.confidence))}%` }}
              />
            </div>
            <div className="text-xs text-slate-300">
              {genieStatus.pattern}
            </div>
          </div>

          {/* Live Mini Candlestick + EMA(5) Canvas */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-2.5">
            <canvas ref={chartCanvasRef} width={440} height={124} className="w-full h-[124px] block" />
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2 mt-1.5">
              <span>Upper Wick: <strong className="text-slate-200">{genieStatus.wickMetrics.upperPct}%</strong></span>
              <span>Body: <strong className="text-slate-200">{genieStatus.wickMetrics.bodyPct}%</strong></span>
              <span>Lower Wick: <strong className="text-slate-200">{genieStatus.wickMetrics.lowerPct}%</strong></span>
            </div>
          </div>

          {/* S/R and Live Quote Grid */}
          <div className="grid grid-cols-3 gap-2.5 font-mono text-center">
            <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Support</span>
              <span className="text-xs font-bold text-emerald-400">
                {formatQuotePrice(genieStatus.support, genieStatus.lastTickPrice, genieStatus.isPriceCalibrated)}
              </span>
            </div>
            <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Live Quote</span>
              <span className="text-xs font-bold text-white">
                {formatQuotePrice(genieStatus.lastTickPrice, genieStatus.lastTickPrice, true)}
              </span>
            </div>
            <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Resistance</span>
              <span className="text-xs font-bold text-rose-400">
                {formatQuotePrice(genieStatus.resistance, genieStatus.lastTickPrice, genieStatus.isPriceCalibrated)}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg text-xs text-slate-300 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">RSI (14) · Stoch %K</span>
              <span className="text-emerald-400 font-semibold font-mono">
                {genieStatus.rsi !== null
                  ? `${genieStatus.rsi} · ${genieStatus.stochK ?? '—'}`
                  : 'Calibrating'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Trend · Candles</span>
              <span className="text-sky-300 font-semibold font-mono">
                {genieStatus.trend} · {genieStatus.candles.length} ({genieStatus.dataSource})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Signal Accuracy · Sentiment</span>
              <span className="text-amber-300 font-semibold font-mono">
                {signalAccuracyPct} · {genieStatus.sentiment !== null ? `${genieStatus.sentiment}% Buy` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Panel B: Timing, Exact Stake Sync & Live Remote Execution */}
        <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              Timing, Stake &amp; Execution
            </span>
            <span className="text-xs text-slate-400">2-Way Bridge</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-lg">
              <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Chart Timeframe</span>
              <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => handleSetTiming(tf, undefined)}
                    className={`py-1.5 rounded-md border font-semibold cursor-pointer transition-colors ${
                      genieStatus.timeframe === tf
                        ? 'bg-sky-600/30 border-sky-400 text-white'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-sky-500/50'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-lg">
              <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Trade Expiry</span>
              <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                {EXPIRIES.map((exp) => (
                  <button
                    key={exp}
                    onClick={() => handleSetTiming(undefined, exp)}
                    className={`py-1.5 rounded-md border font-semibold cursor-pointer transition-colors ${
                      genieStatus.expiry === exp
                        ? 'bg-emerald-600/30 border-emerald-400 text-white'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-emerald-500/50'
                    }`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium block">
              Exact Stake (Integer, Decimal, or Float)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-mono font-bold">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={testStakeInput}
                  onFocus={() => { isEditingStakeRef.current = true; }}
                  onBlur={() => { isEditingStakeRef.current = false; }}
                  onChange={(e) => setTestStakeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = AladdinTradeEngine.parseExactAmount(testStakeInput);
                      if (val !== null) handleSendStakeToGenie(val);
                    }
                  }}
                  className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-white text-sm outline-none focus:border-sky-400"
                />
              </div>
              <button
                onClick={() => {
                  const val = AladdinTradeEngine.parseExactAmount(testStakeInput);
                  if (val !== null) handleSendStakeToGenie(val);
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Sync to PO
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 font-mono text-xs">
            {['1', '5', '10', '25'].map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  setTestStakeInput(chip);
                  handleSendStakeToGenie(parseFloat(chip));
                }}
                className={`py-1.5 rounded-lg border text-center font-semibold cursor-pointer transition-all ${
                  Math.abs(genieStatus.stake - parseFloat(chip)) < 0.001
                    ? 'bg-sky-600/30 border-sky-400 text-white'
                    : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-sky-500/50'
                }`}
              >
                ${chip}
              </button>
            ))}
          </div>

          {genieStatus.activeTrade && (
            <div className="p-2.5 bg-sky-950/35 border border-sky-500/40 rounded-lg flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-sky-300">
                Active: {genieStatus.activeTrade.direction === 'CALL' ? '▲ BUY' : '▼ SELL'} ${genieStatus.activeTrade.stake} ({genieStatus.activeTrade.asset})
              </span>
              <span className="px-2 py-0.5 bg-slate-950 border border-sky-400/40 text-white font-bold rounded-md">
                {activeRemainingSec ?? genieStatus.activeTrade.expirySec}s
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleRemoteOrder('CALL')}
              className="py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40 transition-all"
            >
              <TrendingUp className="w-4 h-4" />
              BUY ${Number.isInteger(genieStatus.stake) ? genieStatus.stake : genieStatus.stake.toFixed(2)}
            </button>
            <button
              onClick={() => handleRemoteOrder('PUT')}
              className="py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/40 transition-all"
            >
              <TrendingDown className="w-4 h-4" />
              SELL ${Number.isInteger(genieStatus.stake) ? genieStatus.stake : genieStatus.stake.toFixed(2)}
            </button>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
              <span className="text-slate-400">
                W <strong className="text-emerald-400">{genieStatus.sessionStats.wins}</strong> · L{' '}
                <strong className="text-rose-400">{genieStatus.sessionStats.losses}</strong> ({sessionWinRate}%)
              </span>
              <span className={genieStatus.sessionStats.netPnL >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                P&amp;L: {genieStatus.sessionStats.netPnL >= 0 ? '+' : ''}${genieStatus.sessionStats.netPnL.toFixed(2)}
              </span>
            </div>
            <div className="max-h-[88px] overflow-y-auto space-y-1.5">
              {genieStatus.recentTrades.length === 0 ? (
                <div className="text-slate-500 text-center py-2 text-xs font-sans">
                  No trades placed yet in this live session.
                </div>
              ) : (
                genieStatus.recentTrades.slice(0, 6).map((t, idx) => (
                  <div key={t.id || idx} className="flex justify-between items-center text-[11px] bg-slate-950/80 px-2.5 py-1.5 rounded-md border border-slate-800/60">
                    <span className={t.direction === 'CALL' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {t.direction === 'CALL' ? '▲ BUY' : '▼ SELL'} ${t.stake}
                    </span>
                    <span className="text-slate-400">{t.asset} · {t.expiry || '15s'}</span>
                    <span className={t.result === 'WIN' ? 'text-emerald-400 font-bold' : t.result === 'LOSS' ? 'text-rose-400 font-bold' : 'text-sky-300 font-bold'}>
                      {t.result || 'Open'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. MINIMAL AMOUNT-ADAPTIVE N/K & DAILY MONEY MANAGER */}
      <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              Smart Money Manager (Amount-Adaptive)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Dynamic N/K Combinatorial Staking &amp; Daily Growth Planner · Adapts Live to Your Capital &amp; Payout %
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {([
              { id: 'NK_PLAN', label: 'Smart N/K Plan' },
              { id: 'DAILY', label: 'Daily % Growth' },
            ] as { id: GenieCompMode; label: string }[]).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setCompConfig((prev) => ({ ...prev, mode: m.id }))}
                className={`px-3 py-1 rounded-lg border font-semibold cursor-pointer transition-colors ${
                  compConfig.mode === m.id
                    ? 'bg-sky-600/25 border-sky-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {compConfig.mode === 'NK_PLAN' ? (
          <div className="space-y-3.5">
            {/* N/K Preset Pills + Auto-Fit */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">Plans:</span>
                {[
                  { n: 8, k: 2 },
                  { n: 10, k: 2 },
                  { n: 11, k: 2 },
                  { n: 12, k: 2 },
                  { n: 7, k: 1 },
                  { n: 8, k: 1 },
                  { n: 9, k: 1 },
                  { n: 10, k: 1 },
                  { n: 12, k: 1 },
                ].map((preset) => {
                  const isActive = compConfig.totalTrades === preset.n && compConfig.winsNeeded === preset.k;
                  return (
                    <button
                      key={`${preset.n}/${preset.k}`}
                      type="button"
                      onClick={() => {
                        setCompConfig((p) => ({ ...p, totalTrades: preset.n, winsNeeded: preset.k }));
                        setNkSession({ tradesDone: 0, winsAchieved: 0, netPnL: 0 });
                      }}
                      className={`px-2.5 py-1 rounded-md border font-mono font-bold cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-sky-500/25 border-sky-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {preset.n}/{preset.k}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  const fit = findBestTradesForCapital(
                    effectiveCompConfig.startingCapital,
                    effectiveCompConfig.winsNeeded,
                    effectiveCompConfig.payoutPct,
                    1.0
                  );
                  setCompConfig((p) => ({ ...p, totalTrades: fit.bestN }));
                  setNkSession({ tradesDone: 0, winsAchieved: 0, netPnL: 0 });
                }}
                className="px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-semibold cursor-pointer transition-colors"
              >
                Auto-Fit to {formatCompMoney(compConfig.startingCapital, compConfig.currency)}
              </button>
            </div>

            {/* Clean Core Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-400">Session Amount</label>
                  {genieStatus.balance !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setCompConfig((p) => ({ ...p, startingCapital: Number(genieStatus.balance!.toFixed(2)) }));
                        setNkSession({ tradesDone: 0, winsAchieved: 0, netPnL: 0 });
                      }}
                      className="text-[10px] text-sky-400 hover:underline font-semibold cursor-pointer"
                    >
                      Sync PO
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={compConfig.startingCapital}
                  onChange={(e) => {
                    setCompConfig((p) => ({ ...p, startingCapital: Math.max(1, parseFloat(e.target.value) || 0) }));
                    setNkSession({ tradesDone: 0, winsAchieved: 0, netPnL: 0 });
                  }}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-white font-mono font-bold outline-none focus:border-sky-400"
                />
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                <label className="text-[11px] text-slate-400 block">Total Trades (N)</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={compConfig.totalTrades}
                  onChange={(e) => {
                    const n = Math.max(2, Math.min(20, parseInt(e.target.value, 10) || 8));
                    setCompConfig((p) => ({ ...p, totalTrades: n, winsNeeded: Math.min(p.winsNeeded, n - 1) }));
                    setNkSession({ tradesDone: 0, winsAchieved: 0, netPnL: 0 });
                  }}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-sky-300 font-mono font-bold outline-none focus:border-sky-400"
                />
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                <label className="text-[11px] text-slate-400 block">Wins Needed (K)</label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, compConfig.totalTrades - 1)}
                  value={compConfig.winsNeeded}
                  onChange={(e) => {
                    const k = Math.max(1, Math.min(compConfig.totalTrades - 1, parseInt(e.target.value, 10) || 1));
                    setCompConfig((p) => ({ ...p, winsNeeded: k }));
                    setNkSession({ tradesDone: 0, winsAchieved: 0, netPnL: 0 });
                  }}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-emerald-400 font-mono font-bold outline-none focus:border-sky-400"
                />
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between">
                  <label className="text-[11px] text-slate-400">PO Payout %</label>
                  <button
                    type="button"
                    onClick={() => setSyncLivePayout((v) => !v)}
                    className={`text-[10px] font-semibold cursor-pointer ${syncLivePayout ? 'text-emerald-400' : 'text-slate-500'}`}
                  >
                    {syncLivePayout ? 'Auto' : 'Manual'}
                  </button>
                </div>
                <input
                  type="number"
                  min={10}
                  max={100}
                  disabled={syncLivePayout}
                  value={effectiveCompConfig.payoutPct}
                  onChange={(e) => setCompConfig((p) => ({ ...p, payoutPct: Math.max(10, Math.min(100, parseFloat(e.target.value) || 92)) }))}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-emerald-400 font-mono font-bold outline-none disabled:opacity-65"
                />
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                <label className="text-[11px] text-slate-400 block">Currency</label>
                <select
                  value={compConfig.currency}
                  onChange={(e) => setCompConfig((p) => ({ ...p, currency: e.target.value as CurrencyCode }))}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-white font-mono font-bold outline-none focus:border-sky-400"
                >
                  {(Object.keys(CURRENCY_META) as CurrencyCode[]).map((code) => (
                    <option key={code} value={code}>{CURRENCY_META[code].label}</option>
                  ))}
                </select>
              </div>
            </div>

            {!nkPlanResult.fitsMinStake && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-500/35 text-xs">
                <span className="text-amber-200">
                  For {formatCompMoney(compConfig.startingCapital, compConfig.currency)} and $1.00 PO minimum trade, <strong>{compConfig.totalTrades}/{compConfig.winsNeeded}</strong> scales {nkPlanResult.coverableSteps} safe steps. Optimal ratio for your balance is <strong>{nkPlanResult.bestFitTrades}/{compConfig.winsNeeded}</strong> (+{nkPlanResult.bestFitGainPct}%).
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCompConfig((p) => ({ ...p, totalTrades: nkPlanResult.bestFitTrades }));
                    setNkSession({ tradesDone: 0, winsAchieved: 0, netPnL: 0 });
                  }}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold cursor-pointer"
                >
                  Use {nkPlanResult.bestFitTrades}/{compConfig.winsNeeded}
                </button>
              </div>
            )}

            {/* Live Action & Branch Preview Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/80 border border-amber-500/35 rounded-lg p-3 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">NEXT STAKE ({nkPlanResult.status})</span>
                  <span className="text-lg font-bold text-amber-300 font-mono">
                    ${nkPlanResult.nextStake.toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTestStakeInput(nkPlanResult.nextStake.toFixed(2));
                    handleSendStakeToGenie(nkPlanResult.nextStake);
                  }}
                  className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-xs font-bold cursor-pointer transition-colors"
                >
                  Apply to PO
                </button>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-center">
                <span className="text-[11px] text-slate-400">Session Goal Target</span>
                <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                  +{formatCompMoney(nkPlanResult.targetProfit, compConfig.currency)} (+{nkPlanResult.targetGainPct}%)
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  Target Balance: {formatCompMoney(nkPlanResult.targetCapital, compConfig.currency)}
                </span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-center">
                <span className="text-[11px] text-slate-400">Next Move Branch Preview</span>
                <div className="flex items-center gap-3 font-mono text-xs mt-1">
                  <span className="text-emerald-400 font-bold">
                    Win → {nkPlanResult.ifWinNextStake > 0 ? `$${nkPlanResult.ifWinNextStake.toFixed(2)}` : 'Goal Won'}
                  </span>
                  <span className="text-rose-400 font-bold">
                    Loss → {nkPlanResult.ifLossNextStake > 0 ? `$${nkPlanResult.ifLossNextStake.toFixed(2)}` : 'Stop'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 flex items-center justify-between gap-2">
                <div className="font-mono">
                  <span className="text-[11px] text-slate-400 block">
                    Wins {nkSession.winsAchieved}/{compConfig.winsNeeded} · Left {nkPlanResult.tradesLeft}
                  </span>
                  <span className={`text-sm font-bold ${nkSession.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {nkSession.netPnL >= 0 ? '+' : ''}{formatCompMoney(nkSession.netPnL, compConfig.currency)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={nkPlanResult.status !== 'ACTIVE'}
                    onClick={() => {
                      const pnlDelta = Number((nkPlanResult.nextStake * (effectiveCompConfig.payoutPct / 100)).toFixed(2));
                      setNkSession((s) => ({
                        tradesDone: s.tradesDone + 1,
                        winsAchieved: s.winsAchieved + 1,
                        netPnL: Number((s.netPnL + pnlDelta).toFixed(2)),
                      }));
                    }}
                    className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold cursor-pointer disabled:opacity-40"
                  >
                    +W
                  </button>
                  <button
                    type="button"
                    disabled={nkPlanResult.status !== 'ACTIVE'}
                    onClick={() => {
                      setNkSession((s) => ({
                        tradesDone: s.tradesDone + 1,
                        winsAchieved: s.winsAchieved,
                        netPnL: Number((s.netPnL - nkPlanResult.nextStake).toFixed(2)),
                      }));
                    }}
                    className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold cursor-pointer disabled:opacity-40"
                  >
                    +L
                  </button>
                  <button
                    type="button"
                    onClick={() => setNkSession({ tradesDone: 0, winsAchieved: 0, netPnL: 0 })}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold cursor-pointer"
                    title="Reset Cycle"
                  >
                    ↺
                  </button>
                </div>
              </div>
            </div>

            {/* Clean Step-by-Step Recovery Schedule */}
            <div className="border border-slate-800/80 rounded-lg overflow-hidden">
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/95 text-slate-400 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Step</th>
                      <th className="py-2 px-3">Start Bal</th>
                      <th className="py-2 px-3">Trade Stake</th>
                      <th className="py-2 px-3">Profit If Win</th>
                      <th className="py-2 px-3">Rem Bal If Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {nkPlanResult.schedule.map((row) => (
                      <tr
                        key={row.tradeIndex}
                        className={row.tradeIndex === nkSession.tradesDone + 1 ? 'bg-amber-950/25' : 'hover:bg-slate-900/40'}
                      >
                        <td className="py-1.5 px-3 font-bold text-sky-400">Trade #{row.tradeIndex}</td>
                        <td className="py-1.5 px-3 text-slate-300">{formatCompMoney(row.balanceBefore, compConfig.currency)}</td>
                        <td className="py-1.5 px-3 text-amber-300 font-bold">${row.stake.toFixed(2)}</td>
                        <td className="py-1.5 px-3 text-emerald-400">+{formatCompMoney(row.profitIfWin, compConfig.currency)}</td>
                        <td className="py-1.5 px-3 text-slate-200">{formatCompMoney(row.balanceAfterLoss, compConfig.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Simple Daily Compounding Mode */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-400">Starting Capital</label>
                  {genieStatus.balance !== null && (
                    <button
                      type="button"
                      onClick={() => setCompConfig((p) => ({ ...p, startingCapital: Number(genieStatus.balance!.toFixed(2)) }))}
                      className="text-[10px] text-sky-400 hover:underline font-semibold cursor-pointer"
                    >
                      Sync PO
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={compConfig.startingCapital}
                  onChange={(e) => setCompConfig((p) => ({ ...p, startingCapital: Math.max(1, parseFloat(e.target.value) || 0) }))}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-white font-mono font-bold outline-none focus:border-sky-400"
                />
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                <label className="text-[11px] text-slate-400 block">Currency</label>
                <select
                  value={compConfig.currency}
                  onChange={(e) => setCompConfig((p) => ({ ...p, currency: e.target.value as CurrencyCode }))}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-white font-mono font-bold outline-none focus:border-sky-400"
                >
                  {(Object.keys(CURRENCY_META) as CurrencyCode[]).map((code) => (
                    <option key={code} value={code}>{CURRENCY_META[code].label}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                <label className="text-[11px] text-slate-400 block">Target Goal</label>
                <input
                  type="number"
                  min={10}
                  step="any"
                  value={compConfig.targetGoal}
                  onChange={(e) => setCompConfig((p) => ({ ...p, targetGoal: Math.max(10, parseFloat(e.target.value) || 0) }))}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-emerald-400 font-mono font-bold outline-none focus:border-sky-400"
                />
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                <label className="text-[11px] text-slate-400 block">Daily Goal %</label>
                <input
                  type="number"
                  min={0.5}
                  max={200}
                  step="0.5"
                  value={compConfig.dailyTargetPct}
                  onChange={(e) => setCompConfig((p) => ({ ...p, dailyTargetPct: Math.max(0.5, parseFloat(e.target.value) || 0) }))}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-sky-300 font-mono font-bold outline-none focus:border-sky-400"
                />
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-400">Reinvest Split</label>
                  <span className="text-[10px] font-mono text-emerald-400">{compConfig.reinvestPct}% / {100 - compConfig.reinvestPct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={compConfig.reinvestPct}
                  onChange={(e) => setCompConfig((p) => ({ ...p, reinvestPct: parseInt(e.target.value, 10) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                <label className="text-[11px] text-slate-400 block">Trading Days</label>
                <select
                  value={compConfig.activeDays}
                  onChange={(e) => setCompConfig((p) => ({ ...p, activeDays: e.target.value as ActiveTradingDays }))}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-white font-semibold outline-none focus:border-sky-400"
                >
                  <option value="ALL_7">All 7 Days</option>
                  <option value="MON_FRI">Mon – Fri</option>
                  <option value="WEEKENDS">Sat – Sun</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg">
              <button
                type="button"
                onClick={() => setShowRiskDrawer((v) => !v)}
                className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                  More Risk &amp; Cash Flow Options
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {showRiskDrawer ? 'Hide ▴' : 'Open ▾'}
                </span>
              </button>

              {showRiskDrawer && (
                <div className="p-3 pt-1 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block">Horizon (Days)</label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={compConfig.horizonDays}
                      onChange={(e) => setCompConfig((p) => ({ ...p, horizonDays: Math.max(5, Math.min(120, parseInt(e.target.value, 10) || 25)) }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-[10px] text-slate-400">Win Rate %</label>
                      <label className="flex items-center gap-1 text-[10px] text-sky-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compConfig.useWinRateDrag}
                          onChange={(e) => setCompConfig((p) => ({ ...p, useWinRateDrag: e.target.checked }))}
                        />
                        Cap
                      </label>
                    </div>
                    <input
                      type="number"
                      min={20}
                      max={99}
                      value={compConfig.winRatePct}
                      onChange={(e) => setCompConfig((p) => ({ ...p, winRatePct: Math.max(20, Math.min(99, parseFloat(e.target.value) || 72)) }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block">Risk/Trade % · Trades/d</label>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="number"
                        min={0.5}
                        max={50}
                        step="0.5"
                        value={compConfig.riskPerTradePct}
                        onChange={(e) => setCompConfig((p) => ({ ...p, riskPerTradePct: Math.max(0.5, parseFloat(e.target.value) || 3) }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white font-mono outline-none"
                      />
                      <input
                        type="number"
                        min={1}
                        max={40}
                        value={compConfig.tradesPerDay}
                        onChange={(e) => setCompConfig((p) => ({ ...p, tradesPerDay: Math.max(1, parseInt(e.target.value, 10) || 6) }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white font-mono outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block">Recurring Cash Flow</label>
                    <div className="grid grid-cols-3 gap-1">
                      <select
                        value={compConfig.cashFlowType}
                        onChange={(e) => setCompConfig((p) => ({ ...p, cashFlowType: e.target.value as CashFlowType }))}
                        className="bg-slate-950 border border-slate-700 rounded px-1 py-1 text-white outline-none text-[10px]"
                      >
                        <option value="NONE">Off</option>
                        <option value="DEPOSIT">+Dep</option>
                        <option value="WITHDRAW">-Wdr</option>
                      </select>
                      <select
                        value={compConfig.cashFlowFreq}
                        onChange={(e) => setCompConfig((p) => ({ ...p, cashFlowFreq: e.target.value as CashFlowFreq }))}
                        className="bg-slate-950 border border-slate-700 rounded px-1 py-1 text-white outline-none text-[10px]"
                      >
                        <option value="WEEKLY">Wk</option>
                        <option value="MONTHLY">Mo</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={compConfig.cashFlowAmount}
                        onChange={(e) => setCompConfig((p) => ({ ...p, cashFlowAmount: Math.max(0, parseFloat(e.target.value) || 0) }))}
                        className="bg-slate-950 border border-slate-700 rounded px-1 py-1 text-white font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
                <span className="text-[11px] text-slate-400 block">Projected Balance</span>
                <div className="text-base font-bold text-white font-mono mt-0.5">
                  {formatCompMoney(compResult.summary.finalBalance, compConfig.currency)}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
                <span className="text-[11px] text-slate-400 block">Safe Withdrawn</span>
                <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                  +{formatCompMoney(compResult.summary.totalWithdrawn, compConfig.currency)}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
                <span className="text-[11px] text-slate-400 block">Goal ETA</span>
                <div className="text-base font-bold text-sky-400 font-mono mt-0.5">
                  {compResult.summary.estPeriodsToGoal ? `${compResult.summary.estPeriodsToGoal}d · ${compResult.summary.projectedGoalDate}` : 'Adjust %'}
                </div>
              </div>
              <div className="bg-slate-900/80 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">Base Trade Stake</span>
                  <span className="text-base font-bold text-amber-300 font-mono">
                    ${compResult.summary.nextRecommendedStake.toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTestStakeInput(compResult.summary.nextRecommendedStake.toFixed(2));
                    handleSendStakeToGenie(compResult.summary.nextRecommendedStake);
                  }}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-xs font-bold cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="border border-slate-800/80 rounded-lg overflow-hidden">
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/95 text-slate-400 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Day</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Trade Stake</th>
                      <th className="py-2 px-3">Pocket</th>
                      <th className="py-2 px-3">End Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {compResult.rows.map((r) => (
                      <tr key={r.index} className="hover:bg-slate-900/40">
                        <td className="py-1.5 px-3 font-bold text-sky-400">{r.label}</td>
                        <td className="py-1.5 px-3 text-slate-400">{r.dateStr}</td>
                        <td className="py-1.5 px-3 text-amber-300 font-semibold">${r.stake.toFixed(2)}</td>
                        <td className="py-1.5 px-3 text-emerald-400">+{formatCompMoney(r.withdrawn, compConfig.currency)}</td>
                        <td className="py-1.5 px-3 font-bold text-white">{formatCompMoney(r.endBalance, compConfig.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. AUTO-LOADER & BROWSER EXTENSION DISTRIBUTION */}
      <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Auto-Update Bridge &amp; Extension Package
          </span>
          <div className="flex items-center gap-4 text-xs font-medium">
            <a
              href="/aladdin-sniper-extension.zip"
              download
              className="text-sky-400 hover:underline flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download Extension ZIP (Edge / Chrome / Lemur)
            </a>
            <a
              href="/privacy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-200 hover:underline"
            >
              Privacy Policy
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/aladdin-pocket-bridge.user.js"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            1-Tap Install Direct Script
          </a>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/aladdin-pocket-bridge.user.js`);
              setCopiedUrl('direct');
              setTimeout(() => setCopiedUrl(null), 2500);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs rounded-lg cursor-pointer transition-colors"
          >
            {copiedUrl === 'direct' ? 'Direct URL Copied ✓' : 'Copy Direct Script URL'}
          </button>
          <a
            href={AUTO_LOADER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            1-Tap Install Auto-Loader (GitHub)
          </a>
          <button
            onClick={() => {
              navigator.clipboard.writeText(AUTO_LOADER_URL);
              setCopiedUrl('loader');
              setTimeout(() => setCopiedUrl(null), 2500);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs rounded-lg cursor-pointer transition-colors"
          >
            {copiedUrl === 'loader' ? 'Auto-Loader URL Copied ✓' : 'Copy Auto-Loader URL'}
          </button>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 font-mono text-xs">
          <span className="text-sky-300 truncate">{AUTO_LOADER_URL}</span>
          <span className="text-[11px] text-emerald-400 font-semibold shrink-0">GitHub Auto-Loader</span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Use <strong className="text-emerald-400">1-Tap Install Auto-Loader (GitHub)</strong> once for automatic updates on refresh, or download <code className="text-slate-300">aladdin-sniper-extension.zip</code>.
        </p>
      </div>
    </div>
  );
};
