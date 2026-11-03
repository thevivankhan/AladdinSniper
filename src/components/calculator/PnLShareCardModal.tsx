import React, { useState, useRef, useCallback } from 'react';
import {
  Share2,
  Download,
  Copy,
  Check,
  X,
  Smartphone,
  Monitor,
  Square,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface PnLShareData {
  title: string;
  subtitle: string;
  profitOrLoss: number;
  returnPercent?: number;
  asset?: string;
  accountType: 'REAL' | 'DEMO';
  startingBalance: number;
  endingBalance: number;
  tradesCount: number;
  winsCount: number;
  lossesCount: number;
  winRate: number;
  payoutRate?: number;
  strategyGoal?: string;
  timestamp: string;
}

interface PnLShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PnLShareData;
}

export type CardFormat = 'mobile' | 'desktop' | 'square';
export type CardTheme =
  | 'rocket'
  | 'bitcoin'
  | 'gold'
  | 'celebration'
  | 'sky'
  | 'cyber'
  | 'obsidian';

interface ThemeConfig {
  id: CardTheme;
  name: string;
  badge: string;
  bgImage: string | null;
  borderOuter: string;
  borderInner: string;
  accent: string;
  accentGlow: string;
  badgeBg: string;
}

const THEMES: Record<CardTheme, ThemeConfig> = {
  rocket: {
    id: 'rocket',
    name: '🚀 Galaxy Rocket',
    badge: 'Space Nebula',
    bgImage: '/assets/themes/rocket.jpg',
    borderOuter: '#8b5cf6',
    borderInner: 'rgba(6, 182, 212, 0.45)',
    accent: '#06b6d4',
    accentGlow: 'rgba(139, 92, 246, 0.5)',
    badgeBg: 'rgba(139, 92, 246, 0.2)',
  },
  bitcoin: {
    id: 'bitcoin',
    name: '₿ Bitcoin Bull',
    badge: 'Crypto 3D',
    bgImage: '/assets/themes/bitcoin.jpg',
    borderOuter: '#f59e0b',
    borderInner: 'rgba(16, 185, 129, 0.45)',
    accent: '#10b981',
    accentGlow: 'rgba(245, 158, 11, 0.5)',
    badgeBg: 'rgba(245, 158, 11, 0.2)',
  },
  gold: {
    id: 'gold',
    name: '👑 24K Pure Gold',
    badge: 'Luxury Bullion',
    bgImage: '/assets/themes/gold.jpg',
    borderOuter: '#fbbf24',
    borderInner: 'rgba(245, 158, 11, 0.45)',
    accent: '#fbbf24',
    accentGlow: 'rgba(251, 191, 36, 0.55)',
    badgeBg: 'rgba(251, 191, 36, 0.2)',
  },
  celebration: {
    id: 'celebration',
    name: '🎉 Victory Win',
    badge: 'Celebration',
    bgImage: '/assets/themes/celebration.jpg',
    borderOuter: '#34d399',
    borderInner: 'rgba(251, 191, 36, 0.45)',
    accent: '#34d399',
    accentGlow: 'rgba(52, 211, 153, 0.5)',
    badgeBg: 'rgba(52, 211, 153, 0.2)',
  },
  sky: {
    id: 'sky',
    name: '🌅 Celestial Sky',
    badge: 'Dawn Sunrise',
    bgImage: '/assets/themes/sky.jpg',
    borderOuter: '#38bdf8',
    borderInner: 'rgba(251, 191, 36, 0.45)',
    accent: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.5)',
    badgeBg: 'rgba(56, 189, 248, 0.2)',
  },
  cyber: {
    id: 'cyber',
    name: '⚡ Cyber Neon',
    badge: 'Emerald Matrix',
    bgImage: null,
    borderOuter: '#10b981',
    borderInner: 'rgba(16, 185, 129, 0.4)',
    accent: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.5)',
    badgeBg: 'rgba(16, 185, 129, 0.2)',
  },
  obsidian: {
    id: 'obsidian',
    name: '💎 Obsidian Dark',
    badge: 'Stealth Carbon',
    bgImage: null,
    borderOuter: '#64748b',
    borderInner: 'rgba(100, 116, 139, 0.4)',
    accent: '#38bdf8',
    accentGlow: 'rgba(100, 116, 139, 0.4)',
    badgeBg: 'rgba(100, 116, 139, 0.2)',
  },
};

// Aladdin Lamp 4K Gold App Icon Component (Edge-to-edge fit, zero outer glow/shadow)
const LampIcon = ({ className }: { className?: string }) => (
  <img
    src="/aladdin-gold-icon.png"
    alt="Aladdin Gold Icon"
    className={`object-cover select-none pointer-events-none block ${className || 'w-5 h-5'}`}
  />
);

