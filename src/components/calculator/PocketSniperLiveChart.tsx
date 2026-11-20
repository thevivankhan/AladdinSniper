import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export interface ActiveTradeOrder {
  id: string;
  direction: 'BUY' | 'SELL';
  stake: number;
  entryPrice: number;
  entryTime: number;
  durationSec: number;
  expiryTime: number;
  asset: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SniperSignal {
  id: string;
  time: number;
  candleIndex: number;
  direction: 'CALL' | 'PUT';
  price: number;
  confidence: number;
  reason: string;
}

export interface GenuineSR {
  resistancePrice: number;
  supportPrice: number;
  pivotPrice: number;
  resLabel: string;
  supLabel: string;
}

interface PocketSniperLiveChartProps {
  asset: string;
  onAssetChange?: (asset: string) => void;
  payoutRate: number;
  nextStake: number;
  activeOrder: ActiveTradeOrder | null;
  onTradeSettled: (result: 'WIN' | 'LOSS', order: ActiveTradeOrder, exitPrice: number) => void;
  onOrderTrigger?: (direction: 'BUY' | 'SELL', durationSec: number, currentPrice: number) => void;
  selectedDuration?: number;
  onDurationChange?: (sec: number) => void;
  onPriceChange?: (price: number) => void;
  isSessionActive?: boolean;
}

// Realistic currency specifications with authentic OTC precision
export const ASSET_SPECS: Record<string, { base: number; decimals: number; pip: number; name: string }> = {
  'AUD/CHF OTC': { base: 0.57245, decimals: 5, pip: 0.0001, name: 'AUD/CHF OTC' },
  'AUD/USD OTC': { base: 0.65420, decimals: 5, pip: 0.0001, name: 'AUD/USD OTC' },
  'EUR/USD OTC': { base: 1.08450, decimals: 5, pip: 0.0001, name: 'EUR/USD OTC' },
  'USD/SGD OTC': { base: 1.31210, decimals: 5, pip: 0.0001, name: 'USD/SGD OTC' },
  'GBP/USD OTC': { base: 1.29830, decimals: 5, pip: 0.0001, name: 'GBP/USD OTC' },
  'USD/JPY OTC': { base: 152.450, decimals: 3, pip: 0.01, name: 'USD/JPY OTC' },
  'USD/CHF OTC': { base: 0.86540, decimals: 5, pip: 0.0001, name: 'USD/CHF OTC' },
  'USD/CAD OTC': { base: 1.38540, decimals: 5, pip: 0.0001, name: 'USD/CAD OTC' },
  'NZD/USD OTC': { base: 0.59620, decimals: 5, pip: 0.0001, name: 'NZD/USD OTC' },
  'EUR/JPY OTC': { base: 165.220, decimals: 3, pip: 0.01, name: 'EUR/JPY OTC' },
  'GBP/JPY OTC': { base: 197.840, decimals: 3, pip: 0.01, name: 'GBP/JPY OTC' },
  'AUD/CAD OTC': { base: 0.90680, decimals: 5, pip: 0.0001, name: 'AUD/CAD OTC' },
  'EUR/GBP OTC': { base: 0.83540, decimals: 5, pip: 0.0001, name: 'EUR/GBP OTC' },
};

const DEFAULT_SPEC = { base: 1.08450, decimals: 5, pip: 0.0001, name: 'EUR/USD OTC' };

// Available Candlestick Timeframes
const CANDLE_TIMEFRAMES = [
  { label: '5s', sec: 5 },
  { label: '10s', sec: 10 },
  { label: '15s', sec: 15 },
  { label: '30s', sec: 30 },
  { label: '1m', sec: 60 },
  { label: '5m', sec: 300 },
  { label: '15m', sec: 900 },
];

// Available Expiry Durations
const EXPIRY_DURATIONS = [
  { label: '5s', sec: 5 },
  { label: '10s', sec: 10 },
  { label: '15s', sec: 15 },
  { label: '30s', sec: 30 },
  { label: '1m', sec: 60 },
  { label: '2m', sec: 120 },
  { label: '5m', sec: 300 },
];

// Color Palette
const COLOR_BG = '#071018';
const COLOR_BULL = '#00E575'; // Vibrant Neon Green
const COLOR_BEAR = '#FF1A53'; // Vibrant Crimson Red
const COLOR_GRID_DOT = 'rgba(255, 255, 255, 0.06)';
const COLOR_AXIS_TEXT = '#64748b'; // Muted Slate
const COLOR_EMA20 = '#22d3ee'; // Cyan
const COLOR_EMA50 = '#f59e0b'; // Amber
const COLOR_BOLLINGER = 'rgba(168, 85, 247, 0.8)'; // Purple

// Authentic Real Support & Resistance (Single genuine ceiling and single genuine floor from swing pivots)
const calculateGenuineSR = (
  candles: Candle[],
  curPrice: number,
  spec: { pip: number; decimals: number }
): GenuineSR => {
  if (candles.length < 10) {
    const res = Number((curPrice + spec.pip * 5).toFixed(spec.decimals));
    const sup = Number((curPrice - spec.pip * 5).toFixed(spec.decimals));
    return {
      resistancePrice: res,
      supportPrice: sup,
      pivotPrice: curPrice,
      resLabel: `RES ${res.toFixed(spec.decimals <= 3 ? spec.decimals : 4)}`,
      supLabel: `SUP ${sup.toFixed(spec.decimals <= 3 ? spec.decimals : 4)}`,
    };
  }

  const slice = candles.slice(-45);

  // Detect genuine swing highs and swing lows (5-candle fractal)
  const confirmedHighs: number[] = [];
  const confirmedLows: number[] = [];

  for (let i = 2; i < slice.length - 2; i++) {
    const c = slice[i];
    if (
      c.high >= slice[i - 1].high &&
      c.high >= slice[i - 2].high &&
      c.high >= slice[i + 1].high &&
      c.high >= slice[i + 2].high
    ) {
      confirmedHighs.push(c.high);
    }
    if (
      c.low <= slice[i - 1].low &&
      c.low <= slice[i - 2].low &&
      c.low <= slice[i + 1].low &&
      c.low <= slice[i + 2].low
    ) {
      confirmedLows.push(c.low);
    }
  }

  const maxHigh = Math.max(...slice.map((c) => c.high));
  const minLow = Math.min(...slice.map((c) => c.low));

  // Find genuine resistance strictly above current price
  const highsAbove = confirmedHighs.filter((h) => h >= curPrice + spec.pip * 0.4);
  const resistancePrice = highsAbove.length > 0 ? Math.min(...highsAbove) : maxHigh;

  // Find genuine support strictly below current price
  const lowsBelow = confirmedLows.filter((l) => l <= curPrice - spec.pip * 0.4);
  const supportPrice = lowsBelow.length > 0 ? Math.max(...lowsBelow) : minLow;

  const pivotPrice = Number(((resistancePrice + supportPrice) * 0.5).toFixed(spec.decimals));

  return {
    resistancePrice: Number(resistancePrice.toFixed(spec.decimals)),
    supportPrice: Number(supportPrice.toFixed(spec.decimals)),
    pivotPrice,
    resLabel: `RES ${resistancePrice.toFixed(spec.decimals <= 3 ? spec.decimals : 4)}`,
    supLabel: `SUP ${supportPrice.toFixed(spec.decimals <= 3 ? spec.decimals : 4)}`,
  };
};

// Calculate 14-period RSI
const calculateRSI = (candles: Candle[], period: number = 14): number => {
  if (candles.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  const recent = candles.slice(-period - 1);
  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i].close - recent[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return Number((100 - 100 / (1 + rs)).toFixed(1));
};

export const PocketSniperLiveChart: React.FC<PocketSniperLiveChartProps> = ({
  asset,
  onAssetChange,
  payoutRate,
  nextStake = 10,
  activeOrder,
  onTradeSettled,
  onOrderTrigger: _onOrderTrigger,
  selectedDuration = 15,
  onDurationChange,
  onPriceChange,
  isSessionActive: _isSessionActive = true,
}) => {
  // Chart Visibility State
  const [isChartVisible, setIsChartVisible] = useState<boolean>(true);

  // Timeframe and Expiry Selection
  const [candleTfSec, setCandleTfSec] = useState<number>(5); // Default 5s
  const [expirySec, setExpirySec] = useState<number>(selectedDuration || 15); // Default 15s

  // Strategy & Indicator Toggles
  const [activeStrategyMode, setActiveStrategyMode] = useState<'clean' | 'ema' | 'bollinger' | 'volume'>('clean');
  const [showSRLevels, setShowSRLevels] = useState<boolean>(true); // Real Support & Resistance
  const [showSniperAI, setShowSniperAI] = useState<boolean>(true); // Sniper AI Signal

  // Chart Style & Zoom
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showAssetDropdown, setShowAssetDropdown] = useState<boolean>(false);

  // Real-time Countdown Timer for live candle
  const [candleSecondsLeft, setCandleSecondsLeft] = useState<number>(5);
  const candleSecondsLeftRef = useRef<number>(5);

  const currentSpec = ASSET_SPECS[asset] || DEFAULT_SPEC;
  const specRef = useRef(currentSpec);
  specRef.current = currentSpec;

  // Real-time Sniper AI Signal State that dynamically switches between BUY (green) and SELL (red)
  const [liveAiSignal, setLiveAiSignal] = useState<{
    direction: 'BUY' | 'SELL';
    confidence: number;
    reason: string;
  }>({
    direction: 'BUY',
    confidence: 97,
    reason: 'S/R Support Rebound',
  });

  // Real-time Floating Trade Status (ITM = Green Profit, OTM = Red Loss, ATM = Yellow Tie)
  const [activeTradeStatus, setActiveTradeStatus] = useState<{
    status: 'ITM' | 'OTM' | 'ATM';
    pnl: number;
    secondsLeft: number;
  }>({
    status: 'ITM',
    pnl: Number((10 * (payoutRate / 100)).toFixed(2)),
    secondsLeft: 5,
  });

  // Refs for 60fps canvas animation & synchronization
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const candlesRef = useRef<Candle[]>([]);
  const currentPriceRef = useRef<number>(currentSpec.base);
  const targetPriceRef = useRef<number>(currentSpec.base);
  const renderedPriceRef = useRef<number>(currentSpec.base);
  const lastSignalTimeRef = useRef<number>(0);
  const sniperSignalsRef = useRef<SniperSignal[]>([]);
  const settledOrderIdRef = useRef<string | null>(null);

  // Genuine Real Support & Resistance Levels (Single real resistance, single real support)
  const srLevelsRef = useRef<GenuineSR>({
    resistancePrice: 0,
    supportPrice: 0,
    pivotPrice: 0,
    resLabel: '',
    supLabel: '',
  });

  // Stable callback refs
  const onPriceChangeRef = useRef(onPriceChange);
  onPriceChangeRef.current = onPriceChange;

  const onTradeSettledRef = useRef(onTradeSettled);
  onTradeSettledRef.current = onTradeSettled;

  // Sync expiry if prop changes from outside
  useEffect(() => {
    if (selectedDuration && selectedDuration !== expirySec) {
      setExpirySec(selectedDuration);
    }
  }, [selectedDuration]);

  // Handle Expiry selection
  const handleSelectExpiry = (sec: number) => {
    setExpirySec(sec);
    onDurationChange?.(sec);
  };

  // 1. Initialize candle series whenever asset or timeframe changes
  useEffect(() => {
    const spec = specRef.current;
    const count = 65;
    const now = Date.now();
    const periodMs = candleTfSec * 1000;
    const history: Candle[] = [];

    let curClose = spec.base;
    let wave = (Math.random() - 0.49) * 0.4;
    let waveSteps = Math.floor(6 + Math.random() * 8);

    for (let i = count; i >= 0; i--) {
      const t = now - i * periodMs;
      waveSteps--;
      if (waveSteps <= 0) {
        wave = (Math.random() - 0.495) * 0.45;
        waveSteps = Math.floor(6 + Math.random() * 8);
      }

      const open = curClose;
      const step = spec.pip * (0.8 + Math.random() * 1.4);
      const delta = (wave + (Math.random() - 0.5) * 0.7) * step;
      const close = Number((open + delta).toFixed(spec.decimals));

      const wickUp = Math.random() * step * 0.9;
      const wickDown = Math.random() * step * 0.9;
      const high = Number((Math.max(open, close) + wickUp).toFixed(spec.decimals));
      const low = Number((Math.min(open, close) - wickDown).toFixed(spec.decimals));

      history.push({
        time: t,
        open,
        high,
        low,
        close,
        volume: Math.floor(100 + Math.random() * 200),
      });

      curClose = close;
    }

    candlesRef.current = history;
    currentPriceRef.current = curClose;
    targetPriceRef.current = curClose;
    renderedPriceRef.current = curClose;
    onPriceChangeRef.current?.(curClose);

    // Calculate genuine Support and Resistance from real price peaks/troughs
    const genuineSR = calculateGenuineSR(history, curClose, spec);
    srLevelsRef.current = genuineSR;

    // Realistic initial signals
    const initSignals: SniperSignal[] = [
      {
        id: 'init-1',
        time: now - periodMs * 16,
        candleIndex: count - 16,
        direction: 'CALL',
        price: history[count - 16]?.low || curClose,
        confidence: 97,
        reason: 'Real Support Bounce',
      },
      {
        id: 'init-2',
        time: now - periodMs * 6,
        candleIndex: count - 6,
        direction: 'PUT',
        price: history[count - 6]?.high || curClose,
        confidence: 94,
        reason: 'Real Resistance Rejection',
      },
    ];

    sniperSignalsRef.current = initSignals;

    // Set header AI badge to match the latest signal (init-2 was PUT -> SELL 94%)
    const latest = initSignals[initSignals.length - 1];
    setLiveAiSignal({
      direction: latest.direction === 'CALL' ? 'BUY' : 'SELL',
      confidence: latest.confidence,
      reason: latest.reason,
    });
  }, [asset, candleTfSec]);

  // 2. Realistic Dynamic Live Market Engine
  useEffect(() => {
    const wave = { bias: 0.08, steps: 16 };
    let lastSecondReported = -1;

    setCandleSecondsLeft(candleTfSec);
    candleSecondsLeftRef.current = candleTfSec;

    const interval = setInterval(() => {
      const list = candlesRef.current;
      if (list.length === 0) return;

      const spec = specRef.current;
      const now = Date.now();
      const periodMs = candleTfSec * 1000;
      const last = list[list.length - 1];

      // Dynamic wave physics
      wave.steps--;
      if (wave.steps <= 0) {
        wave.bias = (Math.random() - 0.495) * 0.4;
        wave.steps = Math.floor(12 + Math.random() * 16);
      }

      // Natural micro-ticks
      const noise = (Math.random() - 0.5) * spec.pip * 0.28;
      const trend = wave.bias * spec.pip * 0.16;
      const delta = noise + trend;

      const newClose = Number((last.close + delta).toFixed(spec.decimals));
      targetPriceRef.current = newClose;
      currentPriceRef.current = newClose;

      // Real-time trade computation (ITM = Green Profit, OTM = Red Loss, ATM = Yellow Breakeven)
      const isBuy = (activeOrder ? activeOrder.direction : liveAiSignal.direction) === 'BUY';
      const entryPrice = activeOrder ? activeOrder.entryPrice : last.open;
      const diff = newClose - entryPrice;
      const pipThresh = spec.pip * 0.08;

      let st: 'ITM' | 'OTM' | 'ATM' = 'ATM';
      if (Math.abs(diff) < pipThresh) {
        st = 'ATM';
      } else if (isBuy ? diff > 0 : diff < 0) {
        st = 'ITM';
      } else {
        st = 'OTM';
      }

      const stakeVal = activeOrder ? activeOrder.stake : (typeof nextStake === 'number' && nextStake > 0 ? nextStake : 10);
      const profit = stakeVal * (payoutRate / 100);
      const pnl = st === 'ITM' ? profit : st === 'OTM' ? -stakeVal : 0;

      const elapsed = now - last.time;
      const secondsRemaining = Math.max(1, Math.ceil((periodMs - elapsed) / 1000));
      const secLeft = activeOrder ? Math.max(0, Math.ceil((activeOrder.expiryTime - now) / 1000)) : secondsRemaining;

      setActiveTradeStatus({
        status: st,
        pnl: Number(pnl.toFixed(2)),
        secondsLeft: secLeft,
      });

      // 1-second countdown clock update
      if (secondsRemaining !== lastSecondReported) {
        lastSecondReported = secondsRemaining;
        setCandleSecondsLeft(secondsRemaining);
        candleSecondsLeftRef.current = secondsRemaining;
      }

      if (elapsed >= periodMs) {
        // Complete current candle exactly at timeframe duration and seal it
        const newCandle: Candle = {
          time: now,
          open: last.close,
          high: Math.max(last.close, newClose),
          low: Math.min(last.close, newClose),
          close: newClose,
          volume: Math.floor(100 + Math.random() * 120),
        };

        const updatedHistory = [...list.slice(1), newCandle];
        candlesRef.current = updatedHistory;
        lastSecondReported = candleTfSec;
        setCandleSecondsLeft(candleTfSec);
        candleSecondsLeftRef.current = candleTfSec;

        // Update Genuine Support and Resistance (only on candle completion!)
        const genuineSR = calculateGenuineSR(updatedHistory, newClose, spec);
        srLevelsRef.current = genuineSR;

        // Evaluate Sniper AI Signals on candle close
        const rsiVal = calculateRSI(updatedHistory, 14);
        const nearSupport = newClose <= genuineSR.supportPrice + spec.pip * 0.8;
        const nearResistance = newClose >= genuineSR.resistancePrice - spec.pip * 0.8;
        const isBullishCandle = newClose > last.open;
        const timeSinceLastSignal = now - lastSignalTimeRef.current;

        // Dynamic Signal Generation: alternates between BUY and SELL when genuine market conditions are met
        if ((nearSupport || rsiVal <= 36) && timeSinceLastSignal > 20000) {
          const conf = Math.min(98, Math.max(92, Math.round(93 + (40 - Math.min(40, rsiVal)) * 0.35 + Math.random() * 2)));
          const sig: SniperSignal = {
            id: `sig_${now}`,
            time: now,
            candleIndex: updatedHistory.length - 1,
            direction: 'CALL',
            price: newCandle.low,
            confidence: conf,
            reason: `Support Bounce (${conf}%)`,
          };
          lastSignalTimeRef.current = now;
          sniperSignalsRef.current = [...sniperSignalsRef.current.slice(-4), sig];

          // Top Header Badge IMMEDIATELY updates to GREEN BUY with exact confidence
          setLiveAiSignal({
            direction: 'BUY',
            confidence: conf,
            reason: sig.reason,
          });
        } else if ((nearResistance || rsiVal >= 64) && timeSinceLastSignal > 20000) {
          const conf = Math.min(98, Math.max(91, Math.round(92 + (Math.max(60, rsiVal) - 60) * 0.35 + Math.random() * 2)));
          const sig: SniperSignal = {
            id: `sig_${now}`,
            time: now,
            candleIndex: updatedHistory.length - 1,
            direction: 'PUT',
            price: newCandle.high,
            confidence: conf,
            reason: `Resistance Rejection (${conf}%)`,
          };
          lastSignalTimeRef.current = now;
          sniperSignalsRef.current = [...sniperSignalsRef.current.slice(-4), sig];

          // Top Header Badge IMMEDIATELY updates to RED SELL with exact confidence
          setLiveAiSignal({
            direction: 'SELL',
            confidence: conf,
            reason: sig.reason,
          });
        } else if (isBullishCandle && rsiVal > 52 && timeSinceLastSignal > 30000) {
          // Bullish Momentum Trigger
          const conf = Math.round(93 + Math.random() * 3);
          const sig: SniperSignal = {
            id: `sig_${now}`,
            time: now,
            candleIndex: updatedHistory.length - 1,
            direction: 'CALL',
            price: newCandle.low,
            confidence: conf,
            reason: `Bullish Trend (${conf}%)`,
          };
          lastSignalTimeRef.current = now;
          sniperSignalsRef.current = [...sniperSignalsRef.current.slice(-4), sig];
          setLiveAiSignal({
            direction: 'BUY',
            confidence: conf,
            reason: sig.reason,
          });
        } else if (!isBullishCandle && rsiVal < 48 && timeSinceLastSignal > 30000) {
          // Bearish Momentum Trigger
          const conf = Math.round(92 + Math.random() * 3);
          const sig: SniperSignal = {
            id: `sig_${now}`,
            time: now,
            candleIndex: updatedHistory.length - 1,
            direction: 'PUT',
            price: newCandle.high,
            confidence: conf,
            reason: `Bearish Trend (${conf}%)`,
          };
          lastSignalTimeRef.current = now;
          sniperSignalsRef.current = [...sniperSignalsRef.current.slice(-4), sig];
          setLiveAiSignal({
            direction: 'SELL',
            confidence: conf,
            reason: sig.reason,
          });
        }
      } else {
        last.high = Math.max(last.high, newClose);
        last.low = Math.min(last.low, newClose);
        last.close = newClose;
        last.volume += 1;
      }

      onPriceChangeRef.current?.(newClose);
    }, 250);

    return () => clearInterval(interval);
  }, [candleTfSec]);

  // 3. Active Trade Settlement Monitor
  useEffect(() => {
    if (!activeOrder) return;

    const timer = setInterval(() => {
      if (settledOrderIdRef.current === activeOrder.id) return;

      const now = Date.now();
      const diffMs = activeOrder.expiryTime - now;

      if (diffMs <= 0) {
        settledOrderIdRef.current = activeOrder.id;
        const exitPrice = currentPriceRef.current;
        const isBuy = activeOrder.direction === 'BUY';
        const isWin = isBuy ? exitPrice > activeOrder.entryPrice : exitPrice < activeOrder.entryPrice;
        onTradeSettledRef.current?.(isWin ? 'WIN' : 'LOSS', activeOrder, exitPrice);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [activeOrder]);

  // 4. 60 FPS Canvas Render Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      const list = candlesRef.current;
      if (list.length === 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      renderedPriceRef.current += (targetPriceRef.current - renderedPriceRef.current) * 0.20;
      const liveP = renderedPriceRef.current;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;

      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width = W * dpr;
        canvas.height = H * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep dark navy canvas background
      ctx.fillStyle = COLOR_BG;
      ctx.fillRect(0, 0, W, H);

      const spec = specRef.current;
      const rightMargin = 58;
      const chartW = W - rightMargin;
      const topPadding = 18;
      const bottomPadding = 20;
      const chartH = H - topPadding - bottomPadding;

      // Price domain
      const visibleCount = Math.max(15, Math.min(list.length, Math.round(34 / zoomLevel)));
      const visibleCandles = list.slice(-visibleCount);

      let minP = Math.min(...visibleCandles.map((c) => c.low), liveP);
      let maxP = Math.max(...visibleCandles.map((c) => c.high), liveP);

      if (activeOrder) {
        minP = Math.min(minP, activeOrder.entryPrice);
        maxP = Math.max(maxP, activeOrder.entryPrice);
      }

      const pRange = maxP - minP || spec.pip * 10;
      const padding = pRange * 0.14;
      const domainMin = minP - padding;
      const domainMax = maxP + padding;
      const domainRange = domainMax - domainMin;

      const getY = (val: number) => {
        return topPadding + (1 - (val - domainMin) / domainRange) * chartH;
      };

      // 4A. Horizontal Dotted Grid Lines & Price Labels
      const gridLevelsCount = 5;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = COLOR_AXIS_TEXT;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let i = 0; i <= gridLevelsCount; i++) {
        const p = domainMin + (domainRange * i) / gridLevelsCount;
        const y = getY(p);

        ctx.beginPath();
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = COLOR_GRID_DOT;
        ctx.lineWidth = 1;
        ctx.moveTo(0, y);
        ctx.lineTo(chartW + 6, y);
        ctx.stroke();
        ctx.setLineDash([]);

        const formattedPrice = p >= 10 ? p.toFixed(2) : p >= 1 ? p.toFixed(2) : p.toFixed(4);
        ctx.fillText(formattedPrice, W - 6, y);
      }

      // 4B. REAL SUPPORT & RESISTANCE STRATEGY LINES (Clean single ceiling & single floor, no clutter!)
      if (showSRLevels) {
        const sr = srLevelsRef.current;

        // 1. Genuine Resistance Line (Ceiling)
        if (sr.resistancePrice > 0 && sr.resistancePrice >= domainMin && sr.resistancePrice <= domainMax) {
          const resY = getY(sr.resistancePrice);

          ctx.beginPath();
          ctx.setLineDash([5, 3]);
          ctx.strokeStyle = 'rgba(255, 26, 83, 0.75)';
          ctx.lineWidth = 1.2;
          ctx.moveTo(0, resY);
          ctx.lineTo(chartW, resY);
          ctx.stroke();

          // Clean Pill Tag on Left
          const tagW = 52;
          const tagH = 14;
          const tagY = resY - tagH - 2;

          ctx.fillStyle = 'rgba(255, 26, 83, 0.22)';
          ctx.fillRect(8, tagY, tagW, tagH);

          ctx.strokeStyle = '#ff1a53';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(8, tagY, tagW, tagH);

          ctx.fillStyle = '#ff4d79';
          ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('RESISTANCE', 8 + tagW * 0.5, tagY + tagH * 0.5);
        }

        // 2. Genuine Support Line (Floor)
        if (sr.supportPrice > 0 && sr.supportPrice >= domainMin && sr.supportPrice <= domainMax) {
          const supY = getY(sr.supportPrice);

          ctx.beginPath();
          ctx.setLineDash([5, 3]);
          ctx.strokeStyle = 'rgba(0, 229, 117, 0.75)';
          ctx.lineWidth = 1.2;
          ctx.moveTo(0, supY);
          ctx.lineTo(chartW, supY);
          ctx.stroke();

          // Clean Pill Tag on Left
          const tagW = 46;
          const tagH = 14;
          const tagY = supY + 2;

          ctx.fillStyle = 'rgba(0, 229, 117, 0.22)';
          ctx.fillRect(8, tagY, tagW, tagH);

          ctx.strokeStyle = '#00e575';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(8, tagY, tagW, tagH);

          ctx.fillStyle = '#00e575';
          ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('SUPPORT', 8 + tagW * 0.5, tagY + tagH * 0.5);
        }

        ctx.setLineDash([]);
      }

      // 4C. Candlestick geometry
      const stepX = chartW / visibleCount;
      const candleWidth = Math.max(4, stepX * 0.68);

      const candlePositions: { x: number; candle: Candle; index: number }[] = [];
      visibleCandles.forEach((c, idx) => {
        const x = idx * stepX + stepX * 0.5;
        candlePositions.push({ x, candle: c, index: list.length - visibleCount + idx });
      });

      // 4D. Indicators: 20/50 EMA Strategy
      if (activeStrategyMode === 'ema' && list.length >= 20) {
        const calcEMA = (period: number) => {
          const k = 2 / (period + 1);
          let ema = list[0].close;
          const points: { x: number; y: number }[] = [];

          list.forEach((c, i) => {
            ema = c.close * k + ema * (1 - k);
            const visIdx = i - (list.length - visibleCount);
            if (visIdx >= 0) {
              const x = visIdx * stepX + stepX * 0.5;
              points.push({ x, y: getY(ema) });
            }
          });
          return points;
        };

        const ema20Points = calcEMA(20);
        if (ema20Points.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = COLOR_EMA20;
          ctx.lineWidth = 1.5;
          ema20Points.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
        }

        if (list.length >= 50) {
          const ema50Points = calcEMA(50);
          if (ema50Points.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = COLOR_EMA50;
            ctx.lineWidth = 1.5;
            ema50Points.forEach((pt, i) => {
              if (i === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
          }
        }
      }

      // 4E. Indicators: Bollinger Bands Strategy
      if (activeStrategyMode === 'bollinger' && list.length >= 20) {
        const period = 20;
        const upperPts: { x: number; y: number }[] = [];
        const lowerPts: { x: number; y: number }[] = [];
        const midPts: { x: number; y: number }[] = [];

        list.forEach((_, i) => {
          if (i >= period - 1) {
            const slice = list.slice(i - period + 1, i + 1);
            const mean = slice.reduce((acc, c) => acc + c.close, 0) / period;
            const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
            const std = Math.sqrt(variance);

            const visIdx = i - (list.length - visibleCount);
            if (visIdx >= 0) {
              const x = visIdx * stepX + stepX * 0.5;
              midPts.push({ x, y: getY(mean) });
              upperPts.push({ x, y: getY(mean + std * 2) });
              lowerPts.push({ x, y: getY(mean - std * 2) });
            }
          }
        });

        if (upperPts.length > 1) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(168, 85, 247, 0.06)';
          upperPts.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          for (let i = lowerPts.length - 1; i >= 0; i--) {
            ctx.lineTo(lowerPts[i].x, lowerPts[i].y);
          }
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.strokeStyle = COLOR_BOLLINGER;
          ctx.lineWidth = 1.2;
          upperPts.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();

          ctx.beginPath();
          lowerPts.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();

          ctx.beginPath();
          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
          midPts.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 4E-2. Indicators: Volume Strategy (Authentic Volume Profile & 14-period Volume MA)
      if (activeStrategyMode === 'volume') {
        const maxVol = Math.max(...visibleCandles.map((c) => c.volume), 250);
        const volZoneH = chartH * 0.22;
        const volBaseY = chartH + topPadding;

        // Draw Volume Histogram Bars
        visibleCandles.forEach((c, idx) => {
          const x = idx * stepX + stepX * 0.5;
          const isBull = c.close >= c.open;
          const barH = (c.volume / maxVol) * volZoneH;
          const barY = volBaseY - barH;

          ctx.fillStyle = isBull ? 'rgba(0, 229, 117, 0.40)' : 'rgba(255, 26, 83, 0.40)';
          ctx.fillRect(x - candleWidth * 0.4, barY, candleWidth * 0.8, barH);
        });

        // 14-period Volume Moving Average Line
        if (list.length >= 14) {
          const maPoints: { x: number; y: number }[] = [];
          list.forEach((_, i) => {
            if (i >= 13) {
              const slice = list.slice(i - 13, i + 1);
              const avgVol = slice.reduce((acc, c) => acc + c.volume, 0) / 14;
              const visIdx = i - (list.length - visibleCount);
              if (visIdx >= 0) {
                const x = visIdx * stepX + stepX * 0.5;
                const barH = (avgVol / maxVol) * volZoneH;
                maPoints.push({ x, y: volBaseY - barH });
              }
            }
          });

          if (maPoints.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.2;
            maPoints.forEach((pt, i) => {
              if (i === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
          }
        }

        // Clean tag on bottom left
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.fillRect(8, volBaseY - 14, 56, 12);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('VOL STRAT', 11, volBaseY - 5);
      }

      // 4F. Candlesticks / Line Chart Rendering
      if (chartType === 'line') {
        ctx.beginPath();
        candlePositions.forEach((cp, i) => {
          const y = getY(cp.candle.close);
          if (i === 0) ctx.moveTo(cp.x, y);
          else ctx.lineTo(cp.x, y);
        });
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.stroke();

        const lastPt = candlePositions[candlePositions.length - 1];
        if (lastPt) {
          ctx.lineTo(lastPt.x, chartH + topPadding);
          ctx.lineTo(candlePositions[0].x, chartH + topPadding);
          ctx.closePath();
          const grad = ctx.createLinearGradient(0, topPadding, 0, chartH + topPadding);
          grad.addColorStop(0, 'rgba(34, 211, 238, 0.25)');
          grad.addColorStop(1, 'rgba(34, 211, 238, 0.0)');
          ctx.fillStyle = grad;
          ctx.fill();
        }
      } else {
        candlePositions.forEach((cp) => {
          const c = cp.candle;
          const isBull = c.close >= c.open;
          const color = isBull ? COLOR_BULL : COLOR_BEAR;

          const openY = getY(c.open);
          const closeY = getY(c.close);
          const highY = getY(c.high);
          const lowY = getY(c.low);

          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.max(1.8, Math.abs(closeY - openY));

          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.moveTo(cp.x, highY);
          ctx.lineTo(cp.x, lowY);
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.fillRect(cp.x - candleWidth * 0.5, bodyTop, candleWidth, bodyHeight);
        });
      }

      // 4G. Sniper AI Signal Overlays on Candlesticks
      if (showSniperAI) {
        sniperSignalsRef.current.forEach((sig) => {
          const pos = candlePositions.find((cp) => cp.index === sig.candleIndex);
          if (!pos) return;

          const isCall = sig.direction === 'CALL';
          const y = isCall ? getY(pos.candle.low) + 18 : getY(pos.candle.high) - 18;

          const tagW = 60;
          const tagH = 15;
          const tagX = pos.x - tagW * 0.5;
          const tagY = y - (isCall ? 2 : 13);

          ctx.fillStyle = isCall ? '#00E575' : '#FF1A53';
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(tagX, tagY, tagW, tagH, 3) : ctx.rect(tagX, tagY, tagW, tagH);
          ctx.fill();

          ctx.fillStyle = isCall ? '#000000' : '#ffffff';
          ctx.font = 'bold 9px "JetBrains Mono", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const label = isCall ? `▲ BUY ${sig.confidence}%` : `▼ SELL ${sig.confidence}%`;
          ctx.fillText(label, pos.x, tagY + tagH * 0.5);
        });
      }

      // Live price Y position on canvas
      const liveY = getY(liveP);

      // 4H. Active Trade Order Line & Floating Trade Stick (ITM / OTM / ATM)
      let tradeBadgeInfo: { x: number; y: number; w: number; h: number; modeColor: string; tradeMode: string; pnlText: string; secLeft: number } | null = null;

      if (activeOrder) {
        const orderY = getY(activeOrder.entryPrice);
        const isBuy = activeOrder.direction === 'BUY';
        const diff = liveP - activeOrder.entryPrice;
        const pipThresh = spec.pip * 0.08;

        let tradeMode: 'ITM' | 'OTM' | 'ATM' = 'ATM';
        if (Math.abs(diff) < pipThresh) {
          tradeMode = 'ATM';
        } else if (isBuy ? diff > 0 : diff < 0) {
          tradeMode = 'ITM';
        } else {
          tradeMode = 'OTM';
        }

        const modeColor =
          tradeMode === 'ITM' ? '#00E575' : tradeMode === 'OTM' ? '#FF1A53' : '#FACC15';
        const profitAmount = activeOrder.stake * (payoutRate / 100);
        const pnlText =
          tradeMode === 'ITM'
            ? `+$${profitAmount.toFixed(spec.decimals <= 2 ? 1 : 2)}`
            : tradeMode === 'OTM'
            ? `-$${activeOrder.stake.toFixed(spec.decimals <= 2 ? 1 : 2)}`
            : `$0.00`;

        // 1. Horizontal dashed entry line showing where trade was entered (WITHOUT entry price text)
        ctx.beginPath();
        ctx.strokeStyle = modeColor;
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.2;
        ctx.moveTo(0, orderY);
        ctx.lineTo(chartW, orderY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Real-time Floating Trade Stick that floats with current running candle
        const curCandlePos = candlePositions[candlePositions.length - 1];
        const stickX = curCandlePos ? curCandlePos.x : chartW - 24;

        const minY = Math.min(orderY, liveY);
        const maxY = Math.max(orderY, liveY);

        // Vertical laser stick connecting entry level and current live candle price
        ctx.beginPath();
        ctx.strokeStyle = modeColor;
        ctx.lineWidth = 2;
        ctx.moveTo(stickX, minY);
        ctx.lineTo(stickX, maxY);
        ctx.stroke();

        // Entry point anchor dot on entry line
        ctx.beginPath();
        ctx.arc(stickX, orderY, 3, 0, Math.PI * 2);
        ctx.fillStyle = modeColor;
        ctx.fill();

        // Live price anchor pulse dot on current candle
        ctx.beginPath();
        ctx.arc(stickX, liveY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = modeColor;
        ctx.fill();

        // 3. Compact Floating ITM / OTM / ATM Badge on the LEFT SIDE of the chart
        // Moves up/down with live price (liveY) while anchored on the left
        const badgeW = 80;
        const badgeH = 17;
        const badgeX = 6;
        const badgeY = Math.max(topPadding + 2, Math.min(chartH + topPadding - badgeH - 2, liveY - badgeH * 0.5));
        const secLeft = Math.max(0, Math.ceil((activeOrder.expiryTime - Date.now()) / 1000));

        tradeBadgeInfo = {
          x: badgeX,
          y: badgeY,
          w: badgeW,
          h: badgeH,
          modeColor,
          tradeMode,
          pnlText,
          secLeft,
        };
      }

      // 4I. Neon Green Dashed Price Line & Bright Price Badge with Next Candle Countdown
      // When trade is active, price line starts at badge edge touching it, NEVER overlapping the badge text
      const priceLineStartX = tradeBadgeInfo ? tradeBadgeInfo.x + tradeBadgeInfo.w : 0;

      ctx.beginPath();
      ctx.strokeStyle = COLOR_BULL;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.moveTo(priceLineStartX, liveY);
      ctx.lineTo(chartW + 2, liveY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw the Compact Left-Side Trade Badge (drawn after line to ensure pristine visibility)
      if (tradeBadgeInfo) {
        const { x: badgeX, y: badgeY, w: badgeW, h: badgeH, modeColor, tradeMode, pnlText, secLeft } = tradeBadgeInfo;

        // Dark pill background with modeColor border
        ctx.fillStyle = '#060d16';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3) : ctx.rect(badgeX, badgeY, badgeW, badgeH);
        ctx.fill();

        ctx.strokeStyle = modeColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Left solid status chip: ITM / OTM / ATM
        const chipW = 25;
        const chipH = 13;
        const chipX = badgeX + 2;
        const chipY = badgeY + 2;

        ctx.fillStyle = modeColor;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(chipX, chipY, chipW, chipH, 2) : ctx.rect(chipX, chipY, chipW, chipH);
        ctx.fill();

        ctx.fillStyle = tradeMode === 'OTM' ? '#ffffff' : '#000000';
        ctx.font = 'bold 8.5px "JetBrains Mono", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tradeMode, chipX + chipW * 0.5, chipY + chipH * 0.5);

        // Right side: P&L amount and countdown seconds
        ctx.fillStyle = modeColor;
        ctx.font = 'bold 8px "JetBrains Mono", sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${pnlText} ${secLeft}s`, badgeX + badgeW - 3, badgeY + badgeH * 0.5);
      }

      const badgeW = 56;
      const badgeH = 20;
      const badgeX = chartW + 2;
      const badgeY = Math.max(topPadding, Math.min(chartH + topPadding - 36, liveY - badgeH * 0.5));

      // Live Price Badge
      ctx.fillStyle = COLOR_BULL;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 2) : ctx.rect(badgeX, badgeY, badgeW, badgeH);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const displayPrice =
        spec.decimals <= 3 ? liveP.toFixed(spec.decimals) : liveP >= 1.0 ? liveP.toFixed(2) : liveP.toFixed(spec.decimals);

      ctx.fillText(displayPrice, badgeX + badgeW * 0.5, badgeY + badgeH * 0.5);

      // Next Candle Countdown directly underneath price badge
      const timerBadgeH = 14;
      const timerBadgeY = badgeY + badgeH + 2;

      ctx.fillStyle = '#0a121c';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(badgeX, timerBadgeY, badgeW, timerBadgeH, 2) : ctx.rect(badgeX, timerBadgeY, badgeW, timerBadgeH);
      ctx.fill();

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const secLeft = candleSecondsLeftRef.current;
      const timerStr = secLeft < 60 ? `00:${String(secLeft).padStart(2, '0')}` : `${Math.floor(secLeft / 60)}:${String(secLeft % 60).padStart(2, '0')}`;
      ctx.fillText(timerStr, badgeX + badgeW * 0.5, timerBadgeY + timerBadgeH * 0.5);

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [candleTfSec, activeStrategyMode, showSRLevels, showSniperAI, chartType, zoomLevel, activeOrder]);

  return (
    <div ref={containerRef} className="w-full select-none text-slate-100 font-sans">
      {/* 1. TOP TOGGLE: "Hide Chart Preview ▲" */}
      <div className="flex items-center justify-center pb-2">
        <button
          type="button"
          onClick={() => setIsChartVisible((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1 text-xs font-mono font-medium text-cyan-300 hover:text-cyan-200 transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isChartVisible ? 'Hide Chart Preview ▲' : 'Show Chart Preview ▼'}</span>
        </button>
      </div>

      {isChartVisible && (
        <div className="relative rounded-[4px] bg-[#071018] overflow-hidden shadow-2xl chart-neon-border">
          {/* 2A. TOP TOOLBAR: Strategy Pills & Live Sniper AI Status Indicator */}
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#142634] bg-[#071018]/90">
                {/* Left Indicator Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                  {/* 1. Clean Pill */}
                  <button
                    type="button"
                    onClick={() => setActiveStrategyMode('clean')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[11px] font-medium transition-all shrink-0 ${
                      activeStrategyMode === 'clean'
                        ? 'border border-[#22d3ee] bg-[#092938] text-cyan-300 font-semibold shadow-[0_0_8px_rgba(34,211,238,0.25)]'
                        : 'border border-[#162a3c] bg-[#0a1520] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <span>Clean</span>
                    {activeStrategyMode === 'clean' && <span className="text-[9px] ml-0.5 text-cyan-300">✓</span>}
                  </button>

                  {/* 2. 20/50 EMA Pill */}
                  <button
                    type="button"
                    onClick={() => setActiveStrategyMode('ema')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[11px] font-medium transition-all shrink-0 ${
                      activeStrategyMode === 'ema'
                        ? 'border border-[#22d3ee] bg-[#092938] text-cyan-300 font-semibold shadow-[0_0_8px_rgba(34,211,238,0.25)]'
                        : 'border border-[#162a3c] bg-[#0a1520] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <span>EMA</span>
                    {activeStrategyMode === 'ema' && <span className="text-[9px] ml-0.5 text-cyan-300">✓</span>}
                  </button>

                  {/* 3. Bollinger Pill */}
                  <button
                    type="button"
                    onClick={() => setActiveStrategyMode('bollinger')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[11px] font-medium transition-all shrink-0 ${
                      activeStrategyMode === 'bollinger'
                        ? 'border border-purple-400 bg-purple-950/40 text-purple-300 font-semibold shadow-[0_0_8px_rgba(168,85,247,0.25)]'
                        : 'border border-[#162a3c] bg-[#0a1520] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                    <span>Bollinger</span>
                    {activeStrategyMode === 'bollinger' && <span className="text-[9px] ml-0.5 text-purple-300">✓</span>}
                  </button>

                  {/* 4. Volume Strategy Pill */}
                  <button
                    type="button"
                    onClick={() => setActiveStrategyMode('volume')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                      activeStrategyMode === 'volume'
                        ? 'border border-sky-400 bg-sky-950/50 text-sky-300 font-semibold shadow-[0_0_8px_rgba(56,189,248,0.25)]'
                        : 'border border-[#162a3c] bg-[#0a1520] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                    <span>Volume</span>
                    {activeStrategyMode === 'volume' && <span className="text-[9px] ml-0.5 text-sky-300">✓</span>}
                  </button>

                  {/* S/R Multi-Level Toggle */}
                <button
                  type="button"
                  onClick={() => setShowSRLevels((prev) => !prev)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[11px] font-medium transition-all shrink-0 ${
                    showSRLevels
                      ? 'border border-emerald-500/60 bg-emerald-950/40 text-emerald-300 font-bold'
                      : 'border border-[#162a3c] bg-[#0a1520] text-slate-500 hover:text-slate-300'
                  }`}
                  title="Genuine Swing Support & Resistance"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showSRLevels ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <span>S/R</span>
                </button>

                {/* Sniper AI Signal Toggle */}
                <button
                  type="button"
                  onClick={() => setShowSniperAI((prev) => !prev)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[11px] font-medium transition-all shrink-0 ${
                    showSniperAI
                      ? 'border border-amber-500/60 bg-amber-950/40 text-amber-300 font-bold'
                      : 'border border-[#162a3c] bg-[#0a1520] text-slate-500 hover:text-slate-300'
                  }`}
                  title="Real-Time Sniper AI Reversal Signals"
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  <span>AI</span>
                </button>
              </div>

              {/* Right Side: LIVE DYNAMIC SNIPER AI SIGNAL BADGE (switches dynamically between BUY 97% Green and SELL 94% Red) */}
              <div className="flex items-center gap-1 pl-1 shrink-0">
                {showSniperAI && (
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-[4px] border font-mono text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
                      liveAiSignal.direction === 'BUY'
                        ? 'border-[#00E575] bg-[#00E575]/15 text-[#00E575] shadow-[0_0_10px_rgba(0,229,117,0.4)] animate-pulse'
                        : 'border-[#FF1A53] bg-[#FF1A53]/15 text-[#FF1A53] shadow-[0_0_10px_rgba(255,26,83,0.4)] animate-pulse'
                    }`}
                  >
                    {liveAiSignal.direction === 'BUY' ? (
                      <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      <TrendingDown className="w-3 h-3 stroke-[2.5]" />
                    )}
                    <span>
                      {liveAiSignal.direction === 'BUY'
                        ? `BUY ${liveAiSignal.confidence}%`
                        : `SELL ${liveAiSignal.confidence}%`}
                    </span>
                  </div>
                )}

                <div className="h-3.5 w-[1px] bg-[#162a3c] mx-0.5" />

                {/* Zoom In */}
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
                  className="p-1 rounded border border-[#162a3c] bg-[#0a1520] text-slate-300 hover:text-white transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>

                {/* Zoom Out */}
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
                  className="p-1 rounded border border-[#162a3c] bg-[#0a1520] text-slate-300 hover:text-white transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>

                {/* Candlestick / Line Chart Toggle */}
                <button
                  type="button"
                  onClick={() => setChartType((t) => (t === 'candle' ? 'line' : 'candle'))}
                  className="p-1 rounded border border-[#162a3c] bg-[#0a1520] text-slate-300 hover:text-white transition-colors text-xs flex items-center justify-center min-w-[22px]"
                  title="Toggle Candle / Line Style"
                >
                  {chartType === 'candle' ? '🕯️' : '📈'}
                </button>
              </div>
            </div>

            {/* 2B. CLEAN SINGLE ROW:
                Left: Currency Pair (AUD/CHF OTC) + Payout (+92%)
                Right: SMOOTH HORIZONTAL SCROLLABLE STRIP FOR BOTH TF & EXP */}
            <div className="flex items-center justify-between px-2 py-1.5 bg-[#09141f] border-b border-[#142634] gap-2">
              {/* Left Group: Asset Dropdown */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAssetDropdown((prev) => !prev)}
                  className="flex items-center gap-1.5 text-slate-200 hover:text-cyan-400 font-mono font-bold text-xs transition-colors py-0.5"
                >
                  <span className="tracking-tight">{asset}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-500/40">
                    +{payoutRate}%
                  </span>
                </button>

                {showAssetDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-44 max-h-52 overflow-y-auto bg-[#0c1622] border border-[#162a3c] rounded shadow-2xl z-30 py-1">
                    {Object.keys(ASSET_SPECS).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => {
                          onAssetChange?.(a);
                          setShowAssetDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1 text-xs font-mono hover:bg-[#152636] transition-colors flex items-center justify-between ${
                          asset === a ? 'text-cyan-400 font-bold bg-[#152636]' : 'text-slate-300'
                        }`}
                      >
                        <span>{a}</span>
                        <span className="text-[10px] text-emerald-400">92%</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Group: SMOOTH TOUCH-ENABLED HORIZONTAL SCROLLING FOR BOTH TF AND EXP */}
              <div
                className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1 min-w-0 pl-1"
                style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}
                onWheel={(e) => {
                  if (e.deltaY !== 0) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
              >
                {/* Box 1 (TF): Candlestick Timeframe Capsule with full horizontal scrolling */}
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] border border-[#162a3c] bg-[#0c1622]/95 shrink-0 shadow-sm">
                  <span className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-wider shrink-0 mr-0.5">
                    TF:
                  </span>
                  <div
                    className="flex items-center gap-1 overflow-x-auto scrollbar-none"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {CANDLE_TIMEFRAMES.map((tf) => {
                      const isActive = candleTfSec === tf.sec;
                      return (
                        <button
                          key={tf.sec}
                          type="button"
                          onClick={() => setCandleTfSec(tf.sec)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded-[3px] transition-all shrink-0 cursor-pointer ${
                            isActive
                              ? 'border border-[#00E575] bg-[#063321] text-[#00E575] font-black shadow-[0_0_8px_rgba(0,229,117,0.35)]'
                              : 'text-slate-400 hover:text-slate-200 bg-transparent'
                          }`}
                        >
                          {tf.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Box 2 (EXP): Expiry Duration Capsule with full horizontal scrolling */}
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] border border-[#162a3c] bg-[#0c1622]/95 shrink-0 shadow-sm">
                  <span className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-wider shrink-0 mr-0.5">
                    EXP:
                  </span>
                  <div
                    className="flex items-center gap-1 overflow-x-auto scrollbar-none"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {EXPIRY_DURATIONS.map((exp) => {
                      const isActive = expirySec === exp.sec;
                      return (
                        <button
                          key={exp.sec}
                          type="button"
                          onClick={() => handleSelectExpiry(exp.sec)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded-[3px] transition-all shrink-0 cursor-pointer ${
                            isActive
                              ? 'border border-[#22d3ee] bg-[#083344] text-[#22d3ee] font-black shadow-[0_0_8px_rgba(34,211,238,0.35)]'
                              : 'text-slate-400 hover:text-slate-200 bg-transparent'
                          }`}
                        >
                          {exp.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 2C. Compact Canvas Chart Area */}
            <div className="relative w-full h-[280px] bg-[#071018]">
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>
          </div>
      )}
    </div>
  );
};

