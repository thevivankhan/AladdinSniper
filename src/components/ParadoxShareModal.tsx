import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download, Copy, Check, Share2 } from 'lucide-react';
import type { ParadoxShareData } from '../utils/paradoxEngine';

type ShareFormat = 'mobile' | 'desktop' | 'square';
type ShareThemeId = 'rocket' | 'matrix' | 'titan' | 'gold';

const SHARE_THEMES: Record<
  ShareThemeId,
  {
    id: ShareThemeId;
    name: string;
    bgStops: [string, string, string];
    orbColor: string;
    borderOuter: string;
    borderInner: string;
    glow: string;
    accent: string;
  }
> = {
  rocket: {
    id: 'rocket',
    name: 'Rocket',
    bgStops: ['#050b16', '#0c162b', '#070c17'],
    orbColor: 'rgba(16, 185, 129, 0.22)',
    borderOuter: '#10b981',
    borderInner: 'rgba(56, 189, 248, 0.35)',
    glow: 'rgba(16, 185, 129, 0.4)',
    accent: '#34d399'
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix',
    bgStops: ['#070b14', '#160d2c', '#090910'],
    orbColor: 'rgba(168, 85, 247, 0.24)',
    borderOuter: '#a855f7',
    borderInner: 'rgba(34, 211, 238, 0.35)',
    glow: 'rgba(168, 85, 247, 0.42)',
    accent: '#c084fc'
  },
  titan: {
    id: 'titan',
    name: 'Titan',
    bgStops: ['#050911', '#082032', '#060c18'],
    orbColor: 'rgba(34, 211, 238, 0.22)',
    borderOuter: '#06b6d4',
    borderInner: 'rgba(99, 102, 241, 0.35)',
    glow: 'rgba(6, 182, 212, 0.42)',
    accent: '#22d3ee'
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    bgStops: ['#0c0904', '#1f1606', '#0a0804'],
    orbColor: 'rgba(245, 158, 11, 0.24)',
    borderOuter: '#f59e0b',
    borderInner: 'rgba(251, 191, 36, 0.4)',
    glow: 'rgba(245, 158, 11, 0.42)',
    accent: '#fbbf24'
  }
};

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
}