export const PnLShareCardModal: React.FC<PnLShareCardModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [format, setFormat] = useState<CardFormat>('mobile');
  const [theme, setTheme] = useState<CardTheme>('rocket');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});

  const isProfit = data.profitOrLoss >= 0;
  const pnlFormatted = `${isProfit ? '+' : ''}$${data.profitOrLoss.toFixed(2)}`;
  const roi = data.startingBalance > 0
    ? ((data.profitOrLoss / data.startingBalance) * 100).toFixed(2)
    : '0.00';
  const roiFormatted = `${Number(roi) >= 0 ? '+' : ''}${roi}%`;

  // Display strategy label cleaned up to never overflow
  const cleanGoal = data.strategyGoal || '14T / 2W';

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  const generateShareText = useCallback(() => {
    return [
      `🎯 ALADDINSNIPER VIP P&L REPORT`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `${isProfit ? '🟢 PROFIT' : '🔴 LOSS'}: ${pnlFormatted} (${roiFormatted} ROI)`,
      `📊 Asset: ${data.asset || 'AUD/CHF OTC'} (${data.payoutRate || 92}% Payout)`,
      `🏆 Session: ${data.winsCount}W / ${data.lossesCount}L (${data.winRate}% Win Rate)`,
      `🏦 Ending Balance: $${data.endingBalance.toFixed(2)}`,
      `⚡ Goal: ${cleanGoal}`,
      `🛡️ Account: ${data.accountType} (Verified)`,
      `📅 ${data.timestamp}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Verified with AladdinSniper VIP Engine`,
    ].join('\n');
  }, [data, isProfit, pnlFormatted, roiFormatted, cleanGoal]);

  const loadImage = useCallback((src: string): Promise<HTMLImageElement | null> => {
    if (imageCacheRef.current[src]) {
      return Promise.resolve(imageCacheRef.current[src]);
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      if (img.complete) {
        imageCacheRef.current[src] = img;
        resolve(img);
      } else {
        img.onload = () => {
          imageCacheRef.current[src] = img;
          resolve(img);
        };
        img.onerror = () => resolve(null);
      }
    });
  }, []);

  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // High-Resolution 4K Canvas Renderer with Compact Dimensions (Zero wasted space)
  const drawCardToCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    const canvas = canvasRef.current || document.createElement('canvas');
    const currentTheme = THEMES[theme];

    // Compact Dimensions - cut the empty void in half so content snugly fills the frame
    let width = 1200;
    let height = 960; // Mobile: Compact, tight, zero dead space

    if (format === 'desktop') {
      width = 1920;
      height = 1080; // Desktop: 16:9 Landscape
    } else if (format === 'square') {
      width = 1200;
      height = 1200; // Square: 1:1 Feed
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const logoImg = await loadImage('/aladdin-gold-icon.png');
    const bgImg = currentTheme.bgImage ? await loadImage(currentTheme.bgImage) : null;

    // 1. Draw Theme Background Artwork or High-End Gradient
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, width, height);

      // Smooth dark glassmorphic vignette overlay for razor-sharp text readability
      const overlayGrad = ctx.createLinearGradient(0, 0, 0, height);
      overlayGrad.addColorStop(0, 'rgba(4, 8, 16, 0.74)');
      overlayGrad.addColorStop(0.5, 'rgba(3, 7, 14, 0.80)');
      overlayGrad.addColorStop(1, 'rgba(2, 5, 10, 0.90)');
      ctx.fillStyle = overlayGrad;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Cyber Neon or Obsidian Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      if (theme === 'obsidian') {
        bgGrad.addColorStop(0, '#080a0e');
        bgGrad.addColorStop(0.5, '#0c1017');
        bgGrad.addColorStop(1, '#05070a');
      } else {
        bgGrad.addColorStop(0, '#030c12');
        bgGrad.addColorStop(0.5, '#06141c');
        bgGrad.addColorStop(1, '#02090e');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Subtle Micro-Grid Overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Dual Precision Border with Theme Glow
    ctx.save();
    ctx.strokeStyle = currentTheme.borderOuter;
    ctx.lineWidth = 5;
    ctx.shadowColor = currentTheme.accentGlow;
    ctx.shadowBlur = 24;
    drawRoundedRect(ctx, 24, 24, width - 48, height - 48, 16);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = currentTheme.borderInner;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 36, 36, width - 72, height - 72, 12);
    ctx.stroke();

    // -------------------------------------------------------------
    // FORMAT 1: MOBILE (Compact, snug, perfectly proportioned)
    // -------------------------------------------------------------
    if (format === 'mobile') {
      const padX = 64;
      let curY = 64;

      // Header row
      const logoSize = 64;
      if (logoImg) {
        ctx.save();
        drawRoundedRect(ctx, padX, curY, logoSize, logoSize, 12);
        ctx.clip();
        ctx.drawImage(logoImg, padX, curY, logoSize, logoSize);
        ctx.restore();
      }

      // Title
      const goldGrad = ctx.createLinearGradient(padX + 80, curY, padX + 360, curY + 32);
      goldGrad.addColorStop(0, '#ffe893');
      goldGrad.addColorStop(0.5, '#f59e0b');
      goldGrad.addColorStop(1, '#d97706');

      ctx.fillStyle = goldGrad;
      ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ALADDINSNIPER', padX + 80, curY + 32);

      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('VIP REAL-TIME TRADE SNIPER', padX + 80, curY + 58);

      // Top Right Asset Pill
      const pillW = 320;
      const pillH = 56;
      const pillX = width - padX - pillW;
      const isReal = data.accountType === 'REAL';

      ctx.save();
      ctx.fillStyle = isReal ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
      drawRoundedRect(ctx, pillX, curY + 4, pillW, pillH, 10);
      ctx.fill();

      ctx.strokeStyle = isReal ? '#10b981' : '#f59e0b';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, pillX, curY + 4, pillW, pillH, 10);
      ctx.stroke();

      ctx.fillStyle = isReal ? '#34d399' : '#fbbf24';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${data.accountType} • ${data.asset || 'AUD/CHF OTC'}`, pillX + pillW / 2, curY + 39);
      ctx.restore();

      // Divider line
      curY += 92;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padX, curY);
      ctx.lineTo(width - padX, curY);
      ctx.stroke();

      // Net Profit & ROI Row
      curY += 45;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('NET REAL-TIME PROFIT', padX, curY);

      curY += 78;
      ctx.save();
      ctx.fillStyle = isProfit ? '#10b981' : '#f43f5e';
      ctx.font = '900 84px monospace';
      ctx.shadowColor = isProfit ? 'rgba(16, 185, 129, 0.7)' : 'rgba(244, 63, 94, 0.7)';
      ctx.shadowBlur = 24;
      ctx.fillText(pnlFormatted, padX, curY);
      ctx.restore();

      // ROI Badge
      const roiW = 240;
      const roiH = 68;
      const roiX = width - padX - roiW;
      const roiY = curY - 70;

      ctx.save();
      ctx.fillStyle = isProfit ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)';
      drawRoundedRect(ctx, roiX, roiY, roiW, roiH, 12);
      ctx.fill();

      ctx.strokeStyle = isProfit ? '#10b981' : '#f43f5e';
      ctx.lineWidth = 2.5;
      drawRoundedRect(ctx, roiX, roiY, roiW, roiH, 12);
      ctx.stroke();

      ctx.fillStyle = isProfit ? '#6ee7b7' : '#fda4af';
      ctx.font = '900 34px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(roiFormatted, roiX + roiW / 2, roiY + 46);
      ctx.restore();

      // 4 Metric Boxes (2x2 Grid)
      curY += 50;
      const gap = 16;
      const gridW = width - padX * 2;
      const bW = (gridW - gap) / 2;
      const bH = 130;

      const mItems = [
        { label: 'WIN RATE', val: `${data.winRate}%`, col: '#38bdf8' },
        { label: 'WON / LOST', val: `${data.winsCount}W / ${data.lossesCount}L`, col: '#ffffff' },
        { label: 'ENDING BALANCE', val: `$${data.endingBalance.toFixed(2)}`, col: '#ffffff' },
        { label: 'CYCLE GOAL', val: cleanGoal, col: '#f59e0b' },
      ];

      mItems.forEach((m, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const bx = padX + col * (bW + gap);
        const by = curY + row * (bH + gap);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        drawRoundedRect(ctx, bx, by, bW, bH, 10);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1.5;
        drawRoundedRect(ctx, bx, by, bW, bH, 10);
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(m.label, bx + 22, by + 36);

        // Auto-scaled Value (never overflows)
        ctx.fillStyle = m.col;
        let fSize = 32;
        ctx.font = `900 ${fSize}px monospace`;
        while (ctx.measureText(m.val).width > bW - 44 && fSize > 18) {
          fSize -= 2;
          ctx.font = `900 ${fSize}px monospace`;
        }
        ctx.fillText(m.val, bx + 22, by + 92);
      });

      // Secondary Stats Box (4 items full strip)
      curY += bH * 2 + gap + 30;
      const secH = 110;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      drawRoundedRect(ctx, padX, curY, gridW, secH, 12);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, padX, curY, gridW, secH, 12);
      ctx.stroke();

      const secList = [
        { label: 'Starting Deposit', val: `$${data.startingBalance.toFixed(2)}` },
        { label: 'Trades Executed', val: `${data.tradesCount}` },
        { label: 'Asset Payout', val: `${data.payoutRate || 92}%` },
        { label: 'Engine', val: 'Aladdin Tiered' },
      ];

      const cW = gridW / 4;
      secList.forEach((s, idx) => {
        const sx = padX + idx * cW + 20;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(s.label, sx, curY + 38);

        ctx.fillStyle = '#f1f5f9';
        ctx.font = '900 22px monospace';
        ctx.fillText(s.val, sx, curY + 76);
      });

      // Footer (snug and clean at bottom)
      const footY = height - 56;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`🛡️ VERIFIED SESSION • ${data.timestamp}`, padX, footY);

      ctx.textAlign = 'right';
      ctx.fillStyle = currentTheme.accent;
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('✓ ALADDINSNIPER OFFICIAL P&L', width - padX, footY);
    }

    // -------------------------------------------------------------
    // FORMAT 2: DESKTOP (16:9 Landscape - 1920x1080)
    // -------------------------------------------------------------
    else if (format === 'desktop') {
      const padX = 90;
      const padY = 80;

      // Header Row
      const logoSize = 76;
      if (logoImg) {
        ctx.save();
        drawRoundedRect(ctx, padX, padY, logoSize, logoSize, 14);
        ctx.clip();
        ctx.drawImage(logoImg, padX, padY, logoSize, logoSize);
        ctx.restore();
      }

      const goldGrad = ctx.createLinearGradient(padX + 90, padY, padX + 360, padY + 36);
      goldGrad.addColorStop(0, '#ffe893');
      goldGrad.addColorStop(0.5, '#f59e0b');
      goldGrad.addColorStop(1, '#d97706');

      ctx.fillStyle = goldGrad;
      ctx.font = '900 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ALADDINSNIPER', padX + 90, padY + 36);

      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('VIP REAL-TIME TRADE SNIPER', padX + 90, padY + 66);

      // Top Right Asset Pill
      const pillW = 380;
      const pillH = 64;
      const pillX = width - padX - pillW;
      const isReal = data.accountType === 'REAL';

      ctx.save();
      ctx.fillStyle = isReal ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
      drawRoundedRect(ctx, pillX, padY + 6, pillW, pillH, 10);
      ctx.fill();

      ctx.strokeStyle = isReal ? '#10b981' : '#f59e0b';
      ctx.lineWidth = 2.5;
      drawRoundedRect(ctx, pillX, padY + 6, pillW, pillH, 10);
      ctx.stroke();

      ctx.fillStyle = isReal ? '#34d399' : '#fbbf24';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${data.accountType} • ${data.asset || 'AUD/CHF OTC'}`, pillX + pillW / 2, padY + 46);
      ctx.restore();

      // Divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padX, 190);
      ctx.lineTo(width - padX, 190);
      ctx.stroke();

      // Left Column: Net Profit & ROI
      const leftColX = padX;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('NET REAL-TIME PROFIT', leftColX, 260);

      ctx.save();
      ctx.fillStyle = isProfit ? '#10b981' : '#f43f5e';
      ctx.font = '900 100px monospace';
      ctx.shadowColor = isProfit ? 'rgba(16, 185, 129, 0.7)' : 'rgba(244, 63, 94, 0.7)';
      ctx.shadowBlur = 28;
      ctx.fillText(pnlFormatted, leftColX, 370);
      ctx.restore();

      // ROI Pill beside Net Profit
      const roiW = 260;
      const roiH = 68;
      const roiX = leftColX;
      const roiY = 410;

      ctx.save();
      ctx.fillStyle = isProfit ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)';
      drawRoundedRect(ctx, roiX, roiY, roiW, roiH, 10);
      ctx.fill();

      ctx.strokeStyle = isProfit ? '#10b981' : '#f43f5e';
      ctx.lineWidth = 2.5;
      drawRoundedRect(ctx, roiX, roiY, roiW, roiH, 10);
      ctx.stroke();

      ctx.fillStyle = isProfit ? '#6ee7b7' : '#fda4af';
      ctx.font = '900 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(roiFormatted, roiX + roiW / 2, roiY + 46);
      ctx.restore();

      // Right Column: 4 KPI Metrics in a neat 2x2 grid
      const rightX = 860;
      const gridW = width - padX - rightX;
      const gap = 20;
      const bW = (gridW - gap) / 2;
      const bH = 135;
      const gridY = 240;

      const mItems = [
        { label: 'WIN RATE', val: `${data.winRate}%`, col: '#38bdf8' },
        { label: 'WON / LOST', val: `${data.winsCount}W / ${data.lossesCount}L`, col: '#ffffff' },
        { label: 'ENDING BALANCE', val: `$${data.endingBalance.toFixed(2)}`, col: '#ffffff' },
        { label: 'CYCLE GOAL', val: cleanGoal, col: '#f59e0b' },
      ];

      mItems.forEach((m, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const bx = rightX + col * (bW + gap);
        const by = gridY + row * (bH + gap);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        drawRoundedRect(ctx, bx, by, bW, bH, 12);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1.5;
        drawRoundedRect(ctx, bx, by, bW, bH, 12);
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(m.label, bx + 20, by + 38);

        ctx.fillStyle = m.col;
        let fSize = 30;
        ctx.font = `900 ${fSize}px monospace`;
        while (ctx.measureText(m.val).width > bW - 40 && fSize > 16) {
          fSize -= 2;
          ctx.font = `900 ${fSize}px monospace`;
        }
        ctx.fillText(m.val, bx + 20, by + 94);
      });

      // Bottom Secondary Metrics Strip (4 columns full width)
      const secY = 620;
      const secW = width - padX * 2;
      const secH = 120;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      drawRoundedRect(ctx, padX, secY, secW, secH, 14);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, padX, secY, secW, secH, 14);
      ctx.stroke();

      const secList = [
        { label: 'Starting Deposit', val: `$${data.startingBalance.toFixed(2)}` },
        { label: 'Trades Executed', val: `${data.tradesCount}` },
        { label: 'Asset Payout', val: `${data.payoutRate || 92}%` },
        { label: 'Algorithm Engine', val: 'Aladdin Tiered' },
      ];

      const colStep = secW / 4;
      secList.forEach((s, idx) => {
        const sx = padX + idx * colStep + 30;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(s.label, sx, secY + 42);

        ctx.fillStyle = '#f1f5f9';
        ctx.font = '900 24px monospace';
        ctx.fillText(s.val, sx, secY + 84);
      });

      // Desktop Footer
      const footY = height - 90;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`🛡️ VERIFIED SESSION • ${data.timestamp}`, padX, footY);

      ctx.textAlign = 'right';
      ctx.fillStyle = currentTheme.accent;
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('✓ ALADDINSNIPER OFFICIAL P&L', width - padX, footY);
    }

    // -------------------------------------------------------------
    // FORMAT 3: SQUARE (1:1 Feed - 1200x1200)
    // -------------------------------------------------------------
    else if (format === 'square') {
      const padX = 70;
      let curY = 70;

      // Header row
      const logoSize = 70;
      if (logoImg) {
        ctx.save();
        drawRoundedRect(ctx, padX, curY, logoSize, logoSize, 14);
        ctx.clip();
        ctx.drawImage(logoImg, padX, curY, logoSize, logoSize);
        ctx.restore();
      }

      const goldGrad = ctx.createLinearGradient(padX + 86, curY, padX + 360, curY + 34);
      goldGrad.addColorStop(0, '#ffe893');
      goldGrad.addColorStop(0.5, '#f59e0b');
      goldGrad.addColorStop(1, '#d97706');

      ctx.fillStyle = goldGrad;
      ctx.font = '900 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ALADDINSNIPER', padX + 86, curY + 34);

      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('VIP REAL-TIME TRADE SNIPER', padX + 86, curY + 62);

      // Top Right Asset Pill
      const pillW = 320;
      const pillH = 58;
      const pillX = width - padX - pillW;
      const isReal = data.accountType === 'REAL';

      ctx.save();
      ctx.fillStyle = isReal ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
      drawRoundedRect(ctx, pillX, curY + 6, pillW, pillH, 10);
      ctx.fill();

      ctx.strokeStyle = isReal ? '#10b981' : '#f59e0b';
      ctx.lineWidth = 2.5;
      drawRoundedRect(ctx, pillX, curY + 6, pillW, pillH, 10);
      ctx.stroke();

      ctx.fillStyle = isReal ? '#34d399' : '#fbbf24';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${data.accountType} • ${data.asset || 'AUD/CHF OTC'}`, pillX + pillW / 2, curY + 42);
      ctx.restore();

      // Divider
      curY += 100;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padX, curY);
      ctx.lineTo(width - padX, curY);
      ctx.stroke();

      // Net Profit & ROI
      curY += 50;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('NET REAL-TIME PROFIT', padX, curY);

      curY += 85;
      ctx.save();
      ctx.fillStyle = isProfit ? '#10b981' : '#f43f5e';
      ctx.font = '900 90px monospace';
      ctx.shadowColor = isProfit ? 'rgba(16, 185, 129, 0.7)' : 'rgba(244, 63, 94, 0.7)';
      ctx.shadowBlur = 24;
      ctx.fillText(pnlFormatted, padX, curY);
      ctx.restore();

      // ROI Badge
      const roiW = 250;
      const roiH = 70;
      const roiX = width - padX - roiW;
      const roiY = curY - 72;

      ctx.save();
      ctx.fillStyle = isProfit ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)';
      drawRoundedRect(ctx, roiX, roiY, roiW, roiH, 12);
      ctx.fill();

      ctx.strokeStyle = isProfit ? '#10b981' : '#f43f5e';
      ctx.lineWidth = 2.5;
      drawRoundedRect(ctx, roiX, roiY, roiW, roiH, 12);
      ctx.stroke();

      ctx.fillStyle = isProfit ? '#6ee7b7' : '#fda4af';
      ctx.font = '900 34px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(roiFormatted, roiX + roiW / 2, roiY + 48);
      ctx.restore();

      // 4 Metric Boxes (2x2 Grid)
      curY += 60;
      const gap = 18;
      const gridW = width - padX * 2;
      const bW = (gridW - gap) / 2;
      const bH = 135;

      const mItems = [
        { label: 'WIN RATE', val: `${data.winRate}%`, col: '#38bdf8' },
        { label: 'WON / LOST', val: `${data.winsCount}W / ${data.lossesCount}L`, col: '#ffffff' },
        { label: 'ENDING BALANCE', val: `$${data.endingBalance.toFixed(2)}`, col: '#ffffff' },
        { label: 'CYCLE GOAL', val: cleanGoal, col: '#f59e0b' },
      ];

      mItems.forEach((m, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const bx = padX + col * (bW + gap);
        const by = curY + row * (bH + gap);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        drawRoundedRect(ctx, bx, by, bW, bH, 12);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1.5;
        drawRoundedRect(ctx, bx, by, bW, bH, 12);
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(m.label, bx + 22, by + 36);

        ctx.fillStyle = m.col;
        let fSize = 32;
        ctx.font = `900 ${fSize}px monospace`;
        while (ctx.measureText(m.val).width > bW - 44 && fSize > 16) {
          fSize -= 2;
          ctx.font = `900 ${fSize}px monospace`;
        }
        ctx.fillText(m.val, bx + 22, by + 94);
      });

      // Secondary Stats Strip
      curY += bH * 2 + gap + 35;
      const secH = 120;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      drawRoundedRect(ctx, padX, curY, gridW, secH, 12);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, padX, curY, gridW, secH, 12);
      ctx.stroke();

      const secList = [
        { label: 'Starting Deposit', val: `$${data.startingBalance.toFixed(2)}` },
        { label: 'Trades Executed', val: `${data.tradesCount}` },
        { label: 'Asset Payout', val: `${data.payoutRate || 92}%` },
        { label: 'Algorithm Engine', val: 'Aladdin Tiered' },
      ];

      const cW = gridW / 4;
      secList.forEach((s, idx) => {
        const sx = padX + idx * cW + 24;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(s.label, sx, curY + 42);

        ctx.fillStyle = '#f1f5f9';
        ctx.font = '900 24px monospace';
        ctx.fillText(s.val, sx, curY + 84);
      });

      // Footer
      const footY = height - 70;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 17px monospace';
      ctx.fillText(`🛡️ VERIFIED SESSION • ${data.timestamp}`, padX, footY);

      ctx.textAlign = 'right';
      ctx.fillStyle = currentTheme.accent;
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('✓ ALADDINSNIPER OFFICIAL P&L', width - padX, footY);
    }

    return canvas;
  }, [data, isProfit, pnlFormatted, roiFormatted, theme, format, cleanGoal, loadImage]);

  // Handle Download Image (Ultra-HD PNG)
  const handleDownloadImage = async () => {
    setIsGenerating(true);
    try {
      const canvas = await drawCardToCanvas();
      if (!canvas) {
        showToast('Failed to generate image canvas');
        setIsGenerating(false);
        return;
      }

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `aladdinsniper-${theme}-${format}-pnl-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`✓ ${format.toUpperCase()} (${THEMES[theme].name}) downloaded!`);
    } catch {
      showToast('Error generating image file');
    } finally {
      setIsGenerating(false);
    }
  };

  // Direct Share (WhatsApp / Telegram image file)
  const handleShareCard = async () => {
    setIsGenerating(true);
    try {
      const canvas = await drawCardToCanvas();
      if (!canvas) {
        showToast('Failed to render card');
        setIsGenerating(false);
        return;
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('Failed to create image file');
          setIsGenerating(false);
          return;
        }

        const file = new File(
          [blob],
          `aladdinsniper-${theme}-${format}-pnl-${Date.now()}.png`,
          { type: 'image/png' }
        );

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `AladdinSniper VIP P&L: ${pnlFormatted}`,
              text: generateShareText(),
            });
            showToast('✓ Shared successfully!');
            setIsGenerating(false);
            return;
          } catch {
            // Cancelled
          }
        }

        if (navigator.clipboard && 'write' in navigator.clipboard && window.ClipboardItem) {
          try {
            const item = new window.ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            setCopiedImage(true);
            showToast('✓ Card image copied to clipboard!');
            setTimeout(() => setCopiedImage(false), 2000);
            setIsGenerating(false);
            return;
          } catch {
            // Fall through
          }
        }

        await navigator.clipboard.writeText(generateShareText());
        setCopiedText(true);
        showToast('✓ P&L summary copied as text!');
        setTimeout(() => setCopiedText(false), 2000);
        setIsGenerating(false);
      }, 'image/png', 1.0);
    } catch {
      showToast('Could not complete share');
      setIsGenerating(false);
    }
  };

  const handleCopyImage = async () => {
    setIsGenerating(true);
    try {
      const canvas = await drawCardToCanvas();
      if (!canvas) {
        showToast('Failed to render canvas');
        setIsGenerating(false);
        return;
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('Failed to create image blob');
          setIsGenerating(false);
          return;
        }

        if (navigator.clipboard && 'write' in navigator.clipboard && window.ClipboardItem) {
          try {
            const item = new window.ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            setCopiedImage(true);
            showToast('✓ Image copied to clipboard!');
            setTimeout(() => setCopiedImage(false), 2000);
          } catch {
            await navigator.clipboard.writeText(generateShareText());
            showToast('✓ P&L summary copied as text!');
          }
        } else {
          await navigator.clipboard.writeText(generateShareText());
          showToast('✓ P&L summary copied as text!');
        }
        setIsGenerating(false);
      }, 'image/png', 1.0);
    } catch {
      showToast('Could not copy image; copied text instead');
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const currentTheme = THEMES[theme];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          className={`bg-[#0b0f17] border border-[#1e2638] rounded-[8px] w-full shadow-[0_10px_40px_rgba(0,0,0,0.9)] overflow-hidden relative transition-all ${
            format === 'desktop' ? 'max-w-2xl' : format === 'square' ? 'max-w-md' : 'max-w-sm'
          }`}
        >
          <canvas ref={canvasRef} className="hidden" />

          {/* Modal Header */}
          <div className="bg-[#0f1422] border-b border-[#1b2336] px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-[4px] shrink-0 overflow-hidden flex items-center justify-center">
                <LampIcon className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                PnL Share Card Generator
              </h3>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Controls Bar: Format Switcher (Mobile / Desktop / Square) */}
          <div className="bg-[#121826] border-b border-[#1b2336] px-3 py-2 flex items-center justify-between gap-2 text-xs">
            {/* Format Selector Pills */}
            <div className="flex items-center gap-1 bg-[#0a0e17] p-1 rounded-[4px] border border-white/5">
              <button
                type="button"
                onClick={() => setFormat('mobile')}
                className={`px-2 py-1 rounded-[3px] text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  format === 'mobile'
                    ? 'bg-emerald-500 text-black font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Mobile (Compact)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('desktop')}
                className={`px-2 py-1 rounded-[3px] text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  format === 'desktop'
                    ? 'bg-emerald-500 text-black font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3 h-3" />
                <span>Desktop (16:9)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('square')}
                className={`px-2 py-1 rounded-[3px] text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  format === 'square'
                    ? 'bg-emerald-500 text-black font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Square className="w-3 h-3" />
                <span>Square (1:1)</span>
              </button>
            </div>

            <div className="text-[10px] font-mono text-slate-400 hidden sm:block">
              {format === 'mobile' ? '1200x960 HD' : format === 'desktop' ? '1920x1080 4K' : '1200x1200 4K'}
            </div>
          </div>

          {/* Theme Selector Strip (Horizontally Scrollable / Wrap with icons) */}
          <div className="bg-[#0e1320] border-b border-[#1b2336] px-3 py-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 min-w-max">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mr-1">
                Theme:
              </span>
              {(Object.keys(THEMES) as CardTheme[]).map((tKey) => {
                const t = THEMES[tKey];
                const isActive = theme === tKey;
                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => setTheme(tKey)}
                    className={`px-2 py-1 rounded-[4px] text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                        : 'bg-[#141b2a] text-slate-300 border-white/5 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Card Container */}
          <div className="p-3 sm:p-3.5 space-y-2.5">
            <div
              style={{
                ...(currentTheme.bgImage
                  ? {
                      backgroundImage: `linear-gradient(rgba(4,8,16,0.76), rgba(2,5,10,0.88)), url(${currentTheme.bgImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : {}),
                borderColor: currentTheme.borderOuter,
                boxShadow: `0 0 20px ${currentTheme.accentGlow}`,
              }}
              className={`rounded-[8px] border-2 p-3 sm:p-3.5 space-y-2.5 relative overflow-hidden transition-all shadow-xl select-none ${
                !currentTheme.bgImage
                  ? theme === 'obsidian'
                    ? 'bg-gradient-to-br from-[#080a0e] via-[#0c1017] to-[#05070a]'
                    : 'bg-gradient-to-br from-[#030c12] via-[#06141c] to-[#02090e]'
                  : ''
              }`}
            >
              {/* Subtle Grid overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none opacity-40" />

              {/* Card Header */}
              <div className="flex items-center justify-between relative z-10 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6.5 h-6.5 rounded-[5px] shrink-0 overflow-hidden flex items-center justify-center">
                    <LampIcon className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-xs font-black tracking-widest block leading-tight bg-gradient-to-r from-[#ffe893] via-[#f59e0b] to-[#d97706] bg-clip-text text-transparent">
                      ALADDINSNIPER
                    </span>
                    <span className="text-[7.5px] font-mono font-bold text-cyan-400 block tracking-wider uppercase leading-none">
                      VIP REAL-TIME TRADE SNIPER
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-[3px] text-[9.5px] font-mono font-black uppercase tracking-wider border shrink-0 ${
                    data.accountType === 'REAL'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                      : 'bg-amber-500/15 border-amber-500 text-amber-400'
                  }`}
                >
                  {data.accountType} • {data.asset || 'AUD/CHF OTC'}
                </span>
              </div>

              {/* Main Net Profit (Compact & High Contrast) */}
              <div className="pt-0.5 pb-0.5 relative z-10">
                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                  NET REAL-TIME PROFIT
                </span>
                <div className="flex items-baseline justify-between gap-2">
                  <div
                    className={`text-3xl sm:text-4xl font-mono font-black tracking-tight ${
                      isProfit
                        ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.7)]'
                        : 'text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.7)]'
                    }`}
                  >
                    {pnlFormatted}
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded-[3px] font-mono font-black text-xs border shrink-0 ${
                      isProfit
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                        : 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.25)]'
                    }`}
                  >
                    {roiFormatted}
                  </div>
                </div>
              </div>

              {/* 4 Metric Boxes: 2x2 grid in mobile, 4 columns in desktop */}
              <div
                className={`grid gap-1.5 relative z-10 ${
                  format === 'desktop' ? 'grid-cols-4' : 'grid-cols-2'
                }`}
              >
                <div className="bg-black/50 backdrop-blur-sm border border-white/10 p-2 rounded-[4px] text-left">
                  <span className="text-[7.5px] font-black uppercase text-slate-400 block mb-0.5">
                    WIN RATE
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-black text-cyan-400 block">
                    {data.winRate}%
                  </span>
                </div>

                <div className="bg-black/50 backdrop-blur-sm border border-white/10 p-2 rounded-[4px] text-left">
                  <span className="text-[7.5px] font-black uppercase text-slate-400 block mb-0.5">
                    WON / LOST
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-black text-white block">
                    {data.winsCount}W / {data.lossesCount}L
                  </span>
                </div>

                <div className="bg-black/50 backdrop-blur-sm border border-white/10 p-2 rounded-[4px] text-left">
                  <span className="text-[7.5px] font-black uppercase text-slate-400 block mb-0.5">
                    ENDING BALANCE
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-white block">
                    ${data.endingBalance.toFixed(2)}
                  </span>
                </div>

                <div className="bg-black/50 backdrop-blur-sm border border-white/10 p-2 rounded-[4px] text-left">
                  <span className="text-[7.5px] font-black uppercase text-slate-400 block mb-0.5">
                    CYCLE GOAL
                  </span>
                  <span
                    className="text-xs sm:text-sm font-mono font-black text-amber-400 block truncate"
                    title={cleanGoal}
                  >
                    {cleanGoal}
                  </span>
                </div>
              </div>

              {/* Secondary Stats Strip (Glassmorphism) */}
              <div className="grid grid-cols-4 gap-1 p-1.5 rounded-[4px] bg-black/60 backdrop-blur-sm border border-white/10 text-[8px] font-mono text-slate-300 relative z-10">
                <div>
                  <span className="text-slate-400 block text-[7px] uppercase font-bold">Starting</span>
                  <span className="text-white font-bold">${data.startingBalance.toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[7px] uppercase font-bold">Trades</span>
                  <span className="text-white font-bold">{data.tradesCount}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[7px] uppercase font-bold">Payout</span>
                  <span className="text-white font-bold">{data.payoutRate || 92}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[7px] uppercase font-bold">Engine</span>
                  <span className="text-white font-bold">Tiered</span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[8px] font-mono text-slate-300 relative z-10">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>{data.timestamp}</span>
                </div>
                <span
                  style={{ color: currentTheme.accent }}
                  className="font-bold tracking-wider text-[7.5px]"
                >
                  ✓ ALADDINSNIPER VERIFIED
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={handleShareCard}
                disabled={isGenerating}
                className="py-2 px-3 rounded-[4px] bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              <button
                onClick={handleDownloadImage}
                disabled={isGenerating}
                className="py-2 px-3 rounded-[4px] bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Generating...' : 'Download'}</span>
              </button>

              <button
                onClick={handleCopyImage}
                disabled={isGenerating}
                className="py-2 px-3 rounded-[4px] border border-white/10 bg-[#161c28] hover:bg-[#1e2536] text-slate-200 font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedImage ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Toast Notification */}
            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-mono py-1.5 px-3 rounded-[4px] text-center shadow-lg"
                >
                  {toastMessage}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