export function renderParadoxCardToCanvas(
  canvas: HTMLCanvasElement,
  data: ParadoxShareData,
  format: ShareFormat,
  themeId: ShareThemeId
) {
  const th = SHARE_THEMES[themeId] || SHARE_THEMES.rocket;
  const width = format === 'desktop' ? 1920 : 1200;
  const height = format === 'desktop' ? 1080 : format === 'square' ? 1200 : 960;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const isProfit = Number(data.profitOrLoss) >= 0;
  const pnlFormatted = `${isProfit ? '+' : '-'}$${Math.abs(Number(data.profitOrLoss) || 0).toFixed(2)}`;
  const roiNum = data.startingBalance > 0 ? (data.profitOrLoss / data.startingBalance) * 100 : 0;
  const roiFormatted = `${roiNum >= 0 ? '+' : ''}${roiNum.toFixed(2)}%`;

  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, th.bgStops[0]);
  bgGrad.addColorStop(0.5, th.bgStops[1]);
  bgGrad.addColorStop(1, th.bgStops[2]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const orbGrad = ctx.createRadialGradient(width * 0.78, height * 0.25, 20, width * 0.78, height * 0.25, width * 0.45);
  orbGrad.addColorStop(0, th.orbColor);
  orbGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = orbGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
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

  ctx.save();
  ctx.strokeStyle = th.borderOuter;
  ctx.lineWidth = 5;
  ctx.shadowColor = th.glow;
  ctx.shadowBlur = 24;
  drawRoundedRect(ctx, 24, 24, width - 48, height - 48, 16);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = th.borderInner;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 36, 36, width - 72, height - 72, 12);
  ctx.stroke();

  const padX = format === 'desktop' ? 90 : format === 'square' ? 70 : 64;
  let curY = format === 'desktop' ? 80 : format === 'square' ? 70 : 64;
  const logoSize = format === 'desktop' ? 76 : 64;

  const embGrad = ctx.createLinearGradient(padX, curY, padX + logoSize, curY + logoSize);
  embGrad.addColorStop(0, '#fbbf24');
  embGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = embGrad;
  drawRoundedRect(ctx, padX, curY, logoSize, logoSize, 14);
  ctx.fill();
  ctx.fillStyle = '#090d16';
  ctx.font = `900 ${Math.round(logoSize * 0.52)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('A', padX + logoSize / 2, curY + logoSize * 0.68);

  const goldGrad = ctx.createLinearGradient(padX + logoSize + 18, curY, padX + 400, curY + 36);
  goldGrad.addColorStop(0, '#ffe893');
  goldGrad.addColorStop(0.5, '#f59e0b');
  goldGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = goldGrad;
  ctx.font = `900 ${format === 'desktop' ? 34 : 32}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('ALADDINSNIPER', padX + logoSize + 18, curY + 34);
  ctx.fillStyle = '#22d3ee';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('PARADOX COMPOUNDING ENGINE', padX + logoSize + 18, curY + 60);

  const pillW = format === 'desktop' ? 380 : 320;
  const pillH = format === 'desktop' ? 64 : 56;
  const pillX = width - padX - pillW;
  ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
  drawRoundedRect(ctx, pillX, curY + 4, pillW, pillH, 10);
  ctx.fill();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, pillX, curY + 4, pillW, pillH, 10);
  ctx.stroke();
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`VAULT · $${Number(data.vaultedAmount || 0).toFixed(2)}`, pillX + pillW / 2, curY + (format === 'desktop' ? 44 : 39));

  const divY = format === 'desktop' ? 190 : curY + 94;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, divY);
  ctx.lineTo(width - padX, divY);
  ctx.stroke();

  if (format === 'desktop') {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(data.heroLabel, padX, 260);
    ctx.save();
    ctx.fillStyle = isProfit ? '#10b981' : '#f43f5e';
    ctx.font = '900 100px monospace';
    ctx.shadowColor = isProfit ? 'rgba(16,185,129,0.7)' : 'rgba(244,63,94,0.7)';
    ctx.shadowBlur = 28;
    ctx.fillText(pnlFormatted, padX, 370);
    ctx.restore();

    ctx.fillStyle = isProfit ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)';
    drawRoundedRect(ctx, padX, 410, 260, 68, 10);
    ctx.fill();
    ctx.strokeStyle = isProfit ? '#10b981' : '#f43f5e';
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, padX, 410, 260, 68, 10);
    ctx.stroke();
    ctx.fillStyle = isProfit ? '#6ee7b7' : '#fda4af';
    ctx.font = '900 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(roiFormatted, padX + 130, 456);

    const rightX = 860, gridW = width - padX - rightX, gap = 20, bW = (gridW - gap) / 2, bH = 135, gridY = 240;
    const mItems = [
      { label: 'WIN RATE', val: `${data.winRate}%`, col: '#38bdf8' },
      { label: 'TRADES DONE', val: `${data.winsCount}W / ${data.lossesCount}L`, col: '#ffffff' },
      { label: 'ENDING VALUE', val: `$${Number(data.endingBalance).toFixed(2)}`, col: '#ffffff' },
      { label: 'CYCLE GOAL', val: data.strategyGoal, col: '#f59e0b' }
    ];
    mItems.forEach((m, idx) => {
      const col = idx % 2, row = Math.floor(idx / 2), bx = rightX + col * (bW + gap), by = gridY + row * (bH + gap);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      drawRoundedRect(ctx, bx, by, bW, bH, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, bx, by, bW, bH, 12);
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(m.label, bx + 20, by + 38);
      ctx.fillStyle = m.col;
      ctx.font = '900 28px monospace';
      ctx.fillText(m.val, bx + 20, by + 94);
    });
    curY = 620;
  } else {
    curY = divY + 48;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(data.heroLabel, padX, curY);
    curY += 80;
    ctx.save();
    ctx.fillStyle = isProfit ? '#10b981' : '#f43f5e';
    ctx.font = `900 ${format === 'square' ? 88 : 82}px monospace`;
    ctx.shadowColor = isProfit ? 'rgba(16,185,129,0.7)' : 'rgba(244,63,94,0.7)';
    ctx.shadowBlur = 24;
    ctx.fillText(pnlFormatted, padX, curY);
    ctx.restore();

    const roiW = 240, roiH = 68, roiX = width - padX - roiW, roiY = curY - 70;
    ctx.fillStyle = isProfit ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)';
    drawRoundedRect(ctx, roiX, roiY, roiW, roiH, 12);
    ctx.fill();
    ctx.strokeStyle = isProfit ? '#10b981' : '#f43f5e';
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, roiX, roiY, roiW, roiH, 12);
    ctx.stroke();
    ctx.fillStyle = isProfit ? '#6ee7b7' : '#fda4af';
    ctx.font = '900 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(roiFormatted, roiX + roiW / 2, roiY + 46);

    curY += 54;
    const gap = 16, gridW = width - padX * 2, bW = (gridW - gap) / 2, bH = 132;
    const mItems = [
      { label: 'WIN RATE', val: `${data.winRate}%`, col: '#38bdf8' },
      { label: 'TRADES DONE', val: `${data.winsCount}W / ${data.lossesCount}L`, col: '#ffffff' },
      { label: 'ENDING VALUE', val: `$${Number(data.endingBalance).toFixed(2)}`, col: '#ffffff' },
      { label: 'CYCLE GOAL', val: data.strategyGoal, col: '#f59e0b' }
    ];
    mItems.forEach((m, idx) => {
      const col = idx % 2, row = Math.floor(idx / 2), bx = padX + col * (bW + gap), by = curY + row * (bH + gap);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      drawRoundedRect(ctx, bx, by, bW, bH, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, bx, by, bW, bH, 10);
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(m.label, bx + 22, by + 36);
      ctx.fillStyle = m.col;
      ctx.font = '900 28px monospace';
      ctx.fillText(m.val, bx + 22, by + 92);
    });
    curY += bH * 2 + gap + 32;
  }

  const secW = width - padX * 2, secH = 112;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  drawRoundedRect(ctx, padX, curY, secW, secH, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, padX, curY, secW, secH, 12);
  ctx.stroke();

  const secList = [
    { label: data.seedLabel, val: `$${Number(data.startingBalance).toFixed(2)}` },
    { label: 'Trades Executed', val: `${data.tradesCount}` },
    { label: 'Payout Ratio', val: `${data.payoutRate}%` },
    { label: 'Engine', val: data.engineLabel }
  ];
  const cW = secW / 4;
  secList.forEach((s, idx) => {
    const sx = padX + idx * cW + 20;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(s.label, sx, curY + 38);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '900 21px monospace';
    ctx.fillText(s.val, sx, curY + 78);
  });

  const footY = height - (format === 'desktop' ? 84 : 58);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`VERIFIED SESSION · ${data.timestamp}`, padX, footY);
  ctx.textAlign = 'right';
  ctx.fillStyle = th.accent;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('ALADDINSNIPER OFFICIAL P&L', width - padX, footY);

  return canvas;
}

export const ParadoxShareModal: React.FC<{
  data: ParadoxShareData | null;
  onClose: () => void;
}> = ({ data, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [format, setFormat] = useState<ShareFormat>('mobile');
  const [theme, setTheme] = useState<ShareThemeId>('rocket');
  const [toast, setToast] = useState<string>('');
  const [copiedImg, setCopiedImg] = useState(false);
  const [copiedTxt, setCopiedTxt] = useState(false);

  const buildShareText = useCallback(() => {
    if (!data) return '';
    const isProfit = data.profitOrLoss >= 0;
    const pnlStr = `${isProfit ? '+' : '-'}$${Math.abs(data.profitOrLoss).toFixed(2)}`;
    const roi = data.startingBalance > 0 ? ((data.profitOrLoss / data.startingBalance) * 100).toFixed(2) : '0.00';
    return [
      data.shareHeadline,
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
      `${isProfit ? 'PROFIT' : 'LOSS'}: ${pnlStr} (${Number(roi) >= 0 ? '+' : ''}${roi}% ROI)`,
      ...(data.vaultedAmount > 0 ? [`Vault Locked: $${Number(data.vaultedAmount).toFixed(2)}`] : []),
      `Session: ${data.winsCount}W / ${data.lossesCount}L (${data.winRate}% Win Rate)`,
      `Ending Value: $${Number(data.endingBalance).toFixed(2)}`,
      `Goal: ${data.strategyGoal}`,
      `Engine: ${data.engineLabel}`,
      `Payout: ${data.payoutRate}%`,
      `Date: ${data.timestamp}`
    ].join('\n');
  }, [data]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    renderParadoxCardToCanvas(canvasRef.current, data, format, theme);
  }, [data, format, theme]);

  if (!data) return null;

  const encodedText = encodeURIComponent(buildShareText());

  const handleDownloadPNG = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    renderParadoxCardToCanvas(cv, data, format, theme);
    const a = document.createElement('a');
    a.download = `aladdinsniper-paradox-${theme}-${format}-${Date.now()}.png`;
    a.href = cv.toDataURL('image/png', 1.0);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setToast('HD PNG downloaded');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopiedTxt(true);
      setToast('Report text copied');
      setTimeout(() => setCopiedTxt(false), 2000);
    } catch {
      setToast('Copy blocked by browser');
    }
  };

  const handleCopyImage = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    renderParadoxCardToCanvas(cv, data, format, theme);
    cv.toBlob(async (blob) => {
      try {
        if (blob && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopiedImg(true);
          setToast('HD card copied to clipboard');
          setTimeout(() => setCopiedImg(false), 2000);
        } else {
          setToast('Use Download PNG on this browser');
        }
      } catch {
        setToast('Use Download PNG on this browser');
      }
    }, 'image/png');
  };

  const handleNativeShare = () => {
    const cv = canvasRef.current;
    const text = buildShareText();
    if (!cv) return;
    cv.toBlob(async (blob) => {
      try {
        if (blob && typeof navigator.share === 'function' && typeof File !== 'undefined') {
          const file = new File([blob], `aladdinsniper-paradox-${Date.now()}.png`, { type: 'image/png' });
          if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: 'AladdinSniper Paradox P&L', text, files: [file] });
            setToast('HD card shared');
            return;
          }
        }
        if (typeof navigator.share === 'function') {
          await navigator.share({ title: 'AladdinSniper Paradox P&L', text });
          setToast('Shared successfully');
          return;
        }
        await navigator.clipboard.writeText(text);
        setToast('Report text copied');
      } catch {
        setToast('Use WhatsApp / Telegram or PNG download');
      }
    }, 'image/png');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-[#090d16] border border-white/10 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="min-w-0 pr-3">
            <h3 className="text-sm font-bold text-white truncate">HD Paradox P&L Share Card</h3>
            <p className="text-xs text-zinc-400 truncate">{data.title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 flex items-center justify-center shrink-0"
            aria-label="Close share dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 bg-black/50 rounded-lg border border-white/10">
            {([
              { id: 'mobile', label: 'Mobile' },
              { id: 'desktop', label: 'Desktop 16:9' },
              { id: 'square', label: 'Square 1:1' }
            ] as const).map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  format === f.id ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-black/50 rounded-lg border border-white/10">
            {(Object.values(SHARE_THEMES)).map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  theme === t.id ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#04070e] border border-white/10 rounded-lg p-2 flex items-center justify-center">
          <canvas ref={canvasRef} className="max-w-full max-h-[44vh] rounded block" />
        </div>

        {toast && <div className="text-xs font-semibold text-emerald-400 text-center">{toast}</div>}

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <button
            onClick={handleDownloadPNG}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" /> PNG
          </button>
          <button
            onClick={handleCopyImage}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-semibold whitespace-nowrap"
          >
            {copiedImg ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedImg ? 'Copied' : 'Copy Img'}
          </button>
          <button
            onClick={handleCopyText}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-200 text-xs font-semibold whitespace-nowrap"
          >
            {copiedTxt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedTxt ? 'Copied' : 'Copy Txt'}
          </button>
          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 text-xs font-semibold whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
          <a
            href={`https://wa.me/?text=${encodedText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center py-2 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold whitespace-nowrap"
          >
            WhatsApp
          </a>
          <a
            href={`https://t.me/share/url?url=&text=${encodedText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center py-2 px-3 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-bold whitespace-nowrap"
          >
            Telegram
          </a>
        </div>
      </div>
    </div>
  );
};
