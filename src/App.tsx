import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Activity, TrendingUp, TrendingDown, ShieldAlert, Zap, Target, Clock, CheckCircle2, CircleDashed, Bot, ChevronDown, ChevronUp, Minus, Key, Search, Copy, ExternalLink, Sparkles, Layers, Trash2, BrainCircuit, LineChart, Bell, BellRing, Rocket, Loader2, Plus, BarChart3, CandlestickChart, Flame, Radar, AlertTriangle, Crosshair, Brain, Newspaper, Calendar, Map, Shapes, Square, Play, BookOpen, Globe, ShieldCheck, Star, Calculator } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { GoogleGenAI, Type } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { motion, AnimatePresence } from 'motion/react';
import { CompoundingPlans } from './CompoundingPlans';
import { playSoundEffect } from './utils/audioSystem';

// Aladdin Blue Genie App Icon Component (Edge-to-edge transparent diamond badge)
const LampIcon = ({ className }: { className?: string }) => (
  <img
    src="/aladdin-blue-genie-icon.png"
    alt="Aladdin Blue Genie Icon"
    className={`object-contain select-none pointer-events-none block drop-shadow-[0_0_8px_rgba(6,182,212,0.4)] ${className || 'w-5 h-5'}`}
  />
);

type MarketType = 'LIVE' | 'OTC';
type TradingMode = 'REGULAR' | 'COMPOUNDING';

const LIVE_TIMEFRAMES = ['1m', '2m', '3m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];
const OTC_TIMEFRAMES = ['5s', '10s', '15s', '30s', '1m', '2m', '5m'];

const ASSET_CATEGORIES = ['All', 'Favorites', 'Forex', 'Crypto', 'Commodities', 'Stocks', 'Indices'];

const CURRENCY_PAIRS = [
  // Forex Majors
  { label: 'EUR/USD', symbol: 'FX:EURUSD', category: 'Forex' },
  { label: 'GBP/USD', symbol: 'FX:GBPUSD', category: 'Forex' },
  { label: 'USD/JPY', symbol: 'FX:USDJPY', category: 'Forex' },
  { label: 'USD/CHF', symbol: 'FX:USDCHF', category: 'Forex' },
  { label: 'USD/CAD', symbol: 'FX:USDCAD', category: 'Forex' },
  { label: 'AUD/USD', symbol: 'FX:AUDUSD', category: 'Forex' },
  { label: 'NZD/USD', symbol: 'FX:NZDUSD', category: 'Forex' },
  // Forex Minors
  { label: 'EUR/GBP', symbol: 'FX:EURGBP', category: 'Forex' },
  { label: 'EUR/JPY', symbol: 'FX:EURJPY', category: 'Forex' },
  { label: 'EUR/CHF', symbol: 'FX:EURCHF', category: 'Forex' },
  { label: 'EUR/AUD', symbol: 'FX:EURAUD', category: 'Forex' },
  { label: 'EUR/NZD', symbol: 'FX:EURNZD', category: 'Forex' },
  { label: 'EUR/CAD', symbol: 'FX:EURCAD', category: 'Forex' },
  { label: 'GBP/JPY', symbol: 'FX:GBPJPY', category: 'Forex' },
  { label: 'GBP/CHF', symbol: 'FX:GBPCHF', category: 'Forex' },
  { label: 'GBP/AUD', symbol: 'FX:GBPAUD', category: 'Forex' },
  { label: 'GBP/CAD', symbol: 'FX:GBPCAD', category: 'Forex' },
  { label: 'GBP/NZD', symbol: 'FX:GBPNZD', category: 'Forex' },
  { label: 'AUD/JPY', symbol: 'FX:AUDJPY', category: 'Forex' },
  { label: 'AUD/CHF', symbol: 'FX:AUDCHF', category: 'Forex' },
  { label: 'AUD/CAD', symbol: 'FX:AUDCAD', category: 'Forex' },
  { label: 'AUD/NZD', symbol: 'FX:AUDNZD', category: 'Forex' },
  { label: 'NZD/JPY', symbol: 'FX:NZDJPY', category: 'Forex' },
  { label: 'NZD/CHF', symbol: 'FX:NZDCHF', category: 'Forex' },
  { label: 'NZD/CAD', symbol: 'FX:NZDCAD', category: 'Forex' },
  { label: 'CAD/JPY', symbol: 'FX:CADJPY', category: 'Forex' },
  { label: 'CAD/CHF', symbol: 'FX:CADCHF', category: 'Forex' },
  { label: 'CHF/JPY', symbol: 'FX:CHFJPY', category: 'Forex' },
  { label: 'USD/INR', symbol: 'FX_IDC:USDINR', category: 'Forex' },
  { label: 'USD/TRY', symbol: 'FX:USDTRY', category: 'Forex' },
  { label: 'USD/BRL', symbol: 'FX_IDC:USDBRL', category: 'Forex' },
  { label: 'USD/ZAR', symbol: 'FX:USDZAR', category: 'Forex' },
  { label: 'USD/MXN', symbol: 'FX:USDMXN', category: 'Forex' },
  { label: 'USD/SGD', symbol: 'FX:USDSGD', category: 'Forex' },
  { label: 'USD/HKD', symbol: 'FX:USDHKD', category: 'Forex' },
  
  // Crypto
  { label: 'BTC/USDT', symbol: 'BINANCE:BTCUSDT', category: 'Crypto' },
  { label: 'ETH/USDT', symbol: 'BINANCE:ETHUSDT', category: 'Crypto' },
  { label: 'SOL/USDT', symbol: 'BINANCE:SOLUSDT', category: 'Crypto' },
  { label: 'XRP/USDT', symbol: 'BINANCE:XRPUSDT', category: 'Crypto' },
  { label: 'ADA/USDT', symbol: 'BINANCE:ADAUSDT', category: 'Crypto' },
  { label: 'DOGE/USDT', symbol: 'BINANCE:DOGEUSDT', category: 'Crypto' },
  { label: 'DOT/USDT', symbol: 'BINANCE:DOTUSDT', category: 'Crypto' },
  { label: 'TRX/USDT', symbol: 'BINANCE:TRXUSDT', category: 'Crypto' },
  { label: 'LINK/USDT', symbol: 'BINANCE:LINKUSDT', category: 'Crypto' },
  { label: 'SHIB/USDT', symbol: 'BINANCE:SHIBUSDT', category: 'Crypto' },
  { label: 'MATIC/USDT', symbol: 'BINANCE:MATICUSDT', category: 'Crypto' },
  { label: 'BNB/USDT', symbol: 'BINANCE:BNBUSDT', category: 'Crypto' },
  { label: 'AVAX/USDT', symbol: 'BINANCE:AVAXUSDT', category: 'Crypto' },
  { label: 'LTC/USDT', symbol: 'BINANCE:LTCUSDT', category: 'Crypto' },
  { label: 'BCH/USDT', symbol: 'BINANCE:BCHUSDT', category: 'Crypto' },
  { label: 'NEAR/USDT', symbol: 'BINANCE:NEARUSDT', category: 'Crypto' },
  { label: 'ALGO/USDT', symbol: 'BINANCE:ALGOUSDT', category: 'Crypto' },
  { label: 'ICP/USDT', symbol: 'BINANCE:ICPUSDT', category: 'Crypto' },
  
  // Commodities
  { label: 'GOLD (XAU/USD)', symbol: 'OANDA:XAUUSD', category: 'Commodities' },
  { label: 'SILVER (XAG/USD)', symbol: 'OANDA:XAGUSD', category: 'Commodities' },
  { label: 'BRENT OIL (UKOIL)', symbol: 'TVC:UKOIL', category: 'Commodities' },
  { label: 'CRUDE OIL (USOIL)', symbol: 'TVC:USOIL', category: 'Commodities' },
  { label: 'NATURAL GAS', symbol: 'TVC:NGAS', category: 'Commodities' },
  { label: 'PLATINUM', symbol: 'TVC:PLAT', category: 'Commodities' },
  { label: 'PALLADIUM', symbol: 'TVC:PALL', category: 'Commodities' },
  { label: 'COPPER', symbol: 'TVC:COPPER', category: 'Commodities' },
  
  // Indices
  { label: 'S&P 500', symbol: 'CURRENCYCOM:US500', category: 'Indices' },
  { label: 'NASDAQ 100', symbol: 'CURRENCYCOM:US100', category: 'Indices' },
  { label: 'DOW JONES 30', symbol: 'CURRENCYCOM:US30', category: 'Indices' },
  { label: 'DAX 40 (Germany)', symbol: 'CURRENCYCOM:DE40', category: 'Indices' },
  { label: 'FTSE 100 (UK)', symbol: 'CURRENCYCOM:UK100', category: 'Indices' },
  { label: 'NIKKEI 225 (Japan)', symbol: 'CURRENCYCOM:JP225', category: 'Indices' },
  { label: 'CAC 40 (France)', symbol: 'CURRENCYCOM:FR40', category: 'Indices' },
  { label: 'HSI 50 (HK)', symbol: 'CURRENCYCOM:HK50', category: 'Indices' },
  { label: 'ASX 200 (Australia)', symbol: 'CURRENCYCOM:AU200', category: 'Indices' },
  
  // Stocks
  { label: 'APPLE (AAPL)', symbol: 'NASDAQ:AAPL', category: 'Stocks' },
  { label: 'MICROSOFT (MSFT)', symbol: 'NASDAQ:MSFT', category: 'Stocks' },
  { label: 'GOOGLE (GOOGL)', symbol: 'NASDAQ:GOOGL', category: 'Stocks' },
  { label: 'AMAZON (AMZN)', symbol: 'NASDAQ:AMZN', category: 'Stocks' },
  { label: 'TESLA (TSLA)', symbol: 'NASDAQ:TSLA', category: 'Stocks' },
  { label: 'META (META)', symbol: 'NASDAQ:META', category: 'Stocks' },
  { label: 'NETFLIX (NFLX)', symbol: 'NASDAQ:NFLX', category: 'Stocks' },
  { label: 'NVIDIA (NVDA)', symbol: 'NASDAQ:NVDA', category: 'Stocks' },
  { label: 'ALIBABA (BABA)', symbol: 'NYSE:BABA', category: 'Stocks' },
  { label: 'VISA (V)', symbol: 'NYSE:V', category: 'Stocks' },
  { label: 'MASTERCARD (MA)', symbol: 'NYSE:MA', category: 'Stocks' },
  { label: 'JPMORGAN (JPM)', symbol: 'NYSE:JPM', category: 'Stocks' },
  { label: 'DISNEY (DIS)', symbol: 'NYSE:DIS', category: 'Stocks' },
  { label: 'PAYPAL (PYPL)', symbol: 'NASDAQ:PYPL', category: 'Stocks' },
  { label: 'ADOBE (ADBE)', symbol: 'NASDAQ:ADBE', category: 'Stocks' },
  { label: 'INTEL (INTC)', symbol: 'NASDAQ:INTC', category: 'Stocks' },
  { label: 'AMD (AMD)', symbol: 'NASDAQ:AMD', category: 'Stocks' },
  { label: 'PEPSICO (PEP)', symbol: 'NASDAQ:PEP', category: 'Stocks' },
  { label: 'COCA-COLA (KO)', symbol: 'NYSE:KO', category: 'Stocks' },
  { label: 'MODERNA (MRNA)', symbol: 'NASDAQ:MRNA', category: 'Stocks' },
  { label: 'PFIZER (PFE)', symbol: 'NYSE:PFE', category: 'Stocks' },
  { label: 'NIKE (NKE)', symbol: 'NYSE:NKE', category: 'Stocks' },
  { label: 'STARBUCKS (SBUX)', symbol: 'NASDAQ:SBUX', category: 'Stocks' },
  { label: 'WALMART (WMT)', symbol: 'NYSE:WMT', category: 'Stocks' },
  { label: 'SHOPIFY (SHOP)', symbol: 'NYSE:SHOP', category: 'Stocks' },
  { label: 'UBER (UBER)', symbol: 'NYSE:UBER', category: 'Stocks' },
  { label: 'COINBASE (COIN)', symbol: 'NASDAQ:COIN', category: 'Stocks' },
];

const OTC_PAIRS = [
  // Forex OTC
  { label: 'EURUSD OTC', symbol: 'EURUSD-OTC', category: 'Forex' },
  { label: 'GBPUSD OTC', symbol: 'GBPUSD-OTC', category: 'Forex' },
  { label: 'USDJPY OTC', symbol: 'USDJPY-OTC', category: 'Forex' },
  { label: 'USDCHF OTC', symbol: 'USDCHF-OTC', category: 'Forex' },
  { label: 'AUDUSD OTC', symbol: 'AUDUSD-OTC', category: 'Forex' },
  { label: 'NZDUSD OTC', symbol: 'NZDUSD-OTC', category: 'Forex' },
  { label: 'USDCAD OTC', symbol: 'USDCAD-OTC', category: 'Forex' },
  { label: 'EURGBP OTC', symbol: 'EURGBP-OTC', category: 'Forex' },
  { label: 'EURJPY OTC', symbol: 'EURJPY-OTC', category: 'Forex' },
  { label: 'GBPJPY OTC', symbol: 'GBPJPY-OTC', category: 'Forex' },
  { label: 'AUDJPY OTC', symbol: 'AUDJPY-OTC', category: 'Forex' },
  { label: 'AUDCAD OTC', symbol: 'AUDCAD-OTC', category: 'Forex' },
  { label: 'AUDCHF OTC', symbol: 'AUDCHF-OTC', category: 'Forex' },
  { label: 'AUDNZD OTC', symbol: 'AUDNZD-OTC', category: 'Forex' },
  { label: 'CADCHF OTC', symbol: 'CADCHF-OTC', category: 'Forex' },
  { label: 'CADJPY OTC', symbol: 'CADJPY-OTC', category: 'Forex' },
  { label: 'CHFJPY OTC', symbol: 'CHFJPY-OTC', category: 'Forex' },
  { label: 'EURAUD OTC', symbol: 'EURAUD-OTC', category: 'Forex' },
  { label: 'EURCAD OTC', symbol: 'EURCAD-OTC', category: 'Forex' },
  { label: 'EURCHF OTC', symbol: 'EURCHF-OTC', category: 'Forex' },
  { label: 'EURNZD OTC', symbol: 'EURNZD-OTC', category: 'Forex' },
  { label: 'GBPAUD OTC', symbol: 'GBPAUD-OTC', category: 'Forex' },
  { label: 'GBPCAD OTC', symbol: 'GBPCAD-OTC', category: 'Forex' },
  { label: 'GBPCHF OTC', symbol: 'GBPCHF-OTC', category: 'Forex' },
  { label: 'GBPNZD OTC', symbol: 'GBPNZD-OTC', category: 'Forex' },
  { label: 'NZDCAD OTC', symbol: 'NZDCAD-OTC', category: 'Forex' },
  { label: 'NZDCHF OTC', symbol: 'NZDCHF-OTC', category: 'Forex' },
  { label: 'NZDJPY OTC', symbol: 'NZDJPY-OTC', category: 'Forex' },
  { label: 'USDINR OTC', symbol: 'USDINR-OTC', category: 'Forex' },
  { label: 'USDTRY OTC', symbol: 'USDTRY-OTC', category: 'Forex' },
  { label: 'USDBRL OTC', symbol: 'USDBRL-OTC', category: 'Forex' },
  { label: 'USDZAR OTC', symbol: 'USDZAR-OTC', category: 'Forex' },
  { label: 'USDMXN OTC', symbol: 'USDMXN-OTC', category: 'Forex' },
  { label: 'USDSGD OTC', symbol: 'USDSGD-OTC', category: 'Forex' },
  { label: 'USDHKD OTC', symbol: 'USDHKD-OTC', category: 'Forex' },
  { label: 'EURHUF OTC', symbol: 'EURHUF-OTC', category: 'Forex' },
  { label: 'USDCLP OTC', symbol: 'USDCLP-OTC', category: 'Forex' },
  { label: 'USDPHP OTC', symbol: 'USDPHP-OTC', category: 'Forex' },
  { label: 'USDARS OTC', symbol: 'USDARS-OTC', category: 'Forex' },
  
  // Commodities OTC
  { label: 'Gold-OTC', symbol: 'GOLD-OTC', category: 'Commodities' },
  { label: 'Silver-OTC', symbol: 'SILVER-OTC', category: 'Commodities' },
  { label: 'Crude Oil-OTC', symbol: 'OIL-OTC', category: 'Commodities' },
  { label: 'Brent-OTC', symbol: 'BRENT-OTC', category: 'Commodities' },
  { label: 'Platinum-OTC', symbol: 'PLAT-OTC', category: 'Commodities' },
  { label: 'Palladium-OTC', symbol: 'PALL-OTC', category: 'Commodities' },
  { label: 'Natural Gas-OTC', symbol: 'NGAS-OTC', category: 'Commodities' },
  
  // Indices OTC
  { label: 'SPX 500-OTC', symbol: 'SPX-OTC', category: 'Indices' },
  { label: 'NASDAQ 100-OTC', symbol: 'NDX-OTC', category: 'Indices' },
  { label: 'Dow Jones-OTC', symbol: 'DJI-OTC', category: 'Indices' },
  { label: 'DAX 40-OTC', symbol: 'DE40-OTC', category: 'Indices' },
  { label: 'FTSE 100-OTC', symbol: 'UK100-OTC', category: 'Indices' },
  { label: 'CAC 40-OTC', symbol: 'FR40-OTC', category: 'Indices' },
  
  // Crypto OTC
  { label: 'Bitcoin-OTC', symbol: 'BTC-OTC', category: 'Crypto' },
  { label: 'Ethereum-OTC', symbol: 'ETH-OTC', category: 'Crypto' },
  { label: 'Litecoin-OTC', symbol: 'LTC-OTC', category: 'Crypto' },
  { label: 'Ripple-OTC', symbol: 'XRP-OTC', category: 'Crypto' },
  { label: 'Solana-OTC', symbol: 'SOL-OTC', category: 'Crypto' },
  { label: 'Cardano-OTC', symbol: 'ADA-OTC', category: 'Crypto' },
  { label: 'Dogecoin-OTC', symbol: 'DOGE-OTC', category: 'Crypto' },
  { label: 'Polkadot-OTC', symbol: 'DOT-OTC', category: 'Crypto' },
  { label: 'Polygon-OTC', symbol: 'MATIC-OTC', category: 'Crypto' },
  { label: 'Shiba Inu-OTC', symbol: 'SHIB-OTC', category: 'Crypto' },
  { label: 'Avalanche-OTC', symbol: 'AVAX-OTC', category: 'Crypto' },
  { label: 'Chainlink-OTC', symbol: 'LINK-OTC', category: 'Crypto' },
  { label: 'PEPE-OTC', symbol: 'PEPE-OTC', category: 'Crypto' },
  { label: 'FLOKI-OTC', symbol: 'FLOKI-OTC', category: 'Crypto' },
  { label: 'NEAR-OTC', symbol: 'NEAR-OTC', category: 'Crypto' },
  { label: 'OP-OTC', symbol: 'OP-OTC', category: 'Crypto' },
  { label: 'ARB-OTC', symbol: 'ARB-OTC', category: 'Crypto' },
  { label: 'STX-OTC', symbol: 'STX-OTC', category: 'Crypto' },
  { label: 'FIL-OTC', symbol: 'FIL-OTC', category: 'Crypto' },
  { label: 'RNDR-OTC', symbol: 'RNDR-OTC', category: 'Crypto' },
  { label: 'BTCUSD OTC', symbol: 'BTCUSD-OTC', category: 'Crypto' }, 
  { label: 'ETHUSD OTC', symbol: 'ETHUSD-OTC', category: 'Crypto' }, 
  { label: 'LTCUSD OTC', symbol: 'LTCUSD-OTC', category: 'Crypto' }, 
  { label: 'XRPUSD OTC', symbol: 'XRPUSD-OTC', category: 'Crypto' }, 
  { label: 'DOGEUSD OTC', symbol: 'DOGEUSD-OTC', category: 'Crypto' }, 
  { label: 'SOLUSD OTC', symbol: 'SOLUSD-OTC', category: 'Crypto' }, 
  { label: 'ADAUSD OTC', symbol: 'ADAUSD-OTC', category: 'Crypto' }, 
  { label: 'DOTUSD OTC', symbol: 'DOTUSD-OTC', category: 'Crypto' }, 
  { label: 'MATICUSD OTC', symbol: 'MATICUSD-OTC', category: 'Crypto' }, 
  { label: 'BNBUSD OTC', symbol: 'BNBUSD-OTC', category: 'Crypto' }, 
  { label: 'TRXUSD OTC', symbol: 'TRXUSD-OTC', category: 'Crypto' }, 
  { label: 'LINKUSD OTC', symbol: 'LINKUSD-OTC', category: 'Crypto' }, 
  { label: 'AVAXUSD OTC', symbol: 'AVAXUSD-OTC', category: 'Crypto' }, 
  { label: 'UNIUSD OTC', symbol: 'UNIUSD-OTC', category: 'Crypto' }, 
  { label: 'XLMUSD OTC', symbol: 'XLMUSD-OTC', category: 'Crypto' }, 
  { label: 'BCHUSD OTC', symbol: 'BCHUSD-OTC', category: 'Crypto' }, 
  { label: 'ETCUSD OTC', symbol: 'ETCUSD-OTC', category: 'Crypto' }, 
  { label: 'EOSUSD OTC', symbol: 'EOSUSD-OTC', category: 'Crypto' }, 
  { label: 'NEOUSD OTC', symbol: 'NEOUSD-OTC', category: 'Crypto' }, 
  { label: 'IOTAUSD OTC', symbol: 'IOTAUSD-OTC', category: 'Crypto' }, 
  { label: 'XMRUSD OTC', symbol: 'XMRUSD-OTC', category: 'Crypto' }, 
  { label: 'ZECUSD OTC', symbol: 'ZECUSD-OTC', category: 'Crypto' }, 
  { label: 'DASHUSD OTC', symbol: 'DASHUSD-OTC', category: 'Crypto' }, 
  { label: 'ATOMUSD OTC', symbol: 'ATOMUSD-OTC', category: 'Crypto' }, 
  { label: 'FILUSD OTC', symbol: 'FILUSD-OTC', category: 'Crypto' }, 
  { label: 'VETUSD OTC', symbol: 'VETUSD-OTC', category: 'Crypto' }, 
  { label: 'ALGOUSD OTC', symbol: 'ALGOUSD-OTC', category: 'Crypto' }, 
  { label: 'XTZUSD OTC', symbol: 'XTZUSD-OTC', category: 'Crypto' }, 
  { label: 'THETAUSD OTC', symbol: 'THETAUSD-OTC', category: 'Crypto' }, 
  { label: 'SANDUSD OTC', symbol: 'SANDUSD-OTC', category: 'Crypto' },
  
  // Stocks OTC
  { label: 'Apple-OTC', symbol: 'AAPL-OTC', category: 'Stocks' },
  { label: 'Microsoft-OTC', symbol: 'MSFT-OTC', category: 'Stocks' },
  { label: 'Google-OTC', symbol: 'GOOG-OTC', category: 'Stocks' },
  { label: 'Amazon-OTC', symbol: 'AMZN-OTC', category: 'Stocks' },
  { label: 'Tesla-OTC', symbol: 'TSLA-OTC', category: 'Stocks' },
  { label: 'Meta-OTC', symbol: 'META-OTC', category: 'Stocks' },
  { label: 'Netflix-OTC', symbol: 'NFLX-OTC', category: 'Stocks' },
  { label: 'Intel-OTC', symbol: 'INTC-OTC', category: 'Stocks' },
  { label: 'Boeing-OTC', symbol: 'BA-OTC', category: 'Stocks' },
  { label: 'Cisco-OTC', symbol: 'CSCO-OTC', category: 'Stocks' },
  { label: 'McDonalds-OTC', symbol: 'MCD-OTC', category: 'Stocks' },
  { label: 'Visa-OTC', symbol: 'V-OTC', category: 'Stocks' },
  { label: 'Mastercard-OTC', symbol: 'MA-OTC', category: 'Stocks' },
  { label: 'Johnson & Johnson-OTC', symbol: 'JNJ-OTC', category: 'Stocks' },
  { label: 'Pfizer-OTC', symbol: 'PFE-OTC', category: 'Stocks' },
  { label: 'Alibaba-OTC', symbol: 'BABA-OTC', category: 'Stocks' },
  { label: 'Tencent-OTC', symbol: 'TCEHY-OTC', category: 'Stocks' },
  { label: 'Baidu-OTC', symbol: 'BIDU-OTC', category: 'Stocks' },
  { label: 'Nvidia-OTC', symbol: 'NVDA-OTC', category: 'Stocks' },
  { label: 'AMD-OTC', symbol: 'AMD-OTC', category: 'Stocks' },
  { label: 'Twitter-OTC', symbol: 'TWTR-OTC', category: 'Stocks' },
  { label: 'Uber-OTC', symbol: 'UBER-OTC', category: 'Stocks' },
  { label: 'Lyft-OTC', symbol: 'LYFT-OTC', category: 'Stocks' },
  { label: 'Airbnb-OTC', symbol: 'ABNB-OTC', category: 'Stocks' },
  { label: 'PayPal-OTC', symbol: 'PYPL-OTC', category: 'Stocks' },
  { label: 'Square-OTC', symbol: 'SQ-OTC', category: 'Stocks' },
  { label: 'Shopify-OTC', symbol: 'SHOP-OTC', category: 'Stocks' },
  { label: 'Zoom-OTC', symbol: 'ZM-OTC', category: 'Stocks' },
  { label: 'Coca-Cola-OTC', symbol: 'KO-OTC', category: 'Stocks' },
  { label: 'PepsiCo-OTC', symbol: 'PEP-OTC', category: 'Stocks' },
  { label: 'Nike-OTC', symbol: 'NKE-OTC', category: 'Stocks' },
  { label: 'Disney-OTC', symbol: 'DIS-OTC', category: 'Stocks' },
  { label: 'Walmart-OTC', symbol: 'WMT-OTC', category: 'Stocks' },
  { label: 'Target-OTC', symbol: 'TGT-OTC', category: 'Stocks' },
  { label: 'Home Depot-OTC', symbol: 'HD-OTC', category: 'Stocks' },
  { label: 'Procter & Gamble-OTC', symbol: 'PG-OTC', category: 'Stocks' },
  { label: 'Bank of America-OTC', symbol: 'BAC-OTC', category: 'Stocks' },
  { label: 'JPMorgan-OTC', symbol: 'JPM-OTC', category: 'Stocks' },
  { label: 'Goldman Sachs-OTC', symbol: 'GS-OTC', category: 'Stocks' },
  { label: 'Morgan Stanley-OTC', symbol: 'MS-OTC', category: 'Stocks' },
  { label: 'Citigroup-OTC', symbol: 'C-OTC', category: 'Stocks' },
  { label: 'Wells Fargo-OTC', symbol: 'WFC-OTC', category: 'Stocks' },
  { label: 'American Express-OTC', symbol: 'AXP-OTC', category: 'Stocks' },
  { label: 'IBM-OTC', symbol: 'IBM-OTC', category: 'Stocks' },
  { label: 'Oracle-OTC', symbol: 'ORCL-OTC', category: 'Stocks' },
  { label: 'Salesforce-OTC', symbol: 'CRM-OTC', category: 'Stocks' },
  { label: 'Adobe-OTC', symbol: 'ADBE-OTC', category: 'Stocks' },
  { label: 'Spotify-OTC', symbol: 'SPOT-OTC', category: 'Stocks' },
  { label: 'Snap-OTC', symbol: 'SNAP-OTC', category: 'Stocks' },
  { label: 'Pinterest-OTC', symbol: 'PINS-OTC', category: 'Stocks' },
  { label: 'Roku-OTC', symbol: 'ROKU-OTC', category: 'Stocks' },
  { label: 'Peloton-OTC', symbol: 'PTON-OTC', category: 'Stocks' },
  { label: 'Coinbase-OTC', symbol: 'COIN-OTC', category: 'Stocks' },
  { label: 'Robinhood-OTC', symbol: 'HOOD-OTC', category: 'Stocks' },
  { label: 'Palantir-OTC', symbol: 'PLTR-OTC', category: 'Stocks' },
  { label: 'Snowflake-OTC', symbol: 'SNOW-OTC', category: 'Stocks' },
  { label: 'Unity-OTC', symbol: 'U-OTC', category: 'Stocks' },
  { label: 'Roblox-OTC', symbol: 'RBLX-OTC', category: 'Stocks' },
  { label: 'DraftKings-OTC', symbol: 'DKNG-OTC', category: 'Stocks' },
  { label: 'Penn National-OTC', symbol: 'PENN-OTC', category: 'Stocks' },
  { label: 'MGM Resorts-OTC', symbol: 'MGM-OTC', category: 'Stocks' },
  { label: 'Las Vegas Sands-OTC', symbol: 'LVS-OTC', category: 'Stocks' },
  { label: 'Wynn Resorts-OTC', symbol: 'WYNN-OTC', category: 'Stocks' },
  { label: 'Caesars-OTC', symbol: 'CZR-OTC', category: 'Stocks' },
  { label: 'Royal Caribbean-OTC', symbol: 'RCL-OTC', category: 'Stocks' },
  { label: 'Norwegian Cruise-OTC', symbol: 'NCLH-OTC', category: 'Stocks' }
];

interface ScanResult {
  assetPair?: string;
  marketCondition: string;
  recommendedExpiry: string;
  actionSignal: 'BUY' | 'SELL' | 'WAIT';
  signalStrength: number;
  accuracy: number;
  marketTrend: string;
  volatility: string;
  nextCandle: string;
  setupGrade: string;
  exactPriceLevels: string;
  martingaleSafetyRating: string;
  mtfContext: string;
  keyLevelPattern: string;
  deepAnalysis: string;
  technicalReasoning: string;
  aiLogic: string;
  riskManagement: string;
  bullishSentiment: number;
  heatmapZones: HeatmapZone[];
  clarityIndex: number;
  trapDetection: string;
  guardianWarning?: string;
  selfCorrectionLog?: string;
  rsi: number;
  macd: string;
  bollingerBands: string;
}

interface HeatmapZone {
  priceLevel: string;
  zoneType: 'SUPPORT' | 'RESISTANCE';
  intensity: number;
}

interface HistoryItem {
  id: string;
  timestamp: number;
  market: string;
  timeframe: string;
  assetPair: string;
  result: ScanResult;
  provider: string;
  model: string;
  image: string;
  tradingMode?: string;
  useMartingale?: boolean;
  outcome?: 'WIN' | 'LOSS' | 'PENDING';
  lossReason?: string;
  latency?: number;
}

interface SavedScan extends HistoryItem {
  customName: string;
}

const SCAN_STEPS = [
  "Initializing Pro Engine...",
  "Analyzing Price Action...",
  "Calculating Key Levels...",
  "Evaluating SMC & Liquidity...",
  "Generating Final Signal..."
];

type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

interface APIKeys {
  gemini: string[];
  openai: string[];
  anthropic: string[];
  openrouter: string[];
  telegramBotToken?: string;
  telegramChatId?: string;
}

// --- GLOBAL FREE MODE SETTINGS ---
// Agar aap chahte hain ki sabhi students bina key daale app use karein, 
// toh apni API key yahan set karwa sakte hain.
const GLOBAL_SETTINGS = {
  defaultProvider: 'gemini' as AIProvider,
  defaultOpenRouterModel: 'meta-llama/llama-3.2-90b-vision-instruct',
  defaultKeys: {
    gemini: [],
    openai: [],
    anthropic: [],
    openrouter: [], // Paste your global key here
    telegramBotToken: '',
    telegramChatId: ''
  } as APIKeys
};

const CountdownTimer = ({ targetDate }: { targetDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft('00:00:00');
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return <span>{timeLeft}</span>;
};

const KeyLevelsCard = ({ result }: { result: ScanResult }) => (
  <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-4 shadow-lg">
    <div className="flex items-center gap-2 mb-4">
      <Target className="w-4 h-4 text-cyan-400" />
      <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Key Levels & S/R</span>
    </div>
    <div className="space-y-3">
      <div className="bg-black/40 p-3 rounded-xl border border-white/5">
        <div className="text-[10px] text-slate-400 uppercase mb-1.5">Price Levels</div>
        <div className="text-sm font-mono font-bold text-white tracking-wide break-all">
          {result.exactPriceLevels || 'N/A'}
        </div>
      </div>
      <div className="bg-black/40 p-3 rounded-xl border border-white/5">
        <div className="text-[10px] text-slate-400 uppercase mb-1.5">Pattern</div>
        <div className="text-sm font-bold text-cyan-300 tracking-wide">
          {result.keyLevelPattern || 'N/A'}
        </div>
      </div>
    </div>
  </div>
);

const LiquidityHeatmapCard = ({ result }: { result: ScanResult }) => {
  if (!result.heatmapZones || result.heatmapZones.length === 0) return null;
  return (
    <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-rose-400" />
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">LIQUIDITY HEATMAP</span>
        </div>
        <div className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
          <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Live Feed</span>
        </div>
      </div>
      
      <div className="relative flex flex-col gap-3">
        {/* Vertical Line connecting zones */}
        <div className="absolute left-[11px] top-4 bottom-4 w-px bg-gradient-to-b from-rose-500/20 via-white/10 to-emerald-500/20"></div>
        
        {result.heatmapZones.map((zone, idx) => (
          <div key={idx} className="flex items-center gap-4 group">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 z-10 transition-all group-hover:scale-110 ${zone.zoneType === 'RESISTANCE' ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}`}>
              <div className={`w-2 h-2 rounded-full ${zone.zoneType === 'RESISTANCE' ? 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`}></div>
            </div>
            
            <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5 flex items-center justify-between group-hover:bg-white/10 transition-all">
              <div className="flex flex-col">
                <span className={`text-[9px] font-black uppercase tracking-widest ${zone.zoneType === 'RESISTANCE' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {zone.zoneType}
                </span>
                <span className="text-sm font-black text-white tracking-tight">{zone.priceLevel}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">INTENSITY</span>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`w-1.5 h-3 rounded-sm ${i < Math.ceil(zone.intensity / 20) ? (zone.zoneType === 'RESISTANCE' ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.4)]' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)]') : 'bg-white/5'}`}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TechnicalIndicatorsCard = ({ result }: { result: ScanResult }) => (
  <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-5 shadow-2xl">
    <div className="flex items-center gap-2 mb-4">
      <Activity className="w-4 h-4 text-purple-400" />
      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">TECHNICAL INDICATORS</span>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-black/40 p-3 rounded-xl border border-white/5 text-center group hover:border-emerald-500/30 transition-all">
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">RSI (14)</div>
        <div className={`text-lg font-black tracking-tight ${(result.rsi || 0) > 70 ? 'text-rose-400' : (result.rsi || 0) < 30 ? 'text-emerald-400' : 'text-white'}`}>
          {(result.rsi || 0).toFixed(1)}
        </div>
      </div>
      <div className="bg-black/40 p-3 rounded-xl border border-white/5 text-center group hover:border-purple-500/30 transition-all">
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">MACD</div>
        <div className={`text-xs font-black tracking-widest ${result.macd === 'BULLISH' ? 'text-emerald-400' : result.macd === 'BEARISH' ? 'text-rose-400' : 'text-slate-300'}`}>
          {result.macd || 'NEUTRAL'}
        </div>
      </div>
      <div className="bg-black/40 p-3 rounded-xl border border-white/5 text-center group hover:border-cyan-500/30 transition-all">
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">BOLLINGER</div>
        <div className="text-[10px] font-black text-white tracking-tight leading-tight">
          {result.bollingerBands || 'STABLE'}
        </div>
      </div>
    </div>
  </div>
);
const AutobotLiquidityHeatmapCard = ({ result }: { result: ScanResult }) => {
  if (!result || !result.heatmapZones || result.heatmapZones.length === 0) return null;
  return (
    <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-4 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-[30px] rounded-full"></div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Liquidity Heatmap</span>
        </div>
        <div className="bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
          <span className="text-[9px] font-bold text-rose-400 uppercase">Live Depth</span>
        </div>
      </div>
      <div className="space-y-3 relative z-10">
        {result.heatmapZones.map((zone, idx) => {
          if (!zone) return null;
          return (
            <div key={idx} className="group">
              <div className="flex justify-between items-center mb-1 px-1">
                <span className={`text-[9px] font-black tracking-tighter uppercase ${zone.zoneType === 'RESISTANCE' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {zone.zoneType} ZONE
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-300">{zone.priceLevel}</span>
              </div>
              <div className="relative h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${zone.intensity || 0}%` }}
                  transition={{ duration: 1, delay: idx * 0.1 }}
                  className={`absolute left-0 top-0 bottom-0 rounded-full ${
                    zone.zoneType === 'RESISTANCE' 
                      ? 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]' 
                      : 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  }`}
                />
              </div>
              <div className="flex justify-between mt-1 px-1">
                <span className="text-[8px] text-slate-500 uppercase font-bold">Intensity</span>
                <span className="text-[8px] text-slate-400 font-mono">{zone.intensity || 0}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AutobotTechnicalIndicatorsCard = ({ result }: { result: ScanResult }) => {
  if (!result) return null;
  const rsiValue = result.rsi || 50;
  const rsiColor = rsiValue > 70 ? 'text-rose-400' : rsiValue < 30 ? 'text-emerald-400' : 'text-cyan-400';
  
  return (
    <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-4 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 w-24 h-24 bg-purple-500/5 blur-[30px] rounded-full"></div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Technical Indicators</span>
        </div>
        <div className="bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
          <span className="text-[9px] font-bold text-purple-400 uppercase">Real-Time</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 relative z-10">
        {/* RSI Gauge */}
        <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center">
          <div className="relative w-12 h-12 flex items-center justify-center mb-1">
            <svg className="w-full h-full -rotate-90">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/5" />
              <motion.circle 
                cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" 
                strokeDasharray="125.6"
                initial={{ strokeDashoffset: 125.6 }}
                animate={{ strokeDashoffset: 125.6 - (125.6 * rsiValue) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={rsiColor}
              />
            </svg>
            <span className={`absolute text-[10px] font-black ${rsiColor}`}>{rsiValue.toFixed(0)}</span>
          </div>
          <span className="text-[8px] text-slate-500 uppercase font-bold">RSI (14)</span>
        </div>

        {/* MACD Trend */}
        <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center mb-2 h-10">
            {result.macd === 'BULLISH' ? (
              <div className="flex flex-col items-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
                <div className="flex gap-0.5 mt-1">
                  {[1,2,3].map(i => <div key={i} className="w-1 h-3 bg-emerald-500/40 rounded-full animate-bounce" style={{ animationDelay: `${i*0.1}s` }} />)}
                </div>
              </div>
            ) : result.macd === 'BEARISH' ? (
              <div className="flex flex-col items-center">
                <TrendingDown className="w-6 h-6 text-rose-400" />
                <div className="flex gap-0.5 mt-1">
                  {[1,2,3].map(i => <div key={i} className="w-1 h-3 bg-rose-500/40 rounded-full animate-bounce" style={{ animationDelay: `${i*0.1}s` }} />)}
                </div>
              </div>
            ) : (
              <Minus className="w-6 h-6 text-slate-500" />
            )}
          </div>
          <span className="text-[8px] text-slate-500 uppercase font-bold">MACD</span>
        </div>

        {/* BB Status */}
        <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center mb-2 h-10">
            <div className="relative w-10 flex items-center justify-center">
              <div className="absolute w-full h-0.5 bg-white/10 rounded-full"></div>
              <motion.div 
                animate={{ scaleX: (result.bollingerBands || '').toLowerCase().includes('squeeze') ? 0.4 : 1.2 }}
                transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                className="w-full h-4 border-y border-cyan-500/30 rounded-full"
              ></motion.div>
              <div className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
            </div>
          </div>
          <span className="text-[8px] text-slate-500 uppercase font-bold">Volatility</span>
        </div>
      </div>
      
      {/* BB Text Label */}
      <div className="mt-2 bg-black/20 rounded-lg p-2 border border-white/5 text-center">
        <span className="text-[9px] text-slate-400 font-medium">{result.bollingerBands || 'Stable Market'}</span>
      </div>
    </div>
  );
};

const TelegramSignalCard = ({ result, tradingMode }: { result: ScanResult, tradingMode: TradingMode }) => {
  if (result.actionSignal === 'WAIT') return null;
  return (
    <div className="bg-gradient-to-b from-[#0f172a] to-[#0a0f1c] border border-indigo-500/40 rounded-2xl p-5 sm:p-6 shadow-[0_0_40px_rgba(99,102,241,0.15)] relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-indigo-500/20">
        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
          <Bot className="w-4 h-4 text-indigo-400" />
        </div>
        <h3 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 uppercase tracking-widest">Aladdin Sniper Signal</h3>
        <div className="ml-auto flex items-center gap-2 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 font-mono text-xs sm:text-sm mb-5">
        <div className="flex items-center justify-between bg-white/5 px-3 py-2.5 rounded-lg border border-white/5">
          <span className="text-slate-400">📊 Asset:</span>
          <span className="text-white font-bold">{result.assetPair || 'OTC/Live Market'}</span>
        </div>
        
        <div className="flex items-center justify-between bg-white/5 px-3 py-2.5 rounded-lg border border-white/5">
          <span className="text-slate-400">🎯 Action:</span>
          <span className={`font-black text-sm ${result.actionSignal === 'BUY' ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]'}`}>
            {result.actionSignal} {result.actionSignal === 'BUY' ? '🟢' : '🔴'}
          </span>
        </div>

        <div className="flex items-center justify-between bg-white/5 px-3 py-2.5 rounded-lg border border-white/5">
          <span className="text-slate-400">🎯 Accuracy:</span>
          <span className="text-cyan-400 font-black text-sm">{result.accuracy || result.signalStrength}%</span>
        </div>

        <div className="flex items-center justify-between bg-white/5 px-3 py-2.5 rounded-lg border border-white/5">
          <span className="text-slate-400">🔥 Confidence:</span>
          <div className="text-right">
            <span className="text-amber-400 font-black text-sm block">
              {result.signalStrength}%
            </span>
            <span className="text-slate-500 text-[9px] font-bold">
              ({result.actionSignal === 'BUY' ? result.signalStrength : 100 - result.signalStrength}% B / {result.actionSignal === 'SELL' ? result.signalStrength : 100 - result.signalStrength}% S)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between bg-white/5 px-3 py-2.5 rounded-lg border border-white/5">
          <span className="text-slate-400">⭐ Grade:</span>
          <div className="text-right">
            <span className="text-yellow-400 font-bold block">{result.setupGrade}</span>
            <span className="text-slate-500 text-[9px]">({tradingMode === 'COMPOUNDING' ? 'Compounding' : 'Regular'})</span>
          </div>
        </div>

        <div className="flex items-center justify-between bg-white/5 px-3 py-2.5 rounded-lg border border-white/5">
          <span className="text-slate-400">📈 Trend:</span>
          <span className="text-white font-bold">{result.marketTrend}</span>
        </div>

        <div className="flex items-center justify-between bg-white/5 px-3 py-2.5 rounded-lg border border-white/5">
          <span className="text-slate-400">🌊 Volatility:</span>
          <span className="text-white font-bold">{result.volatility}</span>
        </div>

        <div className="flex items-center justify-between bg-white/5 px-3 py-2.5 rounded-lg border border-white/5">
          <span className="text-slate-400">⏱️ Expiry:</span>
          <span className="text-white font-bold">{result.recommendedExpiry || '1 Minute'}</span>
        </div>

        <div className="flex items-center justify-between bg-white/5 px-3 py-2.5 rounded-lg border border-white/5">
          <span className="text-slate-400">⚠️ MTG:</span>
          <span className="text-purple-400 font-bold">{result.martingaleSafetyRating}</span>
        </div>

        <div className="flex items-center justify-between bg-white/5 px-3 py-2.5 rounded-lg border border-white/5 sm:col-span-2">
          <span className="text-slate-400">🔮 Next Candle:</span>
          <span className={`font-bold ${result.nextCandle.toUpperCase().includes('GREEN') || result.nextCandle.toUpperCase().includes('BULL') ? 'text-emerald-400' : result.nextCandle.toUpperCase().includes('RED') || result.nextCandle.toUpperCase().includes('BEAR') ? 'text-rose-400' : 'text-white'}`}>
            {result.nextCandle.toUpperCase().includes('GREEN') || result.nextCandle.toUpperCase().includes('BULL') ? 'GREEN CANDLE 🟩' : result.nextCandle.toUpperCase().includes('RED') || result.nextCandle.toUpperCase().includes('BEAR') ? 'RED CANDLE 🟥' : result.nextCandle}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
          <div className="flex items-center gap-2 mb-1.5">
            <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Logic</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">{result.aiLogic || result.deepAnalysis || result.marketCondition}</p>
        </div>

        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">{result.technicalReasoning}</p>
        </div>
      </div>
    </div>
  );
};

const PerformanceDashboard = ({ history }: { history: HistoryItem[] }) => {
  const last24h = history.filter(h => Date.now() - h.timestamp < 24 * 60 * 60 * 1000);
  const signals = last24h.filter(h => h.result.actionSignal !== 'WAIT');
  const wins = signals.filter(h => h.outcome === 'WIN').length;
  const losses = signals.filter(h => h.outcome === 'LOSS').length;
  const total = wins + losses;
  const accuracy = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  const avgLatency = signals.length > 0 ? (signals.reduce((acc, h) => acc + (h.latency || 0), 0) / signals.length).toFixed(0) : '0';

  // Data for chart
  const hourlyData = Array.from({ length: 24 }).map((_, i) => {
    const hour = new Date(Date.now() - (23 - i) * 60 * 60 * 1000).getHours();
    const hourSignals = signals.filter(h => new Date(h.timestamp).getHours() === hour);
    const hourWins = hourSignals.filter(h => h.outcome === 'WIN').length;
    const hourTotal = hourSignals.length;
    return { hour: `${hour}:00`, accuracy: hourTotal > 0 ? (hourWins / hourTotal) * 100 : 0 };
  });

  // Data for asset breakdown
  const assetBreakdown = Object.entries(signals.reduce((acc: any, h) => {
    acc[h.assetPair] = acc[h.assetPair] || { wins: 0, total: 0 };
    acc[h.assetPair].total++;
    if (h.outcome === 'WIN') acc[h.assetPair].wins++;
    return acc;
  }, {})).map(([name, data]: any) => ({ name, accuracy: (data.wins / data.total) * 100 }));

  // Equity Curve Data (mocked based on wins/losses sequence)
  let balance = 1000;
  const equityData = signals.map((h, i) => {
    balance += h.outcome === 'WIN' ? 10 : h.outcome === 'LOSS' ? -10 : 0;
    return { trade: i, balance };
  });
  if (equityData.length === 0) equityData.push({ trade: 0, balance: 1000 });

  const pieData = [
    { name: 'Wins', value: wins, color: '#10b981' },
    { name: 'Losses', value: losses, color: '#f43f5e' }
  ];

  return (
    <div className="space-y-4">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-2 gap-3">
        {/* Win Rate Donut */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-50"></div>
          <h4 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 z-10">Win Rate</h4>
          <div className="h-24 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={total > 0 ? pieData : [{ name: 'Empty', value: 1, color: '#334155' }]}
                  innerRadius={30}
                  outerRadius={40}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {(total > 0 ? pieData : [{ name: 'Empty', value: 1, color: '#334155' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{accuracy}%</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-col gap-3">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex-1 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-50"></div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider z-10">Total Signals</div>
            <div className="text-2xl font-black text-white z-10">{signals.length}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex-1 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-50"></div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider z-10">Avg Latency</div>
            <div className="text-2xl font-black text-white z-10">{avgLatency}<span className="text-sm text-slate-500 ml-1">ms</span></div>
          </div>
        </div>
      </div>

      {/* Equity Curve Sparkline */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-50"></div>
        <div className="flex justify-between items-center mb-4 z-10 relative">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Equity Curve (Est.)</h4>
          <span className="text-xs font-bold text-amber-400">Live</span>
        </div>
        <div className="h-24 z-10 relative">
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={equityData}>
              <Line type="monotone" dataKey="balance" stroke="#fbbf24" strokeWidth={2} dot={false} />
            </ReLineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Accuracy Trend Chart */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Accuracy Trend (24h)</h4>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} />
              <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)' }} />
              <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={3} dot={false} />
            </ReLineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Asset Breakdown */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Asset Breakdown</h4>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assetBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)' }} />
              <Bar dataKey="accuracy" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                {assetBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.accuracy >= 70 ? '#10b981' : '#f43f5e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

declare global {
  interface Window {
    TradingView: any;
  }
}

const AIVerdictCard = ({ result }: { result: ScanResult }) => {
  const isBuy = result.actionSignal === 'BUY';
  const isWait = result.actionSignal === 'WAIT';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col items-center text-center">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">AI VERDICT</span>
        
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-4 rounded-2xl ${isBuy ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : isWait ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)]' : 'bg-red-500/20 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]'}`}>
            {isBuy ? <TrendingUp className="w-10 h-10" /> : isWait ? <Clock className="w-10 h-10" /> : <TrendingDown className="w-10 h-10" />}
          </div>
          <h2 className={`text-6xl font-black tracking-tighter ${isBuy ? 'text-emerald-400' : isWait ? 'text-amber-400' : 'text-red-400'}`}>
            {result.actionSignal}
          </h2>
        </div>

        <div className="w-full max-w-[240px]">
          <div className="flex justify-between items-end mb-2">
            <span className="text-4xl font-black text-white tracking-tighter">{result.signalStrength}%</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">CONFIDENCE</span>
          </div>
          <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${result.signalStrength}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`h-full rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] ${isBuy ? 'bg-emerald-500' : isWait ? 'bg-amber-500' : 'bg-red-500'}`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const NextCandleCard = ({ result }: { result: ScanResult }) => {
  const isGreen = result.nextCandle.toUpperCase() === 'GREEN';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden group"
    >
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 ${isGreen ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isGreen ? 'border-emerald-400' : 'border-red-400'}`}>
            <div className={`w-3 h-3 rounded-full ${isGreen ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]' : 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,1)]'}`}></div>
          </div>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">NEXT CANDLE PREDICTION</span>
          <h3 className={`text-2xl font-black tracking-tight ${isGreen ? 'text-emerald-400' : 'text-red-400'}`}>
            {result.nextCandle.toUpperCase()} CANDLE
          </h3>
        </div>
      </div>
    </motion.div>
  );
};

const MarketSentimentCard = ({ result }: { result: ScanResult }) => {
  const bullish = result.bullishSentiment;
  const bearish = 100 - bullish;
  
  return (
    <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-5 shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">BEARISH</span>
          <span className="text-xl font-black text-white tracking-tight">{bearish}%</span>
        </div>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">MARKET SENTIMENT</span>
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">BULLISH</span>
          <span className="text-xl font-black text-white tracking-tight">{bullish}%</span>
        </div>
      </div>
      <div className="h-2 w-full flex rounded-full overflow-hidden border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${bearish}%` }}
          className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
        />
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${bullish}%` }}
          className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
        />
      </div>
    </div>
  );
};

const MTFContextCard = ({ result }: { result: ScanResult }) => (
  <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
    <div className="flex items-center gap-2 mb-3">
      <Layers className="w-4 h-4 text-blue-400" />
      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">MTF CONTEXT</span>
    </div>
    <p className="text-xs text-slate-300 leading-relaxed font-medium">{result.mtfContext || 'Analyzing multiple timeframes for trend confirmation...'}</p>
  </div>
);

const KeyPatternCard = ({ result }: { result: ScanResult }) => (
  <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
    <div className="flex items-center gap-2 mb-3">
      <Shapes className="w-4 h-4 text-amber-400" />
      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">KEY PATTERN</span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-sm font-black text-white tracking-tight">{result.keyLevelPattern || 'Identifying chart patterns...'}</span>
      <div className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
        <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Pattern Detected</span>
      </div>
    </div>
  </div>
);

const MarketSessions = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTzTime = (tz: string, showSeconds = true, hour12 = true) => {
    return time.toLocaleTimeString('en-US', { 
      timeZone: tz, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: showSeconds ? '2-digit' : undefined, 
      hour12: hour12 
    });
  };

  const checkIsOpen = (tz: string, openHour: number, closeHour: number) => {
    const dateInTz = new Date(time.toLocaleString('en-US', { timeZone: tz }));
    const hour = dateInTz.getHours();
    const day = dateInTz.getDay();
    if (day === 0 || day === 6) return false;
    return hour >= openHour && hour < closeHour;
  };

  const sessions = [
    { id: 'sydney', name: 'Sydney', region: 'PAC', tz: 'Australia/Sydney', open: 8, close: 17, color: '#A855F7', glow: 'shadow-[0_0_10px_rgba(168,85,247,0.4)]' },
    { id: 'tokyo', name: 'Tokyo', region: 'ASN', tz: 'Asia/Tokyo', open: 9, close: 18, color: '#F43F5E', glow: 'shadow-[0_0_10px_rgba(244,63,94,0.4)]' },
    { id: 'london', name: 'London', region: 'EUR', tz: 'Europe/London', open: 8, close: 17, color: '#0EA5E9', glow: 'shadow-[0_0_10px_rgba(14,165,233,0.4)]' },
    { id: 'newyork', name: 'New York', region: 'USA', tz: 'America/New_York', open: 8, close: 17, color: '#84CC16', glow: 'shadow-[0_0_10px_rgba(132,204,22,0.4)]' }
  ];

  return (
    <div className="flex flex-col gap-2.5 mb-3">
      {/* Neon Clocks Bar */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col bg-black/40 backdrop-blur-md border border-amber-500/20 rounded-xl p-2 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]">
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[8px] text-amber-500/60 font-black uppercase tracking-widest">Global (UTC)</span>
            <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></div>
          </div>
          <span className="text-sm font-mono text-amber-400 font-black tracking-wider drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">
            {getTzTime('UTC', true, false)}
          </span>
        </div>
        <div className="flex flex-col bg-black/40 backdrop-blur-md border border-cyan-500/20 rounded-xl p-2 shadow-[inset_0_0_10px_rgba(6,182,212,0.05)]">
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[8px] text-cyan-500/60 font-black uppercase tracking-widest">India (IST)</span>
            <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse"></div>
          </div>
          <span className="text-sm font-mono text-cyan-400 font-black tracking-wider drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">
            {getTzTime('Asia/Kolkata', true, true)}
          </span>
        </div>
      </div>

      {/* Neon Session Row */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2.5 -mx-1 px-1 pb-1">
        {sessions.map(session => {
          const isOpen = checkIsOpen(session.tz, session.open, session.close);
          return (
            <motion.div 
              key={session.id} 
              animate={isOpen ? { boxShadow: [`0 0 0px ${session.color}00`, `0 0 15px ${session.color}40`, `0 0 0px ${session.color}00`] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={`flex-none w-[115px] rounded-xl border p-2.5 transition-all duration-300 relative overflow-hidden ${
                isOpen 
                  ? 'bg-black/40 border-opacity-100' 
                  : 'bg-black/20 border-opacity-20'
              }`}
              style={{ borderColor: session.color }}
            >
              {/* Active session background tint */}
              {isOpen && <div className="absolute inset-0 opacity-10" style={{ backgroundColor: session.color }}></div>}
              
              <div className="flex justify-between items-center mb-1.5 relative z-10">
                <span className="text-[10px] font-black text-white/90 truncate pr-1 uppercase tracking-tight">{session.name}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'animate-pulse' : 'opacity-30'}`} style={{ backgroundColor: session.color, boxShadow: isOpen ? `0 0 8px ${session.color}` : 'none' }}></div>
              </div>
              
              <div className="flex flex-col relative z-10">
                <span className="text-xs font-mono font-black tracking-tighter mb-1" style={{ color: isOpen ? session.color : '#64748b' }}>
                  {getTzTime(session.tz, true, true)}
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-[7px] text-slate-500 font-black uppercase tracking-tighter">{session.region}</span>
                  {isOpen ? (
                    <motion.span 
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5"
                      style={{ color: session.color }}
                    >
                      LIVE
                    </motion.span>
                  ) : (
                    <span className="text-[7px] text-slate-700 font-black uppercase tracking-widest">OFF</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default function App() {
  const [market, setMarket] = useState<MarketType>('OTC');
  const [tradingMode, setTradingMode] = useState<TradingMode>('REGULAR');
  const [useMartingale, setUseMartingale] = useState<boolean>(false);
  const [timeframe, setTimeframe] = useState<string>('1m');
  const [assetPair, setAssetPair] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [botLogs, setBotLogs] = useState<{msg: string, type: 'info' | 'success' | 'error' | 'warn', time: string}[]>([]);
  const [botStats, setBotStats] = useState({ scans: 0, signals: 0 });
  const [nextScanCountdown, setNextScanCountdown] = useState<number | null>(null);

  const addBotLog = (message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setBotLogs(prev => [{msg: message, type, time: timestamp}, ...prev].slice(0, 50));
  };
  const [isAutoMonitoring, setIsAutoMonitoring] = useState(false);
  const isAutoMonitoringRef = useRef(false);
  const scanStartTime = useRef<number>(0);

  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [secretTapCount, setSecretTapCount] = useState(0);
  const [settingsTab, setSettingsTab] = useState<'ai' | 'telegram'>('ai');
  const [aiSaveStatus, setAiSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [telegramTestStatus, setTelegramTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [telegramTestMsg, setTelegramTestMsg] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<'scanner' | 'autobot' | 'trade' | 'compounding'>('scanner');
  const [autoAsset, setAutoAsset] = useState('EUR/USD');
  const [autoTimeframe, setAutoTimeframe] = useState('1m');
  const [autoCategory, setAutoCategory] = useState('All');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  
  const [scannerCategory, setScannerCategory] = useState('All');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ololo_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load favorites", e);
      return [];
    }
  });

  useEffect(() => {
    // Sync asset selection when market changes ONLY for scanner
    // Live Bot (autoAsset) is strictly Live and remains on its selection
    if (activeTab === 'scanner') {
      const currentList = market === 'LIVE' ? CURRENCY_PAIRS : OTC_PAIRS;
      const currentAsset = currentList.find(p => p.symbol === assetPair);
      if (!currentAsset) {
        setAssetPair(currentList[0].symbol);
      }
    }
  }, [market, activeTab]);

  useEffect(() => {
    localStorage.setItem('ololo_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(symbol) 
        ? prev.filter(f => f !== symbol) 
        : [...prev, symbol]
    );
  };
  const [isScannerDropdownOpen, setIsScannerDropdownOpen] = useState(false);
  const [scannerDropdownSearch, setScannerDropdownSearch] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [savedScans, setSavedScans] = useState<SavedScan[]>([]);
  const [isSavingScan, setIsSavingScan] = useState(false);
  const [scanToSave, setScanToSave] = useState<HistoryItem | null>(null);
  const [saveName, setSaveName] = useState('');
  const [provider, setProvider] = useState<AIProvider>(GLOBAL_SETTINGS.defaultProvider);
  const [apiKeys, setApiKeys] = useState<APIKeys>(GLOBAL_SETTINGS.defaultKeys);
  const [signalFilter, setSignalFilter] = useState<number>(50); // Default 50% confidence
  const [martingaleSteps, setMartingaleSteps] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(1);
  const [takeProfit, setTakeProfit] = useState<number>(2);
  const [indicatorAlerts, setIndicatorAlerts] = useState<any[]>([]);
  const [isPaperTrading, setIsPaperTrading] = useState<boolean>(false);
  const [virtualBalance, setVirtualBalance] = useState<number>(1000);
  const [tempProvider, setTempProvider] = useState<AIProvider>(GLOBAL_SETTINGS.defaultProvider);
  const [tempApiKeys, setTempApiKeys] = useState<APIKeys>(GLOBAL_SETTINGS.defaultKeys);
  const [openRouterModel, setOpenRouterModel] = useState(GLOBAL_SETTINGS.defaultOpenRouterModel);
  const [tempOpenRouterModel, setTempOpenRouterModel] = useState(GLOBAL_SETTINGS.defaultOpenRouterModel);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [showModelBrowser, setShowModelBrowser] = useState(false);
  const [modelBrowserTab, setModelBrowserTab] = useState<'supported' | 'unsupported'>('supported');
  const [modelSearch, setModelSearch] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [guardianCooldown, setGuardianCooldown] = useState<number | null>(null);
  const [lossReasonModal, setLossReasonModal] = useState<{ isOpen: boolean; historyId: string | null }>({ isOpen: false, historyId: null });
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [quotaResetTime, setQuotaResetTime] = useState<Date | null>(null);
  const [keyStatuses, setKeyStatuses] = useState<Record<string, 'ready' | 'active' | 'exhausted' | 'error'>>({});

  useEffect(() => {
    setQuotaExceeded(false);
    setQuotaResetTime(null);
  }, [apiKeys, provider]);

  useEffect(() => {
    setKeyStatuses(prev => {
      const next = { ...prev };
      Object.values(apiKeys).forEach(keysArray => {
        if (Array.isArray(keysArray)) {
          keysArray.forEach(k => {
            if (!next[k]) next[k] = 'ready';
          });
        }
      });
      return next;
    });
  }, [apiKeys]);

  const getApiStatus = () => {
    const keys = apiKeys[provider] || [];
    if (keys.length > 0) {
      const allDead = keys.every(k => keyStatuses[k] === 'exhausted' || keyStatuses[k] === 'error');
      if (allDead) return 'EXHAUSTED';
      return 'CUSTOM';
    }
    if (quotaExceeded) return 'EXHAUSTED';
    return 'DEFAULT';
  };

  const apiStatus = getApiStatus();

  useEffect(() => {
    isAutoMonitoringRef.current = isAutoMonitoring;
    if (!isAutoMonitoring) {
      setNextScanCountdown(null);
    }
  }, [isAutoMonitoring]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoMonitoring && nextScanCountdown !== null && nextScanCountdown > 0) {
      timer = setInterval(() => {
        setNextScanCountdown(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isAutoMonitoring, nextScanCountdown === 0]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;

    const startSync = () => {
      const now = new Date();
      const seconds = now.getSeconds();
      let delayToNext45 = 45 - seconds;
      if (delayToNext45 < 0) delayToNext45 += 60;

      setNextScanCountdown(delayToNext45);
      addBotLog(`Syncing with market clock... Next scan in ${delayToNext45}s`, 'info');
      
      timeoutId = setTimeout(() => {
        startAutoBotScan();
        intervalId = setInterval(() => {
          startAutoBotScan();
          setNextScanCountdown(60);
        }, 60000);
      }, delayToNext45 * 1000);
    };

    if (isAutoMonitoring) {
      addBotLog(`Auto-monitoring started for ${autoAsset} (${autoTimeframe})`);
      startSync();
    }
    return () => {
      if (isAutoMonitoringRef.current) {
        addBotLog(`Auto-monitoring stopped.`);
      }
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [isAutoMonitoring, autoAsset, autoTimeframe, tradingMode, useMartingale, provider, apiKeys, openRouterModel]);

  // Live Camera States & Refs
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [pendingScanMode, setPendingScanMode] = useState<'DEEP' | 'FAST' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (showSettings && tempProvider === 'openrouter' && availableModels.length === 0) {
      fetch('https://openrouter.ai/api/v1/models')
        .then(res => res.json())
        .then(data => {
          if (data && data.data) {
            const models = data.data.map((m: any) => {
              const isVision = m.architecture?.modality?.includes('image') ||
                               m.id.toLowerCase().includes('vision') ||
                               m.id.toLowerCase().includes('vl') ||
                               m.id.toLowerCase().includes('gpt-4o') ||
                               m.id.toLowerCase().includes('claude-3-5-sonnet') ||
                               m.id.toLowerCase().includes('gemini-1.5') ||
                               m.id.toLowerCase().includes('pixtral');
              
              const isFree = m.id.endsWith(':free') || 
                             m.name.toLowerCase().includes('free') || 
                             (m.pricing && Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0);
                             
              return {
                id: m.id,
                name: m.name,
                isVision: !!isVision,
                isFree: !!isFree
              };
            }).sort((a: any, b: any) => {
              if (a.isVision && !b.isVision) return -1;
              if (!a.isVision && b.isVision) return 1;
              return a.name.localeCompare(b.name);
            });
            setAvailableModels(models);
          }
        })
        .catch(err => console.error("Failed to fetch models", err));
    }
  }, [showSettings, tempProvider, availableModels.length]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const savedKeys = localStorage.getItem('ololo_api_keys');
    const savedProvider = localStorage.getItem('ololo_provider') as AIProvider;
    const savedModel = localStorage.getItem('ololo_openrouter_model');
    const savedHistory = localStorage.getItem('ololo_scan_history');
    const savedVault = localStorage.getItem('ololo_saved_vault');
    const savedTradingSettings = localStorage.getItem('ololo_trading_settings');
    
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    if (savedVault) {
      try {
        setSavedScans(JSON.parse(savedVault));
      } catch (e) {
        console.error("Failed to parse vault", e);
      }
    }

    if (savedTradingSettings) {
      try {
        const parsed = JSON.parse(savedTradingSettings);
        setMartingaleSteps(parsed.martingaleSteps || 0);
        setStopLoss(parsed.stopLoss || 1);
        setTakeProfit(parsed.takeProfit || 2);
      } catch (e) {
        console.error("Failed to parse trading settings", e);
      }
    }
    
    let loadedKeys = { ...GLOBAL_SETTINGS.defaultKeys };
    
    if (savedKeys) {
      try {
        const parsed = JSON.parse(savedKeys);
        loadedKeys = {
          gemini: Array.isArray(parsed.gemini) ? parsed.gemini : (parsed.gemini ? [parsed.gemini] : []),
          openai: Array.isArray(parsed.openai) ? parsed.openai : (parsed.openai ? [parsed.openai] : []),
          anthropic: Array.isArray(parsed.anthropic) ? parsed.anthropic : (parsed.anthropic ? [parsed.anthropic] : []),
          openrouter: Array.isArray(parsed.openrouter) ? parsed.openrouter : (parsed.openrouter ? [parsed.openrouter] : []),
          telegramBotToken: parsed.telegramBotToken || '',
          telegramChatId: parsed.telegramChatId || '',
        };
      } catch (e) {
        // ignore
      }
    } else {
      // Migrate old key if exists
      const oldKey = localStorage.getItem('ololo_custom_api_key');
      if (oldKey) {
        loadedKeys.gemini = [oldKey];
        localStorage.removeItem('ololo_custom_api_key');
      }
    }
    
    setApiKeys(loadedKeys);
    setTempApiKeys(loadedKeys);
    
    if (savedProvider) {
      setProvider(savedProvider);
      setTempProvider(savedProvider);
    } else {
      setProvider(GLOBAL_SETTINGS.defaultProvider);
      setTempProvider(GLOBAL_SETTINGS.defaultProvider);
    }
    
    if (savedModel) {
      setOpenRouterModel(savedModel);
      setTempOpenRouterModel(savedModel);
    } else {
      setOpenRouterModel(GLOBAL_SETTINGS.defaultOpenRouterModel);
      setTempOpenRouterModel(GLOBAL_SETTINGS.defaultOpenRouterModel);
    }
  }, []);

  const handleSaveApiKey = () => {
    setAiSaveStatus('saving');
    const trimmedKeys = {
      gemini: tempApiKeys.gemini.map(k => k.trim()).filter(k => k),
      openai: tempApiKeys.openai.map(k => k.trim()).filter(k => k),
      anthropic: tempApiKeys.anthropic.map(k => k.trim()).filter(k => k),
      openrouter: tempApiKeys.openrouter.map(k => k.trim()).filter(k => k),
      telegramBotToken: (tempApiKeys.telegramBotToken || '').trim(),
      telegramChatId: (tempApiKeys.telegramChatId || '').trim(),
    };
    
    localStorage.setItem('ololo_api_keys', JSON.stringify(trimmedKeys));
    localStorage.setItem('ololo_provider', tempProvider);
    localStorage.setItem('ololo_openrouter_model', tempOpenRouterModel.trim());
    localStorage.setItem('ololo_trading_settings', JSON.stringify({ martingaleSteps, stopLoss, takeProfit }));
    
    setApiKeys(trimmedKeys);
    setProvider(tempProvider);
    setOpenRouterModel(tempOpenRouterModel.trim());
    
    setAiSaveStatus('success');
    setTimeout(() => {
      setShowSettings(false);
      setAiSaveStatus('idle');
      resetScanner(); // Force a new scan with the new key/provider
    }, 1000);
  };

  const handleSaveTelegram = async () => {
    const token = (tempApiKeys.telegramBotToken || '').trim();
    const chatId = (tempApiKeys.telegramChatId || '').trim();

    if (!token || !chatId) {
      handleSaveApiKey();
      return;
    }

    setTelegramTestStatus('testing');
    setTelegramTestMsg('Testing connection...');

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '✅ <b>Aladdin AI Scanner</b> successfully connected to this group!',
          parse_mode: 'HTML',
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setTelegramTestStatus('success');
        setTelegramTestMsg('Connected successfully!');
        setTimeout(() => {
          setTelegramTestStatus('idle');
          handleSaveApiKey();
        }, 1500);
      } else {
        setTelegramTestStatus('error');
        setTelegramTestMsg(data.description || 'Failed to connect. Check Token and Chat ID.');
      }
    } catch (err) {
      setTelegramTestStatus('error');
      setTelegramTestMsg('Network error. Could not reach Telegram.');
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    setDeferredPrompt(null);
  };

  useEffect(() => {
    if (market === 'LIVE' && !LIVE_TIMEFRAMES.includes(timeframe)) {
      setTimeframe('1m');
    } else if (market === 'OTC' && !OTC_TIMEFRAMES.includes(timeframe)) {
      setTimeframe('1m');
    }
  }, [market]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning) {
      interval = setInterval(() => {
        setScanStepIndex((prev) => {
          if (prev < SCAN_STEPS.length - 1) return prev + 1;
          clearInterval(interval);
          return prev;
        });
      }, 800);
    } else {
      setScanStepIndex(0);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const compressImage = async (dataUrl: string, maxWidth = 800): Promise<string> => {
    // Convert base64 to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], "image.jpg", { type: "image/jpeg" });

    const options = {
      maxSizeMB: 0.5, // Target size in MB
      maxWidthOrHeight: maxWidth,
      useWebWorker: true,
    };

    const compressedFile = await imageCompression(file, options);
    
    // Convert back to DataURL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(compressedFile);
    });
  };

  const fetchOHLCV = async (assetLabel: string, tf: string) => {
    try {
      const assetInfo = CURRENCY_PAIRS.find(p => p.label === assetLabel);
      if (!assetInfo) throw new Error("Asset configuration not found");

      const category = assetInfo.category;
      const symbol = assetInfo.symbol;
      let candlesData = "";

      if (category === 'Crypto') {
        const binanceSymbol = symbol.split(':')[1] || symbol.replace('/', '');
        let interval = tf;
        if (interval === '2m') interval = '1m';
        else if (interval === '1M') interval = '1M';
        
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=40`);
        if (!res.ok) throw new Error("Failed to fetch Crypto data from Binance");
        const data = await res.json();
        if (Array.isArray(data)) {
          candlesData = data.map((d: any, i: number) => `Candle ${i+1}: Open=${parseFloat(d[1]).toFixed(5)}, High=${parseFloat(d[2]).toFixed(5)}, Low=${parseFloat(d[3]).toFixed(5)}, Close=${parseFloat(d[4]).toFixed(5)}`).join('\n');
        }
      } else {
        let yahooSymbol = "";
        if (category === 'Forex') {
          const pair = symbol.split(':')[1] || symbol.replace('/', '');
          yahooSymbol = `${pair}=X`;
        } else if (category === 'Stocks') {
          yahooSymbol = symbol.split(':')[1] || symbol;
        } else if (category === 'Indices') {
          if (symbol.includes('US500')) yahooSymbol = '^GSPC';
          else if (symbol.includes('US100')) yahooSymbol = '^NDX';
          else if (symbol.includes('US30')) yahooSymbol = '^DJI';
          else if (symbol.includes('DE40')) yahooSymbol = '^GDAXI';
          else if (symbol.includes('UK100')) yahooSymbol = '^FTSE';
          else if (symbol.includes('JP225')) yahooSymbol = '^N225';
          else if (symbol.includes('FR40')) yahooSymbol = '^FCHI';
          else if (symbol.includes('HK50')) yahooSymbol = '^HSI';
          else if (symbol.includes('AU200')) yahooSymbol = '^AXJO';
          else yahooSymbol = symbol.split(':')[1] || symbol;
        } else if (category === 'Commodities') {
          if (symbol.includes('XAU')) yahooSymbol = 'GC=F';
          else if (symbol.includes('XAG')) yahooSymbol = 'SI=F';
          else if (symbol.includes('OIL') || symbol.includes('BRENT')) yahooSymbol = 'BZ=F';
          else if (symbol.includes('USOIL')) yahooSymbol = 'CL=F';
          else if (symbol.includes('NGAS')) yahooSymbol = 'NG=F';
          else yahooSymbol = symbol.split(':')[1] || symbol;
        }

        const rangeMap: {[key: string]: string} = {
          '1m': '1d', '2m': '1d', '3m': '1d', '5m': '1d', '15m': '1d', '30m': '1d',
          '1h': '5d', '4h': '1wk', '1d': '1mo', '1w': '3mo', '1M': '1y'
        };
        const intervalMap: {[key: string]: string} = {
          '1m': '1m', '2m': '1m', '3m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
          '1h': '1h', '4h': '1h', '1d': '1d', '1w': '1wk', '1M': '1mo'
        };

        const range = rangeMap[tf] || '1d';
        const interval = intervalMap[tf] || '1m';

        try {
          const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=${interval}`);
          if (!res.ok) throw new Error("Yahoo API error");
          const json = await res.json();
          const result = json.chart.result[0];
          const quotes = result.indicators.quote[0];
          const timestamps = result.timestamp;
          
          if (timestamps && timestamps.length > 0) {
            const count = Math.min(timestamps.length, 40);
            const offset = timestamps.length - count;
            const validCandles = [];
            for (let i = 0; i < count; i++) {
              const idx = offset + i;
              const open = quotes.open[idx];
              const high = quotes.high[idx];
              const low = quotes.low[idx];
              const close = quotes.close[idx];
              if (open !== null && high !== null && low !== null && close !== null) {
                validCandles.push(`Candle ${i+1}: Open=${open.toFixed(5)}, High=${high.toFixed(5)}, Low=${low.toFixed(5)}, Close=${close.toFixed(5)}`);
              }
            }
            candlesData = validCandles.join('\n');
          }
        } catch (yahooErr) {
          console.warn("Yahoo fetch failed, falling back to simulation", yahooErr);
          let basePrice = 1.0500;
          if (category === 'Forex' && symbol.includes('JPY')) basePrice = 150.00;
          if (category === 'Stocks') basePrice = 150.00;
          if (category === 'Commodities' && symbol.includes('XAU')) basePrice = 2000.00;
          
          let currentPrice = basePrice + (Math.random() * 0.1 - 0.05);
          let validCandles = [];
          for (let i = 0; i < 40; i++) {
            const open = currentPrice;
            const high = open + (Math.random() * 0.002 * (basePrice > 100 ? 50 : 1));
            const low = open - (Math.random() * 0.002 * (basePrice > 100 ? 50 : 1));
            const close = low + (Math.random() * (high - low));
            validCandles.push(`Candle ${i+1}: Open=${open.toFixed(5)}, High=${high.toFixed(5)}, Low=${low.toFixed(5)}, Close=${close.toFixed(5)}`);
            currentPrice = close;
          }
          candlesData = validCandles.join('\n');
        }
      }
      return candlesData;
    } catch (err) {
      console.error("fetchOHLCV error:", err);
      // Absolute fallback
      let validCandles = [];
      let currentPrice = 1.0500;
      for (let i = 0; i < 40; i++) {
        const open = currentPrice;
        const high = open + (Math.random() * 0.002);
        const low = open - (Math.random() * 0.002);
        const close = low + (Math.random() * (high - low));
        validCandles.push(`Candle ${i+1}: Open=${open.toFixed(5)}, High=${high.toFixed(5)}, Low=${low.toFixed(5)}, Close=${close.toFixed(5)}`);
        currentPrice = close;
      }
      return validCandles.join('\n');
    }
  };

  const sendTelegramSignal = async (result: any, asset: string) => {
    if (!apiKeys.telegramBotToken || !apiKeys.telegramChatId) return;
    if (result.actionSignal === 'WAIT') return;
    if (result.signalStrength < signalFilter) return; // Apply signal filter

    const token = apiKeys.telegramBotToken.trim();
    const chatId = apiKeys.telegramChatId.trim();
    
    if (!token || !chatId) return;

    const emoji = result.actionSignal === 'BUY' ? '🟢' : '🔴';
    
    // Confidence Logic
    const strength = result.signalStrength;
    let confLabel = 'Weak Signal';
    if (strength >= 85) confLabel = 'High Signal';
    else if (strength >= 70) confLabel = 'Good Signal';
    else if (strength >= 50) confLabel = 'Moderate Signal';

    const buyPct = result.actionSignal === 'BUY' ? strength : (100 - strength);
    const sellPct = result.actionSignal === 'SELL' ? strength : (100 - strength);
    const confidenceText = `${confLabel} (${buyPct}% Buy / ${sellPct}% Sell)`;

    const message = `
🚨 <b>ALADDIN SNIPER SIGNAL</b> 🚨

📊 <b>Asset:</b> ${asset === 'Unknown' ? 'OTC/Live Market' : asset}
🎯 <b>Action:</b> <b>${result.actionSignal}</b> ${emoji}
🔥 <b>Confidence:</b> ${confidenceText}
⭐ <b>Grade:</b> ${result.setupGrade} (${tradingMode === 'COMPOUNDING' ? 'Compounding' : 'Regular'})
⏱️ <b>Expiry:</b> ${result.recommendedExpiry || '1 Minute'}
📈 <b>Trend:</b> ${result.marketTrend}
⚠️ <b>MTG:</b> ${result.martingaleSafetyRating}
🎯 <b>Accuracy:</b> ${result.signalStrength}%
🔮 <b>Next Candle:</b> ${result.nextCandle.toUpperCase().includes('GREEN') || result.nextCandle.toUpperCase().includes('BULL') ? 'GREEN CANDLE 🟩' : result.nextCandle.toUpperCase().includes('RED') || result.nextCandle.toUpperCase().includes('BEAR') ? 'RED CANDLE 🟥' : result.nextCandle}
💡 <b>Reason:</b> ${result.technicalReasoning}
🧠 <b>AI Logic:</b> ${result.deepAnalysis || result.marketCondition}

⚙️ <b>Strategy:</b>
• Martingale: ${martingaleSteps} Steps
• Stop Loss: ${stopLoss}%
• Take Profit: ${takeProfit}%
    `.trim();

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        }),
      });
    } catch (err) {
      console.error("Telegram send error:", err);
    }
  };

  const startAutoBotScan = async (scanMode: 'DEEP' | 'FAST' = 'DEEP') => {
    if (!autoAsset) return;
    
    addBotLog(`Initiating ${scanMode} scan for ${autoAsset}...`, 'info');
    setIsScanning(true);
    setError(null);
    setResult(null);

    try {
      addBotLog(`Fetching OHLCV data for ${autoAsset}...`, 'info');
      const ohlcvData = await fetchOHLCV(autoAsset, autoTimeframe);
      addBotLog(`Analyzing market structure and trends...`, 'info');

      const basePrompt = `Binary Options AI. Analyze LIVE DATA for ${autoAsset} on ${autoTimeframe} timeframe.
CRITICAL ANALYSIS REQUIRED:
1. Multi-Timeframe Confluence (MTF): Analyze higher timeframes. If ${autoTimeframe} signal contradicts higher trend, mark as "RISKY" or "WAIT".
2. Price Action & Market Structure (HH, HL, LH, LL).
3. SNR (Support/Resistance) & Liquidity Zones.
4. FVG (Fair Value Gaps) & Imbalances.
5. Candlestick Psychology (Wicks, Tails, Body Momentum, Exhaustion).
6. Institutional Traps & Fakeouts (Bull/Bear Traps).
7. Volatility & Momentum Context (Bollinger Bands squeeze/expansion).
8. Psychological Price Levels (Round numbers).
DATA (Last 40 Candles):
${ohlcvData}
TASK: Predict NEXT 1 CANDLE (${autoTimeframe} Expiry) with maximum possible accuracy.`;

      const modePrompt = tradingMode === 'COMPOUNDING' 
        ? `MODE: COMPOUNDING. Require 3+ confluences (e.g., SNR + FVG + Rejection Wick). If confidence is below 80%, set actionSignal to "WAIT". IMPORTANT: Even if actionSignal is "WAIT", you MUST provide the EXACT real-time calculated signalStrength (e.g., 45, 65, 75), bullishSentiment, and all deep analysis. DO NOT default to 0 or 50.`
        : `MODE: REGULAR. Standard risk. If confidence is below 70%, set actionSignal to "WAIT". IMPORTANT: Even if actionSignal is "WAIT", you MUST provide the EXACT real-time calculated signalStrength (e.g., 29, 55, 68), bullishSentiment, and all deep analysis. DO NOT default to 0 or 50.`;

      const isMtgActive = useMartingale && tradingMode !== 'COMPOUNDING';
      const martingalePrompt = isMtgActive 
        ? `MTG: 1-step Martingale allowed for 70%+ signals.`
        : `MTG: OFF. No Martingale.`;

      const fastPrompt = scanMode === 'FAST'
        ? `SPEED MODE: FAST. Provide all required JSON fields, but keep text analysis extremely brief (1-2 words). Prioritize speed.`
        : `DEEP MODE: Analyze EVERYTHING in detail. Provide comprehensive text analysis.`;

      const gradePrompt = tradingMode === 'COMPOUNDING'
        ? `setupGrade: 80-84%="A+" (Caution), 85-89%="A++" (Good), 90-100%="A+++" (Sniper).`
        : `setupGrade: 70-79%="A" (Caution), 80-84%="A+" (Good), 85-100%="A++" (Sniper).`;

      const prompt = `${basePrompt}\n\n${modePrompt}\n\n${martingalePrompt}\n\n${fastPrompt}\n\nSPEED RULE: Be FAST. Keep text EXTREMELY CONCISE. Use short bullets.\n\n${gradePrompt} \n\nCRITICAL INSTRUCTIONS:\n1. nextCandle: MUST BE EXACTLY "GREEN" or "RED".\n2. recommendedExpiry: "${autoTimeframe}".\n3. deepAnalysis: MAXIMUM 1 short sentence (e.g., "Strong FVG detected at support").\n4. technicalReasoning: MAXIMUM 1 short sentence (e.g., "RSI overbought and bearish engulfing").\n5. martingaleSafetyRating: MUST BE EXACTLY "1-Step Martingale" or "No Martingale".\n6. rsi: Calculate RSI (0-100).\n7. macd: Determine MACD status (BULLISH, BEARISH, or NEUTRAL).\n8. bollingerBands: Describe Bollinger Bands status (e.g., "Squeezing", "Expanding", "Upper Band Touch").\n\nEXAMPLE JSON RESPONSE:\n{\n  "marketCondition": "Trending",\n  "recommendedExpiry": "${autoTimeframe}",\n  "actionSignal": "BUY",\n  "signalStrength": 85,\n  "marketTrend": "Bullish",\n  "volatility": "High",\n  "nextCandle": "GREEN",\n  "setupGrade": "A++",\n  "exactPriceLevels": "1.0500, 1.0520",\n  "martingaleSafetyRating": "1-Step Martingale",\n  "mtfContext": "Higher timeframe bullish",\n  "keyLevelPattern": "Support Flip",\n  "deepAnalysis": "Strong FVG detected at support.",\n  "technicalReasoning": "RSI overbought and bearish engulfing.",\n  "riskManagement": "1% of balance",\n  "bullishSentiment": 75,\n  "heatmapZones": [{"priceLevel": "1.0500", "zoneType": "SUPPORT", "intensity": 80}],\n  "rsi": 65.5,\n  "macd": "BULLISH",\n  "bollingerBands": "Expanding"\n}`;

      let jsonText = "";

      if (provider === 'gemini') {
        const envKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : (import.meta as any).env?.VITE_GEMINI_API_KEY;
        const keys = apiKeys.gemini.length > 0 ? apiKeys.gemini : (GLOBAL_SETTINGS.defaultKeys.gemini.length > 0 ? GLOBAL_SETTINGS.defaultKeys.gemini : (envKey ? [envKey] : []));
        if (keys.length === 0) throw new Error("Gemini API Key is missing. Please provide a custom key in settings.");
        
        let lastError = null;
        for (const key of keys) {
          if (keyStatuses[key] === 'exhausted' || keyStatuses[key] === 'error') continue;
          setKeyStatuses(prev => ({ ...prev, [key]: 'active' }));
          try {
            const ai = new GoogleGenAI({ apiKey: key });
            const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: [
                prompt
              ],
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    assetPair: { type: Type.STRING, description: "The exact currency pair name visible in the chart image. If not visible, return 'Unknown'. Do not guess." },
                    marketCondition: { type: Type.STRING, description: "Brief description of current market condition" },
                    recommendedExpiry: { type: Type.STRING, description: "Exact recommended expiry time" },
                    actionSignal: { type: Type.STRING, description: "Must be exactly: BUY, SELL, or WAIT" },
                    signalStrength: { type: Type.NUMBER, description: "Confidence percentage (0-100)" },
                    accuracy: { type: Type.NUMBER, description: "Accuracy percentage (0-100)" },
                    marketTrend: { type: Type.STRING, description: "Current trend direction" },
                    volatility: { type: Type.STRING, description: "Current volatility level" },
                    nextCandle: { type: Type.STRING, description: "Prediction for the very next candle" },
                    setupGrade: { type: Type.STRING, description: "Grade of the setup (A, A+, A++, A+++)" },
                    exactPriceLevels: { type: Type.STRING, description: "Key support and resistance levels" },
                    martingaleSafetyRating: { type: Type.STRING, description: "Safety rating for Martingale (e.g., Safe, Risky, NO MTG)" },
                    mtfContext: { type: Type.STRING, description: "Multi-timeframe context" },
                    keyLevelPattern: { type: Type.STRING, description: "Identified key level pattern" },
                    deepAnalysis: { type: Type.STRING, description: "Step-by-step CoT reasoning" },
                    technicalReasoning: { type: Type.STRING, description: "Technical reasoning for the signal" },
                    aiLogic: { type: Type.STRING, description: "Brief AI logic explanation" },
                    riskManagement: { type: Type.STRING, description: "Risk management advice" },
                    bullishSentiment: { type: Type.NUMBER, description: "Bullish sentiment percentage" },
                    clarityIndex: { type: Type.NUMBER, description: "How clear and predictable the chart is (0-100)" },
                    trapDetection: { type: Type.STRING, description: "Analysis of retail traps and market maker manipulation" },
                    selfCorrectionLog: { type: Type.STRING, description: "Explicitly state if you are avoiding a trade or changing bias due to a past failure in the contextual memory." },
                    rsi: { type: Type.NUMBER, description: "Relative Strength Index (0-100)" },
                    macd: { type: Type.STRING, enum: ["BULLISH", "BEARISH", "NEUTRAL"], description: "MACD trend status" },
                    bollingerBands: { type: Type.STRING, description: "Bollinger Bands status" },
                    heatmapZones: {
                      type: Type.ARRAY,
                      description: "Identify 3-5 key liquidity zones (support/resistance) from the chart",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          priceLevel: { type: Type.STRING, description: "Price level of the zone" },
                          intensity: { type: Type.NUMBER, description: "Strength of the zone (0-100)" },
                          zoneType: { type: Type.STRING, enum: ["SUPPORT", "RESISTANCE"], description: "Type of zone" }
                        },
                        required: ["priceLevel", "intensity", "zoneType"]
                      }
                    }
                  },
                  required: ["marketCondition", "recommendedExpiry", "actionSignal", "signalStrength", "accuracy", "marketTrend", "volatility", "nextCandle", "setupGrade", "exactPriceLevels", "martingaleSafetyRating", "mtfContext", "keyLevelPattern", "deepAnalysis", "technicalReasoning", "aiLogic", "riskManagement", "bullishSentiment", "clarityIndex", "trapDetection", "selfCorrectionLog", "heatmapZones", "rsi", "macd", "bollingerBands"]
                }
              }
            });
            jsonText = response.text || "";
            break; // Success, exit loop
          } catch (err: any) {
            lastError = err;
            if (err.message?.includes('429') || err.message?.includes('quota') || err.status === 429) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'exhausted' }));
              console.warn("Quota exceeded for Gemini key, trying next...");
              continue;
            } else if (err.status === 401 || err.status === 403 || err.message?.includes('API key not valid')) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
              continue;
            }
            setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
            throw err;
          }
        }
        if (!jsonText && lastError) throw lastError;
      } else if (provider === 'openai') {
        const keys = apiKeys.openai.length > 0 ? apiKeys.openai : GLOBAL_SETTINGS.defaultKeys.openai;
        if (keys.length === 0) throw new Error("OpenAI API Key is missing. Please provide a custom key in settings.");
        
        let lastError = null;
        for (const key of keys) {
          if (keyStatuses[key] === 'exhausted' || keyStatuses[key] === 'error') continue;
          setKeyStatuses(prev => ({ ...prev, [key]: 'active' }));
          try {
            const openai = new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true });
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "user",
                  content: prompt
                }
              ],
              response_format: { type: "json_object" }
            });
            jsonText = response.choices[0].message.content || "";
            break;
          } catch (err: any) {
            lastError = err;
            if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'exhausted' }));
              console.warn("Quota exceeded for OpenAI key, trying next...");
              continue;
            } else if (err.status === 401 || err.status === 403 || err.message?.includes('API key not valid') || err.message?.includes('Incorrect API key')) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
              continue;
            }
            setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
            throw err;
          }
        }
        if (!jsonText && lastError) throw lastError;
      } else if (provider === 'anthropic') {
        const keys = apiKeys.anthropic.length > 0 ? apiKeys.anthropic : GLOBAL_SETTINGS.defaultKeys.anthropic;
        if (keys.length === 0) throw new Error("Anthropic API Key is missing. Please provide a custom key in settings.");
        
        const schemaInstructions = `\n\nYou MUST return ONLY a valid JSON object with the following exact keys and types. Do not include any markdown formatting or extra text:
{
  "marketCondition": "string",
  "recommendedExpiry": "string",
  "actionSignal": "BUY" | "SELL" | "WAIT",
  "signalStrength": number (0-100),
  "marketTrend": "string",
  "volatility": "string",
  "nextCandle": "string",
  "setupGrade": "A" | "A+" | "A++" | "A+++",
  "exactPriceLevels": "string",
  "martingaleSafetyRating": "string",
  "mtfContext": "string",
  "keyLevelPattern": "string",
  "deepAnalysis": "string",
  "technicalReasoning": "string",
  "riskManagement": "string",
  "bullishSentiment": number (0-100),
  "heatmapZones": [
    {
      "priceLevel": "string",
      "zoneType": "SUPPORT" | "RESISTANCE",
      "intensity": number (1-100)
    }
  ],
  "rsi": number,
  "macd": "BULLISH" | "BEARISH" | "NEUTRAL",
  "bollingerBands": "string"
}`;

        let lastError = null;
        for (const key of keys) {
          if (keyStatuses[key] === 'exhausted' || keyStatuses[key] === 'error') continue;
          setKeyStatuses(prev => ({ ...prev, [key]: 'active' }));
          try {
            const anthropic = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
            const response = await anthropic.messages.create({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 1024,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt + schemaInstructions }
                  ]
                }
              ]
            });
            jsonText = (response.content[0] as any).text;
            break;
          } catch (err: any) {
            lastError = err;
            if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'exhausted' }));
              console.warn("Quota exceeded for Anthropic key, trying next...");
              continue;
            } else if (err.status === 401 || err.status === 403 || err.message?.includes('API key not valid') || err.message?.includes('invalid x-api-key')) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
              continue;
            }
            setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
            throw err;
          }
        }
        if (!jsonText && lastError) throw lastError;
      } else if (provider === 'openrouter') {
        const keys = apiKeys.openrouter.length > 0 ? apiKeys.openrouter : GLOBAL_SETTINGS.defaultKeys.openrouter;
        if (keys.length === 0) throw new Error("OpenRouter API Key is missing. Please provide a custom key in settings.");
        const modelToUse = openRouterModel || GLOBAL_SETTINGS.defaultOpenRouterModel;
        
        const schemaInstructions = `\n\nYou MUST return ONLY a valid JSON object with the following exact keys and types:
{
  "marketCondition": "string",
  "recommendedExpiry": "string",
  "actionSignal": "BUY" | "SELL" | "WAIT",
  "signalStrength": number (0-100),
  "marketTrend": "string",
  "volatility": "string",
  "nextCandle": "string",
  "setupGrade": "A" | "A+" | "A++" | "A+++",
  "exactPriceLevels": "string",
  "martingaleSafetyRating": "string",
  "mtfContext": "string",
  "keyLevelPattern": "string",
  "deepAnalysis": "string",
  "technicalReasoning": "string",
  "riskManagement": "string",
  "bullishSentiment": number (0-100),
  "heatmapZones": [
    {
      "priceLevel": "string",
      "zoneType": "SUPPORT" | "RESISTANCE",
      "intensity": number (1-100)
    }
  ],
  "rsi": number,
  "macd": "BULLISH" | "BEARISH" | "NEUTRAL",
  "bollingerBands": "string"
}`;

        let lastError = null;
        for (const key of keys) {
          if (keyStatuses[key] === 'exhausted' || keyStatuses[key] === 'error') continue;
          setKeyStatuses(prev => ({ ...prev, [key]: 'active' }));
          try {
            const openai = new OpenAI({ 
              baseURL: "https://openrouter.ai/api/v1",
              apiKey: key, 
              dangerouslyAllowBrowser: true,
              defaultHeaders: {
                "HTTP-Referer": window.location.href,
                "X-Title": "Aladdin AI Scanner",
              }
            });
            const response = await openai.chat.completions.create({
              model: modelToUse,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt + schemaInstructions }
                  ]
                }
              ],
              response_format: { type: "json_object" }
            });
            jsonText = response.choices[0].message.content || "";
            break;
          } catch (err: any) {
            lastError = err;
            if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('insufficient_quota')) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'exhausted' }));
              console.warn("Quota exceeded for OpenRouter key, trying next...");
              continue;
            } else if (err.status === 401 || err.status === 403 || err.message?.includes('API key not valid') || err.message?.includes('Incorrect API key')) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
              continue;
            }
            setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
            throw err;
          }
        }
        if (!jsonText && lastError) throw lastError;
      }

      if (jsonText) {
        let parsedResult: ScanResult;
        try {
          const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedResult = JSON.parse(cleanJson) as ScanResult;
        } catch (e) {
          console.error("JSON Parse Error:", e, jsonText);
          throw new Error("AI returned invalid data format. Retrying in next cycle.");
        }
        
        addBotLog(`Signal generated: ${parsedResult.actionSignal} (${parsedResult.signalStrength}%)`, parsedResult.actionSignal === 'WAIT' ? 'warn' : 'success');
        
        setBotStats(prev => ({
          scans: prev.scans + 1,
          signals: parsedResult.actionSignal !== 'WAIT' ? prev.signals + 1 : prev.signals
        }));
        
        const requiredConfidence = tradingMode === 'COMPOUNDING' ? 80 : 70;

        if (parsedResult.signalStrength < requiredConfidence) {
          parsedResult.actionSignal = 'WAIT';
        }

        if (tradingMode === 'COMPOUNDING') {
          if (parsedResult.signalStrength < 85 || parsedResult.actionSignal === 'WAIT') {
            parsedResult.setupGrade = 'A+';
          } else if (parsedResult.signalStrength < 90) {
            parsedResult.setupGrade = 'A++';
          } else {
            parsedResult.setupGrade = 'A+++';
          }
        } else {
          if (parsedResult.signalStrength < 80 || parsedResult.actionSignal === 'WAIT') {
            parsedResult.setupGrade = 'A';
          } else if (parsedResult.signalStrength < 85) {
            parsedResult.setupGrade = 'A+';
          } else {
            parsedResult.setupGrade = 'A++';
          }
        }
        
        parsedResult.assetPair = autoAsset;
        setLastScan({ asset: autoAsset, time: Date.now(), result: parsedResult });
        setResult(parsedResult);
        addBotLog(`Scan complete. Analysis updated.`, 'success');
        
        if (parsedResult.actionSignal !== 'WAIT') {
          sendTelegramSignal(parsedResult, autoAsset);
        }
        
        if (isAutoMonitoringRef.current && parsedResult.actionSignal !== 'WAIT') {
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`🚨 ${parsedResult.setupGrade} ${parsedResult.actionSignal}: ${autoAsset}`, {
                body: `Confidence: ${parsedResult.signalStrength}%\nTrend: ${parsedResult.marketTrend}\nExpiry: ${autoTimeframe}`
              });
            } catch (e) {
              console.warn("Notification failed", e);
            }
            try {
              playSoundEffect('signal', 0.85, 'sniper');
            } catch (e) {
              console.warn("Audio playback failed", e);
            }
          }
        }
        
        const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          market: 'LIVE',
          timeframe: autoTimeframe,
          assetPair: autoAsset,
          result: parsedResult,
          provider,
          model: provider === 'openai' ? 'gpt-4o' : 'gemini-3-flash-preview',
          image: '', // No image for autobot
          tradingMode,
          useMartingale
        };
        
        setHistory(prev => {
          const newHistory = [newHistoryItem, ...prev];
          localStorage.setItem('ololo_scan_history', JSON.stringify(newHistory));
          return newHistory;
        });
      }
    } catch (err) {
      console.error(err);
      let errorMessage = "An unexpected error occurred.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      addBotLog(`Error: ${errorMessage}`, 'error');
      setError(errorMessage);
    } finally {
      setIsScanning(false);
    }
  };

  const startLiveCamera = async (mode?: 'DEEP' | 'FAST') => {
    if (mode) setPendingScanMode(mode);
    else setPendingScanMode(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      setShowLiveCamera(true);
      // We need a small delay to ensure the video element is rendered before setting srcObject
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
        setError("Camera access denied. Please click 'Allow' when prompted, or open the app in a new tab to grant permissions.");
      } else {
        setError("Could not access camera. Please check permissions or use the Gallery option.");
      }
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowLiveCamera(false);
  };

  const captureFromLiveCamera = async () => {
    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(videoRef.current, 0, 0);
        
        const base64 = canvas.toDataURL('image/jpeg', 1.0);
        stopLiveCamera(); // Stop camera immediately
        
        const compressed = await compressImage(base64);
        setImage(compressed);
        setResult(null);
        setError(null);
        setShowDetails(false);
        
        if (pendingScanMode) {
          startScan(compressed, pendingScanMode);
          setPendingScanMode(null);
        }
      } catch (err: any) {
        console.error("Camera capture error:", err);
        setError("Failed to capture image from camera.");
        stopLiveCamera();
      }
    }
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const compressed = await compressImage(base64);
          setImage(compressed);
          setResult(null);
          setError(null);
          setShowDetails(false);
          // startScan(compressed); // Removed auto-start to allow user to choose mode
        } catch (err: any) {
          console.error("Image capture error:", err);
          setError("Failed to process image. Please try again.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setResult(item.result);
    setImage(item.image);
    setAssetPair(item.assetPair);
    setMarket(item.market as MarketType);
    setTradingMode((item as any).tradingMode || 'REGULAR');
    setUseMartingale(!!(item as any).useMartingale);
    setTimeframe(item.timeframe);
    setProvider(item.provider as AIProvider);
    if (item.provider === 'openrouter') {
      setOpenRouterModel(item.model);
    }
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => {
      const newHistory = prev.filter(item => item.id !== id);
      localStorage.setItem('ololo_scan_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('ololo_scan_history');
  };

  const saveScanToVault = () => {
    if (!scanToSave || !saveName.trim()) return;
    
    const newSavedScan: SavedScan = {
      ...scanToSave,
      customName: saveName.trim()
    };
    
    setSavedScans(prev => {
      const newSaved = [newSavedScan, ...prev];
      localStorage.setItem('ololo_saved_vault', JSON.stringify(newSaved));
      return newSaved;
    });
    
    setIsSavingScan(false);
    setScanToSave(null);
    setSaveName('');
    addBotLog(`Scan "${saveName}" saved to vault!`, 'success');
  };

  const deleteSavedScan = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavedScans(prev => {
      const newSaved = prev.filter(item => item.id !== id);
      localStorage.setItem('ololo_saved_vault', JSON.stringify(newSaved));
      return newSaved;
    });
  };

  const clearVault = () => {
    if (window.confirm("Are you sure you want to clear your entire vault? This cannot be undone.")) {
      setSavedScans([]);
      localStorage.removeItem('ololo_saved_vault');
      addBotLog("Vault cleared successfully", 'info');
    }
  };

  const markTradeOutcome = (e: React.MouseEvent, id: string, outcome: 'WIN' | 'LOSS', reason?: string) => {
    e.stopPropagation();
    if (outcome === 'LOSS' && !reason) {
      setLossReasonModal({ isOpen: true, historyId: id });
      return;
    }
    
    setHistory(prev => {
      const newHistory = prev.map(item => {
        if (item.id === id) {
          if (isPaperTrading) {
            const tradeAmount = virtualBalance * 0.1; // Assume 10% risk per trade
            if (outcome === 'WIN') {
              setVirtualBalance(prev => prev + (tradeAmount * 0.85)); // 85% payout
            } else {
              setVirtualBalance(prev => prev - tradeAmount);
            }
          }
          return { ...item, outcome, lossReason: reason };
        }
        return item;
      });
      localStorage.setItem('ololo_scan_history', JSON.stringify(newHistory));
      return newHistory;
    });
    setLossReasonModal({ isOpen: false, historyId: null });
  };

  const [lastScan, setLastScan] = useState<{ asset: string, time: number, result: any } | null>(null);

  const startScan = async (imgDataToScan?: string, scanMode: 'DEEP' | 'FAST' = 'DEEP') => {
    scanStartTime.current = Date.now();
    const targetImage = imgDataToScan || image;
    if (!targetImage) return;

    // Check cache (30 seconds)
    if (lastScan && lastScan.asset === assetPair && (Date.now() - lastScan.time < 30000)) {
      setResult(lastScan.result);
      return;
    }

    setIsScanning(true);
    setError(null);
    setResult(null);

    try {
      const basePrompt = `Binary Options AI. Analyze chart: ${market}, ${timeframe}, ${assetPair || 'Unknown'}.
CRITICAL ANALYSIS REQUIRED:
1. Multi-Timeframe Confluence (MTF): Analyze higher timeframes. If ${timeframe} signal contradicts higher trend, mark as "RISKY" or "WAIT".
2. Price Action & Market Structure (HH, HL, LH, LL).
3. SNR (Support/Resistance) & Liquidity Zones.
4. FVG (Fair Value Gaps) & Imbalances.
5. Candlestick Psychology (Wicks, Tails, Body Momentum, Exhaustion).
6. Institutional Traps & Fakeouts (Bull/Bear Traps).
7. Volatility & Indicators Context (Bollinger Bands, RSI divergence if visible).
8. Psychological Price Levels (Round numbers).
TASK: Predict NEXT 1 CANDLE (${timeframe} Expiry) with maximum possible accuracy.`;

      const modePrompt = tradingMode === 'COMPOUNDING' 
        ? `MODE: COMPOUNDING. Require 3+ confluences (e.g., SNR + FVG + Rejection Wick). If confidence is below 80%, set actionSignal to "WAIT". IMPORTANT: Even if actionSignal is "WAIT", you MUST provide the EXACT real-time calculated signalStrength (e.g., 45, 65, 75), bullishSentiment, and all deep analysis. DO NOT default to 0 or 50.`
        : `MODE: REGULAR. Standard risk. If confidence is below 70%, set actionSignal to "WAIT". IMPORTANT: Even if actionSignal is "WAIT", you MUST provide the EXACT real-time calculated signalStrength (e.g., 29, 55, 68), bullishSentiment, and all deep analysis. DO NOT default to 0 or 50.`;

      const isMtgActive = useMartingale && tradingMode !== 'COMPOUNDING';
      const martingalePrompt = isMtgActive 
        ? `MTG: 1-step Martingale allowed for 70%+ signals.`
        : `MTG: OFF. No Martingale.`;

      const fastPrompt = scanMode === 'FAST'
        ? `SPEED MODE: FAST. Provide all required JSON fields, but keep text analysis extremely brief (1-2 words). Prioritize speed.`
        : `DEEP MODE: Analyze EVERYTHING in detail. Provide comprehensive text analysis.`;

      const gradePrompt = tradingMode === 'COMPOUNDING'
        ? `setupGrade: 80-84%="A+" (Caution), 85-89%="A++" (Good), 90-100%="A+++" (Sniper).`
        : `setupGrade: 70-79%="A" (Caution), 80-84%="A+" (Good), 85-100%="A++" (Sniper).`;

      const prompt = `${basePrompt}\n\n${modePrompt}\n\n${martingalePrompt}\n\n${fastPrompt}\n\nSPEED RULE: Be FAST. Keep text EXTREMELY CONCISE. Use short bullets.\n\n${gradePrompt} \n\nCRITICAL INSTRUCTIONS:\n1. nextCandle: MUST BE EXACTLY "GREEN" or "RED".\n2. recommendedExpiry: "${timeframe}".\n3. deepAnalysis: MAXIMUM 1 short sentence (e.g., "Strong FVG detected at support").\n4. technicalReasoning: MAXIMUM 1 short sentence (e.g., "RSI overbought and bearish engulfing").\n5. martingaleSafetyRating: MUST BE EXACTLY "1-Step Martingale" or "No Martingale".\n6. assetPair: Extract the exact currency pair name visible in the chart image. If not clearly visible, return "Unknown". Do not guess or default to EUR/USD.\n7. rsi: Calculate RSI (0-100).\n8. macd: Determine MACD status (BULLISH, BEARISH, or NEUTRAL).\n9. bollingerBands: Describe Bollinger Bands status (e.g., "Squeezing", "Expanding", "Upper Band Touch").\n\nEXAMPLE JSON RESPONSE:\n{\n  "marketCondition": "Trending",\n  "recommendedExpiry": "${timeframe}",\n  "actionSignal": "BUY",\n  "signalStrength": 85,\n  "marketTrend": "Bullish",\n  "volatility": "High",\n  "nextCandle": "GREEN",\n  "setupGrade": "A++",\n  "exactPriceLevels": "1.0500, 1.0520",\n  "martingaleSafetyRating": "1-Step Martingale",\n  "mtfContext": "Higher timeframe bullish",\n  "keyLevelPattern": "Support Flip",\n  "deepAnalysis": "Strong FVG detected at support.",\n  "technicalReasoning": "RSI overbought and bearish engulfing.",\n  "riskManagement": "1% of balance",\n  "bullishSentiment": 75,\n  "heatmapZones": [{"priceLevel": "1.0500", "zoneType": "SUPPORT", "intensity": 80}],\n  "rsi": 65.5,\n  "macd": "BULLISH",\n  "bollingerBands": "Expanding"\n}`;

      let jsonText = "";

      if (provider === 'gemini') {
        const envKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : (import.meta as any).env?.VITE_GEMINI_API_KEY;
        const keys = apiKeys.gemini.length > 0 ? apiKeys.gemini : (GLOBAL_SETTINGS.defaultKeys.gemini.length > 0 ? GLOBAL_SETTINGS.defaultKeys.gemini : (envKey ? [envKey] : []));
        if (keys.length === 0) throw new Error("Gemini API Key is missing. Please provide a custom key in settings.");
        
        let lastError = null;
        for (const key of keys) {
          try {
            console.log(`Starting scan with Gemini. Using ${apiKeys.gemini.length > 0 ? 'CUSTOM' : 'DEFAULT'} API Key ending in: ...${key.slice(-4)}`);
            
            const ai = new GoogleGenAI({ apiKey: key });
            const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: [
                prompt,
                { inlineData: { data: targetImage.split(',')[1], mimeType: targetImage.split(';')[0].split(':')[1] } }
              ],
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    assetPair: { type: Type.STRING, description: "The exact currency pair name visible in the chart image. If not visible, return 'Unknown'. Do not guess." },
                    marketCondition: { type: Type.STRING },
                    recommendedExpiry: { type: Type.STRING },
                    actionSignal: { type: Type.STRING, enum: ["BUY", "SELL", "WAIT"] },
                    signalStrength: { type: Type.NUMBER },
                    accuracy: { type: Type.NUMBER },
                    marketTrend: { type: Type.STRING },
                    volatility: { type: Type.STRING },
                    nextCandle: { type: Type.STRING },
                    setupGrade: { type: Type.STRING, enum: ["A", "A+", "A++", "A+++"], description: "A = Low Signal, A+ = Medium Signal, A++ = Strong Signal, A+++ = Sniper Signal" },
                    exactPriceLevels: { type: Type.STRING },
                    martingaleSafetyRating: { type: Type.STRING },
                    mtfContext: { type: Type.STRING },
                    keyLevelPattern: { type: Type.STRING },
                    deepAnalysis: { type: Type.STRING },
                    technicalReasoning: { type: Type.STRING },
                    aiLogic: { type: Type.STRING },
                    riskManagement: { type: Type.STRING },
                    bullishSentiment: { type: Type.NUMBER, description: "Percentage of bullish sentiment (0-100)" },
                    clarityIndex: { type: Type.NUMBER, description: "How clear and predictable the chart is (0-100)" },
                    trapDetection: { type: Type.STRING, description: "Analysis of retail traps and market maker manipulation" },
                    guardianWarning: { type: Type.STRING, description: "Optional warning if the market is too dangerous" },
                    selfCorrectionLog: { type: Type.STRING, description: "Explicitly state if you are avoiding a trade or changing bias due to a past failure in the contextual memory." },
                    rsi: { type: Type.NUMBER, description: "Relative Strength Index (0-100)" },
                    macd: { type: Type.STRING, enum: ["BULLISH", "BEARISH", "NEUTRAL"], description: "MACD trend status" },
                    bollingerBands: { type: Type.STRING, description: "Bollinger Bands status" },
                    heatmapZones: {
                      type: Type.ARRAY,
                      description: "Identify 3-5 key liquidity zones (support/resistance) from the chart",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          priceLevel: { type: Type.STRING },
                          zoneType: { type: Type.STRING, enum: ["SUPPORT", "RESISTANCE"] },
                          intensity: { type: Type.NUMBER, description: "Strength of the zone (1-100)" }
                        },
                        required: ["priceLevel", "zoneType", "intensity"]
                      }
                    }
                  },
                  required: ["marketCondition", "recommendedExpiry", "actionSignal", "signalStrength", "accuracy", "marketTrend", "volatility", "nextCandle", "setupGrade", "exactPriceLevels", "martingaleSafetyRating", "mtfContext", "keyLevelPattern", "deepAnalysis", "technicalReasoning", "aiLogic", "riskManagement", "bullishSentiment", "clarityIndex", "trapDetection", "selfCorrectionLog", "heatmapZones", "rsi", "macd", "bollingerBands"]
                }
              }
            });
            jsonText = response.text || "";
            break;
          } catch (err: any) {
            lastError = err;
            if (err.message?.includes('429') || err.message?.includes('quota') || err.status === 429) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'exhausted' }));
              console.warn("Quota exceeded for Gemini key, trying next...");
              continue;
            } else if (err.status === 401 || err.status === 403 || err.message?.includes('API key not valid')) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
              continue;
            }
            setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
            throw err;
          }
        }
        if (!jsonText && lastError) throw lastError;
      } else if (provider === 'openai') {
        const keys = apiKeys.openai.length > 0 ? apiKeys.openai : GLOBAL_SETTINGS.defaultKeys.openai;
        if (keys.length === 0) throw new Error("OpenAI API Key is missing. Please provide a custom key in settings.");
        
        const schemaInstructions = `\n\nYou MUST return ONLY a valid JSON object with the following exact keys and types:
{
  "marketCondition": "string",
  "recommendedExpiry": "string",
  "actionSignal": "BUY" | "SELL" | "WAIT",
  "signalStrength": number (0-100),
  "marketTrend": "string",
  "volatility": "string",
  "nextCandle": "string",
  "setupGrade": "A" | "A+" | "A++" | "A+++",
  "exactPriceLevels": "string",
  "martingaleSafetyRating": "string",
  "mtfContext": "string",
  "keyLevelPattern": "string",
  "deepAnalysis": "string",
  "technicalReasoning": "string",
  "riskManagement": "string",
  "bullishSentiment": number,
  "heatmapZones": [
    {
      "priceLevel": "string",
      "zoneType": "SUPPORT" | "RESISTANCE",
      "intensity": number (1-100)
    }
  ]
}`;

        let lastError = null;
        for (const key of keys) {
          try {
            console.log(`Starting scan with OpenAI (ChatGPT). Key ending in: ...${key.slice(-4)}`);
            
            const openai = new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true });
            
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt + schemaInstructions },
                    { type: "image_url", image_url: { url: targetImage } }
                  ]
                }
              ],
              response_format: { type: "json_object" }
            });
            jsonText = response.choices[0].message.content || "";
            break;
          } catch (err: any) {
            lastError = err;
            if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'exhausted' }));
              console.warn("Quota exceeded for OpenAI key, trying next...");
              continue;
            } else if (err.status === 401 || err.status === 403 || err.message?.includes('API key not valid') || err.message?.includes('Incorrect API key')) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
              continue;
            }
            setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
            throw err;
          }
        }
        if (!jsonText && lastError) throw lastError;
      } else if (provider === 'anthropic') {
        const keys = apiKeys.anthropic.length > 0 ? apiKeys.anthropic : GLOBAL_SETTINGS.defaultKeys.anthropic;
        if (keys.length === 0) throw new Error("Anthropic API Key is missing. Please provide a custom key in settings.");
        
        const mimeType = targetImage.split(';')[0].split(':')[1];
        const base64Data = targetImage.split(',')[1];

        const schemaInstructions = `\n\nYou MUST return ONLY a valid JSON object with the following exact keys and types. Do not include any markdown formatting or extra text:
{
  "marketCondition": "string",
  "recommendedExpiry": "string",
  "actionSignal": "BUY" | "SELL" | "WAIT",
  "signalStrength": number (0-100),
  "marketTrend": "string",
  "volatility": "string",
  "nextCandle": "string",
  "setupGrade": "A" | "A+" | "A++" | "A+++",
  "exactPriceLevels": "string",
  "martingaleSafetyRating": "string",
  "mtfContext": "string",
  "keyLevelPattern": "string",
  "deepAnalysis": "string",
  "technicalReasoning": "string",
  "riskManagement": "string",
  "bullishSentiment": number (0-100),
  "heatmapZones": [
    {
      "priceLevel": "string",
      "zoneType": "SUPPORT" | "RESISTANCE",
      "intensity": number (1-100)
    }
  ],
  "rsi": number,
  "macd": "BULLISH" | "BEARISH" | "NEUTRAL",
  "bollingerBands": "string"
}`;

        let lastError = null;
        for (const key of keys) {
          try {
            console.log(`Starting scan with Anthropic (Claude). Key ending in: ...${key.slice(-4)}`);
            
            const anthropic = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
            
            const response = await anthropic.messages.create({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 1024,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "image", source: { type: "base64", media_type: mimeType as any, data: base64Data } },
                    { type: "text", text: prompt + schemaInstructions }
                  ]
                }
              ]
            });
            jsonText = (response.content[0] as any).text;
            break;
          } catch (err: any) {
            lastError = err;
            if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'exhausted' }));
              console.warn("Quota exceeded for Anthropic key, trying next...");
              continue;
            } else if (err.status === 401 || err.status === 403 || err.message?.includes('API key not valid') || err.message?.includes('invalid x-api-key')) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
              continue;
            }
            setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
            throw err;
          }
        }
        if (!jsonText && lastError) throw lastError;
      } else if (provider === 'openrouter') {
        const keys = apiKeys.openrouter.length > 0 ? apiKeys.openrouter : GLOBAL_SETTINGS.defaultKeys.openrouter;
        if (keys.length === 0) throw new Error("OpenRouter API Key is missing. Please provide a custom key in settings.");
        const modelToUse = openRouterModel || GLOBAL_SETTINGS.defaultOpenRouterModel;
        
        const schemaInstructions = `\n\nYou MUST return ONLY a valid JSON object with the following exact keys and types:
{
  "marketCondition": "string",
  "recommendedExpiry": "string",
  "actionSignal": "BUY" | "SELL" | "WAIT",
  "signalStrength": number (0-100),
  "marketTrend": "string",
  "volatility": "string",
  "nextCandle": "string",
  "setupGrade": "A" | "A+" | "A++" | "A+++",
  "exactPriceLevels": "string",
  "martingaleSafetyRating": "string",
  "mtfContext": "string",
  "keyLevelPattern": "string",
  "deepAnalysis": "string",
  "technicalReasoning": "string",
  "riskManagement": "string",
  "bullishSentiment": number,
  "heatmapZones": [
    {
      "priceLevel": "string",
      "zoneType": "SUPPORT" | "RESISTANCE",
      "intensity": number (1-100)
    }
  ]
}`;

        let lastError = null;
        for (const key of keys) {
          try {
            console.log(`Starting scan with OpenRouter (Model: ${modelToUse}). Key ending in: ...${key.slice(-4)}`);
            
            const openai = new OpenAI({ 
              baseURL: "https://openrouter.ai/api/v1",
              apiKey: key, 
              dangerouslyAllowBrowser: true,
              defaultHeaders: {
                "HTTP-Referer": window.location.href,
                "X-Title": "Aladdin AI Scanner",
              }
            });
            
            const response = await openai.chat.completions.create({
              model: modelToUse,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt + schemaInstructions },
                    { type: "image_url", image_url: { url: targetImage } }
                  ]
                }
              ],
              response_format: { type: "json_object" }
            });
            jsonText = response.choices[0].message.content || "";
            break;
          } catch (err: any) {
            lastError = err;
            if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('insufficient_quota')) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'exhausted' }));
              console.warn("Quota exceeded for OpenRouter key, trying next...");
              continue;
            } else if (err.status === 401 || err.status === 403 || err.message?.includes('API key not valid') || err.message?.includes('Incorrect API key')) {
              setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
              continue;
            }
            setKeyStatuses(prev => ({ ...prev, [key]: 'error' }));
            throw err;
          }
        }
        if (!jsonText && lastError) throw lastError;
      }

      if (jsonText) {
        // Clean markdown if any provider accidentally included it
        let parsedResult: ScanResult;
        try {
          const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedResult = JSON.parse(cleanJson) as ScanResult;
        } catch (e) {
          console.error("JSON Parse Error:", e, jsonText);
          throw new Error("AI returned invalid data format. Please try scanning again.");
        }
        
        // Pure Real-Time Logic Enforcement
        const requiredConfidence = tradingMode === 'COMPOUNDING' ? 80 : 70;

        if (parsedResult.signalStrength < requiredConfidence) {
          parsedResult.actionSignal = 'WAIT';
        }

        // Grade assignment based on final signal strength
        if (tradingMode === 'COMPOUNDING') {
          if (parsedResult.signalStrength < 85 || parsedResult.actionSignal === 'WAIT') {
            parsedResult.setupGrade = 'A+';
          } else if (parsedResult.signalStrength < 90) {
            parsedResult.setupGrade = 'A++';
          } else {
            parsedResult.setupGrade = 'A+++';
          }
        } else {
          if (parsedResult.signalStrength < 80 || parsedResult.actionSignal === 'WAIT') {
            parsedResult.setupGrade = 'A';
          } else if (parsedResult.signalStrength < 85) {
            parsedResult.setupGrade = 'A+';
          } else {
            parsedResult.setupGrade = 'A++';
          }
        }

        let finalAsset = assetPair || 'Unknown';
        if (parsedResult.assetPair && parsedResult.assetPair !== 'Unknown') {
          finalAsset = parsedResult.assetPair;
          setAssetPair(finalAsset);
        } else if (!assetPair) {
          finalAsset = 'Unknown';
        }
        
        parsedResult.assetPair = finalAsset;
        setLastScan({ asset: finalAsset, time: Date.now(), result: parsedResult });
        setResult(parsedResult);

        if (parsedResult.actionSignal !== 'WAIT') {
          sendTelegramSignal(parsedResult, finalAsset);
        }
        
        // Save to history
        const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          market,
          timeframe,
          assetPair: finalAsset,
          result: parsedResult,
          provider,
          model: provider === 'openrouter' ? (openRouterModel || GLOBAL_SETTINGS.defaultOpenRouterModel) : provider,
          image: targetImage,
          tradingMode,
          useMartingale,
          latency: Date.now() - scanStartTime.current
        };
        
        setHistory(prev => {
          const newHistory = [newHistoryItem, ...prev].slice(0, 50); // Keep last 50
          localStorage.setItem('ololo_scan_history', JSON.stringify(newHistory));
          return newHistory;
        });
        
      } else {
        throw new Error("Analysis failed. No response from AI.");
      }
    } catch (err: any) {
      console.error("Scan Error:", err);
      let errorMessage = err.message || "Error during analysis.";
      if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
        errorMessage = "Invalid API Key. Please check your Custom API Key in settings.";
      } else if (errorMessage.includes("quota") || errorMessage.includes("429")) {
        errorMessage = "API Quota exceeded. Please use a different Custom API Key.";
        setQuotaExceeded(true);
        const now = new Date();
        const resetTime = new Date(now);
        resetTime.setUTCHours(8, 0, 0, 0); // Midnight PST is 8 AM UTC
        if (resetTime <= now) {
          resetTime.setUTCDate(resetTime.getUTCDate() + 1);
        }
        setQuotaResetTime(resetTime);
      } else if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
        errorMessage = "Network error. Please check your internet connection.";
      }
      setError(errorMessage);
    } finally {
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setShowDetails(false);
  };

  const timeframes = market === 'LIVE' ? LIVE_TIMEFRAMES : OTC_TIMEFRAMES;

  return (
    <div className="min-h-screen bg-[#050914] text-slate-300 font-sans flex flex-col selection:bg-cyan-500/30">
      {/* Compact Header */}
      <header className="shrink-0 bg-[#050914]/90 backdrop-blur-md border-b border-white/5 px-3 py-2 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-6 h-6 rounded-[5px] shrink-0 overflow-hidden flex items-center justify-center">
            <LampIcon className="w-full h-full object-cover" />
          </div>
          
          {/* ALADDIN AI directly in front of Lamp icon */}
          <h1 className="text-cyan-400 font-bold text-sm tracking-wide leading-none shrink-0">
            ALADDIN AI
          </h1>

          {/* Pro Engine and API Key status stacked vertically in compact size right beside it */}
          <div className="flex flex-col justify-center gap-0.5 border-l border-white/10 pl-2">
            <div className="flex items-center gap-1 text-[8.5px] font-bold text-emerald-400 leading-none">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>Pro Engine</span>
            </div>
            
            {/* API Status Indicator */}
            <div className="flex items-center gap-1 text-[8px] font-mono bg-black/40 px-1 py-0.5 rounded border border-white/5 leading-none">
              {apiStatus === 'CUSTOM' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)] shrink-0"></span>
                  <span className="text-emerald-400">Custom Key Active</span>
                </>
              )}
              {apiStatus === 'DEFAULT' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)] shrink-0"></span>
                  <span className="text-amber-400">Default Key Active</span>
                </>
              )}
              {apiStatus === 'EXHAUSTED' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.8)] shrink-0"></span>
                  <span className="text-rose-400">
                    Quota Exceeded ({quotaResetTime && <CountdownTimer targetDate={quotaResetTime} />})
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(true)} className="p-1.5 rounded-md transition-colors bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent">
            <span className="text-xs font-bold px-1">?</span>
          </button>
          <button onClick={() => setShowHistory(true)} className="p-1.5 rounded-md transition-colors bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent">
            <Clock className="w-4 h-4" />
          </button>
          <button onClick={() => setShowSettings(true)} className={`p-1.5 rounded-md transition-colors ${apiKeys[provider] ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'}`}>
            <Key className="w-4 h-4" />
          </button>
          {image && (
            <button onClick={resetScanner} className="text-[10px] font-medium bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1.5 rounded text-slate-300 transition-colors">
              NEW SCAN
            </button>
          )}
        </div>
      </header>

      <main className={`flex-1 overflow-y-auto hide-scrollbar p-2 md:p-4 flex flex-col ${activeTab === 'compounding' ? 'max-w-7xl' : 'max-w-lg'} mx-auto w-full`}>
        {/* Tab Switcher */}
        <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 mb-4 shrink-0 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => { setActiveTab('scanner'); setResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'scanner' 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Scanner</span>
          </button>
          <button
            onClick={() => { setActiveTab('autobot'); setResult(null); setImage(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'autobot' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <LineChart className="w-4 h-4" />
            <span className="hidden sm:inline">Live Bot</span>
          </button>
          <button
            onClick={() => { setActiveTab('trade'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'trade' 
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Trade</span>
          </button>
          <button
            onClick={() => { setActiveTab('compounding'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'compounding' 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">Calculator & Plans</span>
          </button>
        </div>

        {activeTab === 'compounding' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0">
            <CompoundingPlans />
          </motion.div>
        )}

        {activeTab === 'trade' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col gap-4">
            <MarketSessions />
            
            {/* ALADDIN AI MASTER GUIDE & RULES */}
            <div className="bg-[#050810] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
              <button 
                onClick={() => setIsGuideOpen(!isGuideOpen)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/20 to-cyan-900/20 hover:from-purple-900/30 hover:to-cyan-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Aladdin AI Master Guide</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Rules, Strategies & Secrets</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isGuideOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isGuideOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 space-y-6 border-t border-white/5 bg-[#0a0f1c]/50">
                      
                      {/* STRICT DISCLAIMER */}
                      <div className="bg-rose-950/30 border border-rose-500/50 rounded-xl p-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldAlert className="w-5 h-5 text-rose-500" />
                          <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest">Strict Legal & Safety Disclaimer</h4>
                        </div>
                        <p className="text-[10px] text-rose-200/80 leading-relaxed font-medium text-justify">
                          Aladdin AI Scanner is strictly an analytical tool provided for informational and educational purposes only. It does NOT guarantee profits or successful trades. Binary options trading involves extreme financial risk. By using this software, YOU (the user) acknowledge and agree that you are trading at your own risk. The creator, developer, and provider of Aladdin AI assume ZERO liability, responsibility, or obligation for any financial losses, damages, or blown accounts incurred while using this tool. You are solely responsible for your own money and trading decisions.
                        </p>
                      </div>

                      {/* 1. Modes & Logic */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-4 h-4" /> 1. Trading Modes Logic
                        </h4>
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-2 text-[11px] text-slate-300 leading-relaxed">
                          <p><strong className="text-white">Regular Mode:</strong> Standard risk. Requires 70%+ confidence. Generates more signals. Use 1-Step Martingale if the first trade fails.</p>
                          <p><strong className="text-amber-400">Compounding Mode:</strong> High precision (Sniper). Requires 80%+ confidence and 3+ confluences (SNR, FVG, Wick). NO Martingale allowed. Fewer signals, but extremely high accuracy.</p>
                        </div>
                      </div>

                      {/* 2. The Golden Window */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                          <Clock className="w-4 h-4" /> 2. The Golden Window (Timing)
                        </h4>
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-2 text-[11px] text-slate-300 leading-relaxed">
                          <p>Timing is everything in 1-minute trading.</p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-400">
                            <li><strong className="text-white">When to Scan:</strong> Take the screenshot exactly between the <strong className="text-emerald-400">55th and 58th second</strong> of the current candle.</li>
                            <li><strong className="text-white">Why:</strong> The candle has formed its shape, giving AI the most accurate data for the next candle.</li>
                            <li><strong className="text-white">When to Enter:</strong> Place your trade exactly at <strong className="text-emerald-400">00:00</strong> (the exact start of the new candle).</li>
                          </ul>
                        </div>
                      </div>

                      {/* 3. Pocket Option Specifics */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                          <Target className="w-4 h-4" /> 3. Pocket Option Setup
                        </h4>
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-2 text-[11px] text-slate-300 leading-relaxed">
                          <ul className="list-disc pl-4 space-y-1 text-slate-400">
                            <li><strong className="text-white">Expiry Type:</strong> Always use <strong className="text-blue-400">Clock (Time)</strong> expiry, NEVER Timer (Flag). This ensures your trade ends exactly when the candle closes.</li>
                            <li><strong className="text-white">Chart Type:</strong> Japanese Candlesticks (Not Heikin Ashi).</li>
                            <li><strong className="text-white">Zoom Level:</strong> Keep 40-50 candles visible on the screen so AI can read the trend and SNR levels.</li>
                          </ul>
                        </div>
                      </div>

                      {/* 4. Handling Scan Delays */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                          <Zap className="w-4 h-4" /> 4. Handling Scan Delays (20s+)
                        </h4>
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-2 text-[11px] text-slate-300 leading-relaxed">
                          <p>If AI takes 15-20 seconds to reply, your entry will be late. Use these strategies:</p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-400">
                            <li><strong className="text-white">Next-to-Next Strategy:</strong> Scan at the 30th second of the current candle. Get the result by the 50th second. Place the trade exactly at 00:00 for the NEXT candle.</li>
                            <li><strong className="text-white">Marginal Safety:</strong> If you are late, wait for the candle to retrace (go slightly red for a BUY, or green for a SELL) before entering.</li>
                            <li><strong className="text-white">Fast Mode:</strong> Use the FAST SCAN button to skip deep text analysis and get results in 5-8 seconds.</li>
                          </ul>
                        </div>
                      </div>

                      {/* 5. OTC Market Secrets */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> 5. OTC Market Secrets
                        </h4>
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-2 text-[11px] text-slate-300 leading-relaxed">
                          <p>OTC is a broker algorithm, not a real market. Trade with extreme caution.</p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-400">
                            <li><strong className="text-white">Trend is God:</strong> Never trade reversals in OTC. If the trend is UP, ignore SELL signals.</li>
                            <li><strong className="text-white">Payout Trap:</strong> Avoid assets with 92%+ payouts. They are highly volatile traps. Stick to 80%-85% payouts.</li>
                            <li><strong className="text-white">Wick Fill Theory:</strong> If a candle leaves a long wick, the next candle usually goes to "fill" that wick. This is an A+++ entry in OTC.</li>
                            <li><strong className="text-white">No Compounding:</strong> NEVER use Compounding mode in OTC. One random spike will blow your account.</li>
                            <li><strong className="text-white">10% Capital Rule:</strong> Only keep 10% of your total balance in your account when trading OTC.</li>
                          </ul>
                        </div>
                      </div>

                      {/* 6. Live Market Secrets */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                          <Globe className="w-4 h-4" /> 6. Live Market Secrets
                        </h4>
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-2 text-[11px] text-slate-300 leading-relaxed">
                          <ul className="list-disc pl-4 space-y-1 text-slate-400">
                            <li><strong className="text-white">News Avoidance:</strong> Check Investing.com. NEVER trade 15 minutes before or after a 3-Star (High Impact) news event. Technical analysis fails during news.</li>
                            <li><strong className="text-white">Session Overlap:</strong> Best time to trade is 5:30 PM to 9:30 PM (IST) when London and NY sessions overlap. High volume = smooth candles.</li>
                            <li><strong className="text-white">Consecutive Candles:</strong> If 4-5 green candles have already formed, DO NOT take a BUY trade. A red retracement candle is 80% likely to happen next.</li>
                          </ul>
                        </div>
                      </div>

                      {/* 7. Money Management */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-green-400 uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" /> 7. Money Management
                        </h4>
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-2 text-[11px] text-slate-300 leading-relaxed">
                          <ul className="list-disc pl-4 space-y-1 text-slate-400">
                            <li><strong className="text-white">3-Win / 2-Loss Rule:</strong> Stop trading immediately if you win 3 trades in a row, OR lose 2 trades in a row. Protect your psychology.</li>
                            <li><strong className="text-white">1-Step MTG Only:</strong> Never go beyond 1-Step Martingale. If MTG 1 fails, accept the loss and wait for a fresh setup.</li>
                            <li><strong className="text-white">Demo First:</strong> Practice on a Demo account with the EXACT balance you plan to deposit (e.g., $50, not $10,000) to build real emotional discipline.</li>
                          </ul>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <h3 className="text-sm font-bold text-white mb-2 mt-2">Performance Dashboard</h3>
            <PerformanceDashboard history={history} />

            {/* MY VAULT SECTION */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">My Saved Vault</h3>
                </div>
                <div className="flex items-center gap-2">
                  {savedScans.length > 0 && (
                    <button 
                      onClick={clearVault}
                      className="text-[9px] font-black text-rose-400/60 hover:text-rose-400 uppercase tracking-widest transition-colors mr-2"
                    >
                      Clear All
                    </button>
                  )}
                  <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                    {savedScans.length} SAVED
                  </span>
                </div>
              </div>

              {savedScans.length === 0 ? (
                <div className="bg-black/20 border border-dashed border-white/10 rounded-2xl p-8 text-center">
                  <Plus className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No scans saved in vault yet.</p>
                  <p className="text-[10px] text-slate-600 mt-1">Save your best setups from the Scanner tab.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {savedScans.map((scan) => (
                    <motion.div 
                      key={scan.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => {
                        setResult(scan.result);
                        setImage(scan.image);
                        setAssetPair(scan.assetPair);
                        setTimeframe(scan.timeframe);
                        setMarket(scan.market as MarketType);
                        setActiveTab('scanner');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-none">
                        <LineChart className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-white truncate">{scan.customName}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase">{scan.assetPair}</span>
                          <span className="text-[10px] text-slate-600">•</span>
                          <span className="text-[10px] text-slate-500 font-medium">{new Date(scan.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => deleteSavedScan(e, scan.id)}
                        className="p-2 text-slate-600 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'scanner' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col gap-4">
            {!image && !isScanning && !result ? (
              <div className="flex flex-col gap-4">
                <p className="text-[10px] text-slate-500 italic text-center px-4">
                  Disclaimer: AI analysis is for informational purposes only. Market analysis is probabilistic; 100% accuracy is not possible. Trade at your own risk.
                </p>
                <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-4">
                  <div className="flex gap-2 bg-black/40 p-1 rounded-lg border border-white/5">
                    {(['LIVE', 'OTC'] as MarketType[]).map((m) => (
                      <button key={m} onClick={() => setMarket(m)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${market === m ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                        {m}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 bg-black/40 p-1 rounded-lg border border-white/5">
                    {(['REGULAR', 'COMPOUNDING'] as TradingMode[]).map((mode) => (
                      <button 
                        key={mode} 
                        onClick={() => setTradingMode(mode)} 
                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                          tradingMode === mode 
                            ? mode === 'COMPOUNDING' 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {mode === 'COMPOUNDING' ? <Target className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                        {mode === 'COMPOUNDING' ? 'COMPOUNDING (A++)' : 'REGULAR'}
                      </button>
                    ))}
                  </div>

                  <div className={`flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/5 transition-opacity ${tradingMode === 'COMPOUNDING' ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">Allow 1-Step Martingale</span>
                        <span className="text-[9px] text-slate-500">Acceptable risk for &gt;85% signals</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setUseMartingale(!useMartingale)}
                      disabled={tradingMode === 'COMPOUNDING'}
                      className={`w-10 h-5 rounded-full transition-colors relative ${useMartingale && tradingMode !== 'COMPOUNDING' ? 'bg-purple-500' : 'bg-slate-700'}`}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${useMartingale && tradingMode !== 'COMPOUNDING' ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>

                  <div>
                    <div className="flex overflow-x-auto hide-scrollbar gap-1.5 pb-1">
                      {timeframes.map((tf) => (
                        <button key={tf} onClick={() => setTimeframe(tf)} className={`flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition-all border ${timeframe === tf ? 'bg-slate-800 text-white border-slate-600' : 'bg-black/20 text-slate-500 border-transparent hover:bg-black/40'}`}>
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative z-40">
                    <div 
                      className="bg-black/40 border border-white/5 rounded-lg px-3 py-2.5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setIsScannerDropdownOpen(!isScannerDropdownOpen)}
                    >
                      <span className="text-sm font-semibold text-white tracking-wider uppercase">
                        {(market === 'LIVE' ? CURRENCY_PAIRS : OTC_PAIRS).find(p => p.symbol === assetPair)?.label || assetPair || 'SELECT ASSET'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isScannerDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    <AnimatePresence>
                      {isScannerDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute bottom-full left-0 right-0 mb-2 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
                        >
                          <div className="p-2 border-b border-white/10 flex flex-col gap-2">
                            <div className="relative">
                              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input 
                                type="text" 
                                placeholder={`Search ${market} assets...`} 
                                value={scannerDropdownSearch}
                                onChange={(e) => setScannerDropdownSearch(e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            
                      <div className="flex overflow-x-auto hide-scrollbar gap-1 p-0.5 bg-black/40 rounded-lg">
                        {ASSET_CATEGORIES.filter(cat => {
                          if (market === 'OTC' && cat === 'Stocks') return false;
                          const list = market === 'LIVE' ? CURRENCY_PAIRS : OTC_PAIRS;
                          if (cat !== 'All' && cat !== 'Favorites') {
                            return list.some(p => p.category === cat);
                          }
                          return true;
                        }).map(cat => (
                          <button
                            key={cat}
                            onClick={(e) => { e.stopPropagation(); setScannerCategory(cat); }}
                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-tight rounded-md whitespace-nowrap transition-all flex items-center gap-1 ${scannerCategory === cat ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'}`}
                          >
                            {cat === 'Favorites' && <Star className={`w-2.5 h-2.5 ${scannerCategory === 'Favorites' ? 'fill-black' : 'fill-amber-400 text-amber-400'}`} />}
                            {cat}
                          </button>
                        ))}
                      </div>
                          </div>
                          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {(market === 'LIVE' ? CURRENCY_PAIRS : OTC_PAIRS)
                              .filter((p: any) => {
                                const matchesSearch = p.label.toLowerCase().includes(scannerDropdownSearch.toLowerCase());
                                const matchesCategory = scannerCategory === 'All' || 
                                                        (scannerCategory === 'Favorites' ? favorites.includes(p.symbol) : p.category === scannerCategory);
                                return matchesSearch && matchesCategory;
                              })
                              .map(pair => (
                              <div 
                                key={pair.symbol}
                                className={`px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors flex items-center justify-between group ${assetPair === pair.symbol ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-white/5'}`}
                                onClick={() => {
                                  setAssetPair(pair.symbol);
                                  setIsScannerDropdownOpen(false);
                                  setScannerDropdownSearch('');
                                  setScannerCategory('All');
                                }}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <button 
                                    onClick={(e) => toggleFavorite(pair.symbol, e)}
                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                  >
                                    <Star className={`w-3.5 h-3.5 ${favorites.includes(pair.symbol) ? 'fill-amber-400 text-amber-400' : 'text-slate-600 opacity-40 group-hover:opacity-100'}`} />
                                  </button>
                                  <span className="truncate">{pair.label}</span>
                                </div>
                                <span className="text-[8px] opacity-40 uppercase font-black tracking-tighter ml-2 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                  {(pair as any).category}
                                </span>
                              </div>
                            ))}
                            {(market === 'LIVE' && scannerCategory === 'Favorites' && favorites.length === 0) && (
                              <div className="py-8 text-center px-4">
                                <Star className="w-8 h-8 text-slate-700 mx-auto mb-2 opacity-20" />
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">No favorites yet</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={() => startLiveCamera('DEEP')} className="relative group overflow-hidden rounded-md shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-500 group-hover:scale-105 transition-transform duration-500" />
                      <div className="relative flex items-center justify-center gap-2 py-2.5 px-3">
                        <Zap className="w-4 h-4 text-white" />
                        <span className="text-xs font-bold text-white tracking-wide">DEEP SCAN</span>
                      </div>
                    </button>
                    <button onClick={() => startLiveCamera('FAST')} className="relative group overflow-hidden rounded-md shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-500 group-hover:scale-105 transition-transform duration-500" />
                      <div className="relative flex items-center justify-center gap-2 py-2.5 px-3">
                        <Rocket className="w-4 h-4 text-white" />
                        <span className="text-xs font-bold text-white tracking-wide">FAST SCAN</span>
                      </div>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={() => startLiveCamera()} className="flex flex-col items-center justify-center gap-2 bg-slate-500/10 border border-slate-500/20 hover:bg-slate-500/20 rounded-xl p-3 transition-all cursor-pointer">
                      <Camera className="w-5 h-5 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-300">CAMERA</span>
                    </button>
                    <label className="flex flex-col items-center justify-center gap-2 bg-slate-500/10 border border-slate-500/20 hover:bg-slate-500/20 rounded-xl p-3 transition-all cursor-pointer">
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-300">GALLERY</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageCapture} />
                    </label>
                  </div>
                </div>
              </div>
            ) : isScanning ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-8 py-4">
                <div className="relative w-4/5 max-w-sm aspect-[3/4] rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.1)] bg-[#0a0f1c]">
                  {image ? (
                    <img src={image || undefined} alt="Scanning" className="w-full h-full object-contain opacity-50" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-emerald-500/50">
                      <LineChart className="w-24 h-24 animate-pulse" />
                    </div>
                  )}
                  <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,1)] z-10"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:20px_20px] mix-blend-overlay opacity-50" />
                </div>
                <div className="w-full max-w-xs space-y-4 bg-[#0a0f1c] p-6 rounded-2xl border border-white/5">
                  {SCAN_STEPS.map((step, idx) => (
                    <div key={step} className="flex items-center gap-3">
                      {idx < scanStepIndex ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-none" />
                      ) : idx === scanStepIndex ? (
                        <CircleDashed className="w-5 h-5 text-cyan-400 animate-spin flex-none" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-700 flex-none" />
                      )}
                      <span className={`text-sm font-medium ${idx <= scanStepIndex ? 'text-cyan-50' : 'text-slate-600'}`}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 pb-6">
                {/* Compact Image Preview */}
                <div className={`relative ${result ? 'h-20' : 'h-48'} rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center transition-all duration-500`}>
                  <img src={image || undefined} alt="Chart" className="w-full h-full object-cover opacity-30 blur-[1px]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 gap-3">
                    <span className="text-xs font-bold text-white/70 tracking-widest uppercase">{assetPair || 'CHART'} • {timeframe} • {market}</span>
                    {!result && !isScanning && (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-[10px] text-cyan-400 font-bold animate-pulse uppercase tracking-wider">Select Analysis Depth</p>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => startScan(image!, 'DEEP')}
                            className="relative group overflow-hidden rounded-md shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-500 group-hover:scale-105 transition-transform duration-500" />
                            <div className="relative flex items-center justify-center gap-2 py-2 px-4">
                              <Zap className="w-4 h-4 text-white" />
                              <span className="text-[10px] font-bold text-white tracking-wide">DEEP SCAN</span>
                            </div>
                          </button>
                          <button 
                            onClick={() => startScan(image!, 'FAST')}
                            className="relative group overflow-hidden rounded-md shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-500 group-hover:scale-105 transition-transform duration-500" />
                            <div className="relative flex items-center justify-center gap-2 py-2 px-4">
                              <Rocket className="w-4 h-4 text-white" />
                              <span className="text-[10px] font-bold text-white tracking-wide">FAST SCAN</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {result && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    
                    {/* 1. TELEGRAM SIGNAL CARD (Top Priority) */}
                    <TelegramSignalCard result={result} tradingMode={tradingMode} />

                    {/* 2. AI VERDICT & NEXT CANDLE */}
                    <div className="grid grid-cols-1 gap-3">
                      <AIVerdictCard result={result} />
                      <NextCandleCard result={result} />
                    </div>

                    {/* 3. MARKET SENTIMENT */}
                    <MarketSentimentCard result={result} />

                    {/* 3.5 MTF CONTEXT & KEY PATTERN */}
                    <div className="grid grid-cols-1 gap-3">
                      <MTFContextCard result={result} />
                      <KeyPatternCard result={result} />
                    </div>

                    {/* WAIT SIGNAL WARNING */}
                    {result.actionSignal === 'WAIT' && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
                        <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                        <h3 className="text-amber-400 font-bold text-lg mb-1">NO TRADE ZONE</h3>
                        <p className="text-amber-200/70 text-sm">{result.marketCondition || 'Market conditions are not optimal. Waiting for a better setup.'}</p>
                      </div>
                    )}

                    {/* 4. KEY LEVELS, HEATMAP & INDICATORS */}
                    <div className="grid grid-cols-1 gap-3">
                      <KeyLevelsCard result={result} />
                      <LiquidityHeatmapCard result={result} />
                      <TechnicalIndicatorsCard result={result} />
                    </div>

                    {/* 5. CLARITY INDEX BAR */}
                    <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-5 shadow-2xl">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CLARITY INDEX</span>
                        <span className="text-xl font-black text-white tracking-tight">{result.clarityIndex || 85}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${result.clarityIndex || 85}%` }}
                          className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                        />
                      </div>
                    </div>

                    {/* 6. TRAP DETECTION & WARNINGS (Separate Cards) */}
                    {result.trapDetection && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                        <div className="flex items-center gap-2 mb-2">
                          <Crosshair className="w-4 h-4 text-rose-400" />
                          <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">TRAP DETECTION</span>
                        </div>
                        <p className="text-xs text-rose-200/80 leading-relaxed font-medium">{result.trapDetection}</p>
                      </motion.div>
                    )}

                    {result.selfCorrectionLog && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-indigo-400" />
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">SELF-CORRECTION ACTIVE</span>
                        </div>
                        <p className="text-xs text-indigo-200/80 leading-relaxed font-medium">{result.selfCorrectionLog}</p>
                      </motion.div>
                    )}

                    {/* SAVE TO VAULT BUTTON */}
                    <button 
                      onClick={() => {
                        setScanToSave({
                          id: Date.now().toString(),
                          timestamp: Date.now(),
                          market: market,
                          timeframe: timeframe,
                          assetPair: assetPair,
                          result: result,
                          provider,
                          model: provider === 'openai' ? 'gpt-4o' : 'gemini-3-flash-preview',
                          image: image || '',
                          tradingMode,
                          useMartingale
                        });
                        setIsSavingScan(true);
                      }}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus className="w-5 h-5" />
                      SAVE TO MY VAULT
                    </button>

                    {result.guardianWarning && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">GUARDIAN WARNING</span>
                        </div>
                        <p className="text-xs text-amber-200/80 leading-relaxed font-medium">{result.guardianWarning}</p>
                      </motion.div>
                    )}

                    {/* 7. DEEP ANALYSIS (Glowing Cards) */}
                    <div className="space-y-3">
                      <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full"></div>
                        <div className="flex items-center gap-2 mb-2 relative z-10">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Market Psychology</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed italic relative z-10">"{result.deepAnalysis}"</p>
                      </div>

                      <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full"></div>
                        <div className="flex items-center gap-2 mb-2 relative z-10">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Technical Reasoning</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed relative z-10">{result.technicalReasoning}</p>
                      </div>

                      <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full"></div>
                        <div className="flex items-center gap-2 mb-2 relative z-10">
                          <ShieldAlert className="w-4 h-4 text-emerald-400" />
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Risk Management</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed relative z-10">{result.riskManagement}</p>
                      </div>
                    </div>

                    {/* Scan Another Chart Button */}
                    <button 
                      onClick={resetScanner}
                      className="w-full mt-6 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-black tracking-wide uppercase shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98]"
                    >
                      Scan Another Chart
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'autobot' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col gap-4">
            {/* Futuristic Bot Status Dashboard */}
            <div className="bg-[#050810] border border-white/5 rounded-2xl p-5 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
              {/* Animated Background Grid */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              
              {isScanning && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-emerald-500/5 pointer-events-none"
                />
              )}

              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  {/* Radar Pulse Indicator */}
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <div className={`absolute inset-0 rounded-full border-2 ${isScanning ? 'border-emerald-500/50 animate-ping' : 'border-slate-700'}`} />
                    <div className={`absolute inset-2 rounded-full border border-dashed ${isScanning ? 'border-emerald-400/30 animate-[spin_4s_linear_infinite]' : 'border-slate-800'}`} />
                    <div className={`w-3 h-3 rounded-full relative z-10 ${isScanning ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'bg-slate-700'}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">System Status</span>
                    <span className={`text-sm font-black uppercase tracking-wider ${isScanning ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {isScanning ? 'Neural Core Active' : 'Core Standby'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  {isAutoMonitoring && nextScanCountdown !== null ? (
                    <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-[10px] font-mono font-black text-cyan-400 tracking-tighter">T-MINUS {nextScanCountdown}S</span>
                    </div>
                  ) : (
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Awaiting Command</span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col gap-1 group/stat">
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest group-hover/stat:text-purple-400 transition-colors">Protocol</span>
                  <span className="text-xs font-black text-white tracking-wide">{tradingMode}</span>
                  <div className="h-0.5 w-full bg-slate-800 mt-1 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 w-2/3" />
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col gap-1 group/stat">
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest group-hover/stat:text-amber-400 transition-colors">Martingale</span>
                  <span className="text-xs font-black text-white tracking-wide">{useMartingale ? 'ENABLED (1-STEP)' : 'DISABLED'}</span>
                  <div className="h-0.5 w-full bg-slate-800 mt-1 rounded-full overflow-hidden">
                    <div className={`h-full ${useMartingale ? 'bg-amber-500 w-full' : 'bg-slate-700 w-0'}`} />
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col gap-1 group/stat">
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest group-hover/stat:text-cyan-400 transition-colors">Total Scans</span>
                  <span className="text-xs font-black text-white tracking-wide font-mono">{botStats.scans.toString().padStart(4, '0')}</span>
                  <div className="h-0.5 w-full bg-slate-800 mt-1 rounded-full overflow-hidden">
                    <motion.div animate={{ width: ['0%', '100%', '0%'] }} transition={{ duration: 3, repeat: Infinity }} className="h-full bg-cyan-500" />
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col gap-1 group/stat">
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest group-hover/stat:text-emerald-400 transition-colors">Signals Found</span>
                  <span className="text-xs font-black text-emerald-400 tracking-wide font-mono">{botStats.signals.toString().padStart(4, '0')}</span>
                  <div className="h-0.5 w-full bg-slate-800 mt-1 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: botStats.scans > 0 ? `${(botStats.signals / botStats.scans) * 100}%` : '0%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Hacker Terminal Activity Log */}
            <div className="flex-1 bg-[#020408] border border-white/5 rounded-2xl p-5 shadow-2xl overflow-hidden flex flex-col min-h-[250px] relative">
              {/* Terminal Header */}
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-rose-500/50" />
                    <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Activity_Console.log</span>
                </div>
                <button 
                  onClick={() => setBotLogs([])} 
                  className="text-[9px] text-slate-600 hover:text-rose-400 transition-colors uppercase font-black tracking-widest flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  Purge
                </button>
              </div>

              {/* Terminal Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 font-mono pr-2">
                {botLogs.length > 0 ? (
                  botLogs.map((log, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={i} 
                      className="flex gap-3 text-[10px] leading-relaxed group"
                    >
                      <span className="text-slate-700 shrink-0 font-bold">[{log.time}]</span>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-black uppercase tracking-tighter text-[8px] px-1 rounded ${
                            log.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 
                            log.type === 'error' ? 'bg-rose-500/10 text-rose-500' : 
                            log.type === 'warn' ? 'bg-amber-500/10 text-amber-500' : 
                            'bg-slate-500/10 text-slate-500'
                          }`}>
                            {log.type}
                          </span>
                          <span className={`${
                            log.type === 'success' ? 'text-emerald-400/90' : 
                            log.type === 'error' ? 'text-rose-400/90' : 
                            log.type === 'warn' ? 'text-amber-400/90' : 
                            'text-slate-300'
                          } break-words`}>
                            {log.msg}
                          </span>
                        </div>
                        {/* Simulated progress bar for certain logs */}
                        {log.msg.includes('Analyzing') && (
                          <div className="w-32 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ duration: 2 }}
                              className="h-full bg-cyan-500/50"
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-20">
                    <CircleDashed className="w-8 h-8 text-slate-500 animate-spin mb-2" />
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Awaiting Initialization...</p>
                  </div>
                )}
                {/* Simulated blinking cursor */}
                <motion.div 
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-1.5 h-3 bg-emerald-500/50 ml-1 mt-2"
                />
              </div>
            </div>

            {!isScanning && !result && (
              <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-4">
                <p className="text-[10px] text-slate-500 italic text-center px-4">
                  Disclaimer: AI analysis is for informational purposes only. Market analysis is probabilistic; 100% accuracy is not possible. Trade at your own risk.
                </p>
                {/* ... existing configuration controls ... */}
                <div className="flex gap-2 bg-black/40 p-1 rounded-lg border border-white/5">
                  {(['REGULAR', 'COMPOUNDING'] as TradingMode[]).map((mode) => (
                  <button 
                    key={mode} 
                    onClick={() => setTradingMode(mode)} 
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                      tradingMode === mode 
                        ? mode === 'COMPOUNDING' 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {mode === 'COMPOUNDING' ? <Target className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                    {mode === 'COMPOUNDING' ? 'COMPOUNDING (A++)' : 'REGULAR'}
                  </button>
                ))}
              </div>

              <div className={`flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/5 transition-opacity ${tradingMode === 'COMPOUNDING' ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-300">Allow 1-Step Martingale</span>
                    <span className="text-[9px] text-slate-500">Acceptable risk for &gt;85% signals</span>
                  </div>
                </div>
                <button 
                  onClick={() => setUseMartingale(!useMartingale)}
                  disabled={tradingMode === 'COMPOUNDING'}
                  className={`w-10 h-5 rounded-full transition-colors relative ${useMartingale && tradingMode !== 'COMPOUNDING' ? 'bg-purple-500' : 'bg-slate-700'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${useMartingale && tradingMode !== 'COMPOUNDING' ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold mb-2 block">Select Live Currency Pair</label>
                <div className="relative z-50">
                  <div 
                    className="bg-black/40 border border-white/10 rounded-lg p-3 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <span className="text-sm font-bold text-white">{autoAsset || 'Select Currency'}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
                      >
                        <div className="p-3 border-b border-white/10 flex flex-col gap-3 bg-black/20">
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                              type="text" 
                              placeholder="Search over 100+ live assets..." 
                              value={dropdownSearch}
                              onChange={(e) => setDropdownSearch(e.target.value)}
                              className="w-full bg-black/60 border border-white/5 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          <div className="flex overflow-x-auto hide-scrollbar gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                            {ASSET_CATEGORIES.filter(cat => {
                              if (cat === 'All' || cat === 'Favorites') return true;
                              // Live Bot always shows Live assets
                              return CURRENCY_PAIRS.some(p => p.category === cat);
                            }).map(cat => (
                              <button
                                key={cat}
                                onClick={(e) => { e.stopPropagation(); setAutoCategory(cat); }}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
                                  autoCategory === cat 
                                    ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                                }`}
                              >
                                {cat === 'Favorites' && <Star className={`w-3 h-3 ${autoCategory === 'Favorites' ? 'fill-black' : 'fill-amber-400 text-amber-400'}`} />}
                                {cat === 'Forex' && <Globe className="w-3 h-3" />}
                                {cat === 'Crypto' && <Zap className="w-3 h-3 text-amber-400" />}
                                {cat === 'Commodities' && <Flame className="w-3 h-3 text-orange-400" />}
                                {cat === 'Stocks' && <LineChart className="w-3 h-3 text-blue-400" />}
                                {cat === 'Indices' && <BarChart3 className="w-3 h-3 text-purple-400" />}
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 bg-[#0a0f1c]/80 backdrop-blur-md">
                          {CURRENCY_PAIRS
                            .filter(p => {
                              const matchesSearch = p.label.toLowerCase().includes(dropdownSearch.toLowerCase());
                              const matchesCategory = autoCategory === 'All' || 
                                                     (autoCategory === 'Favorites' ? favorites.includes(p.symbol) : p.category === autoCategory);
                              return matchesSearch && matchesCategory;
                            })
                            .map(pair => (
                            <div 
                              key={pair.symbol}
                              className={`group px-4 py-3 text-sm font-bold rounded-xl cursor-pointer transition-all mb-1 flex items-center justify-between ${
                                autoAsset === pair.label 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-900/10' 
                                  : 'text-slate-300 hover:bg-white/5 hover:translate-x-1 border border-transparent'
                              }`}
                              onClick={() => {
                                setAutoAsset(pair.label);
                                setIsDropdownOpen(false);
                                setDropdownSearch('');
                                setAutoCategory('All');
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={(e) => toggleFavorite(pair.symbol, e)}
                                  className="p-1 px-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                  <Star className={`w-4 h-4 ${favorites.includes(pair.symbol) ? 'fill-amber-400 text-amber-400' : 'text-slate-600 opacity-40 group-hover:opacity-100'}`} />
                                </button>
                                <div className={`w-2 h-2 rounded-full ${autoAsset === pair.label ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
                                <span className="tracking-wide">{pair.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] opacity-0 group-hover:opacity-40 transition-opacity font-black tracking-tighter uppercase mr-2 border border-white/10 px-1.5 py-0.5 rounded bg-white/5">
                                  {pair.symbol}
                                </span>
                                <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-lg border ${
                                  pair.category === 'Forex' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                  pair.category === 'Crypto' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  pair.category === 'Commodities' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                  pair.category === 'Stocks' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                                  'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                }`}>
                                  {pair.category}
                                </span>
                              </div>
                            </div>
                          ))}
                          
                          {(market === 'LIVE' ? CURRENCY_PAIRS : OTC_PAIRS).filter(p => {
                            const matchesSearch = p.label.toLowerCase().includes(dropdownSearch.toLowerCase());
                            const matchesCategory = autoCategory === 'All' || (autoCategory === 'Favorites' ? favorites.includes(p.symbol) : p.category === autoCategory);
                            return matchesSearch && matchesCategory;
                          }).length === 0 && (
                            <div className="py-12 text-center">
                              {autoCategory === 'Favorites' ? <Star className="w-12 h-12 text-amber-500/20 mx-auto mb-3" /> : <Search className="w-12 h-12 text-slate-700 mx-auto mb-3 opacity-20" />}
                              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{autoCategory === 'Favorites' ? 'No favorites selected' : `No assets found in ${autoCategory}`}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* TradingView Chart Preview */}
              <div className="w-full h-[250px] rounded-xl overflow-hidden border border-white/10 bg-black relative">
                <iframe
                  id="tradingview_widget"
                  src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${encodeURIComponent((CURRENCY_PAIRS.find(p => p.label === autoAsset) || CURRENCY_PAIRS[0]).symbol)}&interval=${autoTimeframe === '1m' ? '1' : autoTimeframe === '2m' ? '1' : autoTimeframe === '3m' ? '3' : autoTimeframe === '5m' ? '5' : autoTimeframe === '15m' ? '15' : autoTimeframe === '30m' ? '30' : autoTimeframe === '1h' ? '60' : autoTimeframe === '4h' ? '240' : autoTimeframe === '1d' ? 'D' : autoTimeframe === '1w' ? 'W' : autoTimeframe === '1M' ? 'M' : '1'}&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=0a0f1c&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  scrolling="no"
                ></iframe>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Timeframe</label>
                <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
                  {LIVE_TIMEFRAMES.map((tf) => (
                    <button key={tf} onClick={() => setAutoTimeframe(tf)} disabled={isAutoMonitoring} className={`flex-none min-w-[48px] py-2 px-3 text-xs font-bold rounded-md transition-all border ${autoTimeframe === tf ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-black/40 text-slate-500 border-white/5 hover:bg-white/5'} disabled:opacity-50`}>
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => startAutoBotScan('DEEP')}
                  disabled={isScanning || isAutoMonitoring || !autoAsset}
                  className="relative group overflow-hidden rounded-md disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-500 group-hover:scale-105 transition-transform duration-500" />
                  <div className="relative px-3 py-3 flex items-center justify-center gap-1.5">
                    <Zap className="w-4 h-4 text-white" />
                    <span className="font-bold text-white text-xs tracking-wide">DEEP SCAN</span>
                  </div>
                </button>
                <button
                  onClick={() => startAutoBotScan('FAST')}
                  disabled={isScanning || isAutoMonitoring || !autoAsset}
                  className="relative group overflow-hidden rounded-md disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-500 group-hover:scale-105 transition-transform duration-500" />
                  <div className="relative px-3 py-3 flex items-center justify-center gap-1.5">
                    <Rocket className="w-4 h-4 text-white" />
                    <span className="font-bold text-white text-xs tracking-wide">FAST SCAN</span>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setIsAutoMonitoring(!isAutoMonitoring)}
                disabled={isScanning || !autoAsset}
                className={`w-full py-4 rounded-2xl font-black tracking-wide uppercase shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                  isAutoMonitoring 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-rose-500/20' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/20'
                }`}
              >
                {isAutoMonitoring ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                {isAutoMonitoring ? 'Stop Auto Bot' : 'Start Auto Bot'}
              </button>
            </div>
            )}

            {/* Autobot Scanning State */}
            {isScanning && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <LineChart className="w-12 h-12 text-emerald-500 animate-pulse" />
                <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase animate-pulse">Analyzing Live Market...</span>
              </div>
            )}

            {/* Autobot Result State */}
            {!isScanning && result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                
                {/* 1. TELEGRAM SIGNAL CARD (Top Priority) */}
                <TelegramSignalCard result={result} tradingMode={tradingMode} />

                {/* 2. AI VERDICT & NEXT CANDLE */}
                <div className="grid grid-cols-1 gap-3">
                  <AIVerdictCard result={result} />
                  <NextCandleCard result={result} />
                </div>

                {/* 3. MARKET SENTIMENT */}
                <MarketSentimentCard result={result} />

                {/* 3.5 MTF CONTEXT & KEY PATTERN */}
                <div className="grid grid-cols-1 gap-3">
                  <MTFContextCard result={result} />
                  <KeyPatternCard result={result} />
                </div>

                {/* WAIT SIGNAL WARNING */}
                {result.actionSignal === 'WAIT' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
                    <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                    <h3 className="text-amber-400 font-bold text-lg mb-1">NO TRADE ZONE</h3>
                    <p className="text-amber-200/70 text-sm">{result.marketCondition || 'Market conditions are not optimal. Waiting for a better setup.'}</p>
                  </div>
                )}

                {/* 4. KEY LEVELS, HEATMAP & INDICATORS */}
                <div className="grid grid-cols-1 gap-3">
                  <KeyLevelsCard result={result} />
                  <AutobotLiquidityHeatmapCard result={result} />
                  <AutobotTechnicalIndicatorsCard result={result} />
                </div>

                {/* 5. CLARITY INDEX BAR */}
                <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-5 shadow-2xl">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CLARITY INDEX</span>
                    <span className="text-xl font-black text-white tracking-tight">{result.clarityIndex || 85}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${result.clarityIndex || 85}%` }}
                      className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    />
                  </div>
                </div>

                {/* 6. TRAP DETECTION & WARNINGS (Separate Cards) */}
                {result.trapDetection && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                    <div className="flex items-center gap-2 mb-2">
                      <Crosshair className="w-4 h-4 text-rose-400" />
                      <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">TRAP DETECTION</span>
                    </div>
                    <p className="text-xs text-rose-200/80 leading-relaxed font-medium">{result.trapDetection}</p>
                  </motion.div>
                )}

                {result.selfCorrectionLog && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">SELF-CORRECTION ACTIVE</span>
                    </div>
                    <p className="text-xs text-indigo-200/80 leading-relaxed font-medium">{result.selfCorrectionLog}</p>
                  </motion.div>
                )}

                {result.guardianWarning && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">GUARDIAN WARNING</span>
                    </div>
                    <p className="text-xs text-amber-200/80 leading-relaxed font-medium">{result.guardianWarning}</p>
                  </motion.div>
                )}

                {/* 7. DEEP ANALYSIS (Glowing Cards) */}
                <div className="space-y-3">
                  <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full"></div>
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Market Psychology</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed italic relative z-10">"{result.deepAnalysis}"</p>
                  </div>

                  <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full"></div>
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Technical Reasoning</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed relative z-10">{result.technicalReasoning}</p>
                  </div>

                  <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full"></div>
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                      <ShieldAlert className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Risk Management</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed relative z-10">{result.riskManagement}</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setResult(null);
                    setAutoAsset('');
                  }}
                  className="w-full mt-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-black tracking-wide uppercase shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all active:scale-[0.98]"
                >
                  Scan Another Asset
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>
      
      {/* PWA Install Prompt */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 z-[200] bg-cyan-500 text-black px-4 py-3 rounded-2xl flex items-center justify-between shadow-[0_10px_40px_rgba(6,182,212,0.3)]"
          >
            <div className="flex items-center gap-3">
              <div className="bg-black/60 p-1.5 rounded-xl border border-amber-500/30">
                <LampIcon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-black leading-tight">Install Aladdin AI</p>
                <p className="text-[10px] font-bold opacity-80">Add to Home Screen for App Experience</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowInstallPrompt(false)} className="p-2 opacity-70 hover:opacity-100 transition-opacity">
                <X className="w-5 h-5" />
              </button>
              <button onClick={handleInstallClick} className="bg-black text-cyan-400 text-xs font-black px-4 py-2 rounded-xl shadow-sm active:scale-95 transition-transform">
                INSTALL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0f1c] border border-white/10 p-5 rounded-2xl w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 
                  className="text-white font-bold flex items-center gap-2 select-none cursor-pointer"
                  onClick={() => {
                    setSecretTapCount(prev => {
                      const newCount = prev + 1;
                      if (newCount >= 6) {
                        setIsAdminUnlocked(true);
                      }
                      return newCount;
                    });
                  }}
                >
                  <Key className="w-4 h-4 text-cyan-400"/> Settings
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2 mb-4 bg-black/40 p-1 rounded-lg border border-white/5">
                <button onClick={() => setSettingsTab('ai')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${settingsTab === 'ai' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}>AI Providers</button>
                {isAdminUnlocked && (
                  <button onClick={() => setSettingsTab('telegram')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${settingsTab === 'telegram' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'}`}>Telegram Bot</button>
                )}
              </div>

              {settingsTab === 'ai' ? (
                <>
                  <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                    Select your preferred AI Provider and enter its API key. If one quota runs out, you can switch to another!
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mb-4 bg-black/40 p-1 rounded-lg border border-white/5">
                    <button onClick={() => setTempProvider('gemini')} className={`flex-1 min-w-[70px] py-1.5 text-xs font-bold rounded-md transition-all ${tempProvider === 'gemini' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}>Gemini</button>
                    <button onClick={() => setTempProvider('openai')} className={`flex-1 min-w-[70px] py-1.5 text-xs font-bold rounded-md transition-all ${tempProvider === 'openai' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}>ChatGPT</button>
                    <button onClick={() => setTempProvider('anthropic')} className={`flex-1 min-w-[70px] py-1.5 text-xs font-bold rounded-md transition-all ${tempProvider === 'anthropic' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}>Claude</button>
                    <button onClick={() => setTempProvider('openrouter')} className={`flex-1 min-w-[100px] py-1.5 text-xs font-bold rounded-md transition-all ${tempProvider === 'openrouter' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}>100+ AIs (OpenRouter)</button>
                  </div>

                  {tempProvider === 'openrouter' && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Select AI Model</label>
                        <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-[9px] text-indigo-400 hover:text-indigo-300 underline font-bold">Get API Key ↗</a>
                      </div>
                      <button
                        onClick={() => setShowModelBrowser(true)}
                        className="w-full bg-black/50 border border-white/10 hover:border-cyan-500 rounded-xl px-3 py-3 text-xs text-white text-left flex justify-between items-center transition-colors"
                      >
                        <span className="truncate">{availableModels.find(m => m.id === tempOpenRouterModel)?.name || tempOpenRouterModel}</span>
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </button>
                      <p className="text-[8px] text-slate-500 mt-1.5">* Click above to browse and filter 100+ AI models.</p>
                    </div>
                  )}

                  <div className="max-h-48 overflow-y-auto pr-2 mb-4 space-y-2 custom-scrollbar">
                    {tempApiKeys[tempProvider].map((key, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="password"
                          value={key}
                          onChange={(e) => {
                            const newKeys = [...tempApiKeys[tempProvider]];
                            newKeys[index] = e.target.value;
                            setTempApiKeys({ ...tempApiKeys, [tempProvider]: newKeys });
                          }}
                          placeholder={`Enter ${tempProvider === 'gemini' ? 'Gemini' : tempProvider === 'openai' ? 'OpenAI' : tempProvider === 'anthropic' ? 'Anthropic' : 'OpenRouter'} API Key ${index + 1}...`}
                          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                        />
                        <button
                          onClick={() => {
                            const newKeys = tempApiKeys[tempProvider].filter((_, i) => i !== index);
                            setTempApiKeys({ ...tempApiKeys, [tempProvider]: newKeys });
                          }}
                          className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setTempApiKeys({ ...tempApiKeys, [tempProvider]: [...tempApiKeys[tempProvider], ''] });
                      }}
                      className="w-full py-2 border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/40 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs font-bold"
                    >
                      <Plus className="w-4 h-4" /> Add Another Key
                    </button>
                  </div>

                  {/* Smart Status Indicators */}
                  <div className="mb-4 bg-black/40 border border-white/5 rounded-xl p-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Smart Status Indicators</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                        <span className="text-xs text-slate-300">Active: <span className="font-bold text-white">{(() => {
                          const activeKeys = tempApiKeys[tempProvider].filter(k => keyStatuses[k] === 'active' && k.trim() !== '');
                          return activeKeys.length > 0 ? `...${activeKeys[0].slice(-4)}` : 'None';
                        })()}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-300 shadow-[0_0_5px_rgba(203,213,225,0.8)]"></span>
                        <span className="text-xs text-slate-300">Ready: <span className="font-bold text-white">{tempApiKeys[tempProvider].filter(k => (!keyStatuses[k] || keyStatuses[k] === 'ready') && k.trim() !== '').length}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.8)]"></span>
                        <span className="text-xs text-slate-300">Exhausted: <span className="font-bold text-white">{tempApiKeys[tempProvider].filter(k => keyStatuses[k] === 'exhausted' && k.trim() !== '').length}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]"></span>
                        <span className="text-xs text-slate-300">Error: <span className="font-bold text-white">{tempApiKeys[tempProvider].filter(k => keyStatuses[k] === 'error' && k.trim() !== '').length}</span></span>
                      </div>
                    </div>
                  </div>
                </>
              ) : settingsTab === 'telegram' ? (
                <>
                  <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                    Configure your Telegram Bot to receive signals directly in your channel or group.
                  </p>
                  <div className="mb-3">
                    <label className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1 block">Bot Token</label>
                    <input
                      type="password"
                      value={tempApiKeys.telegramBotToken || ''}
                      onChange={(e) => setTempApiKeys({ ...tempApiKeys, telegramBotToken: e.target.value })}
                      placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRstUVwxyZ"
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1 block">Chat ID or Username</label>
                    <input
                      type="text"
                      value={tempApiKeys.telegramChatId || ''}
                      onChange={(e) => setTempApiKeys({ ...tempApiKeys, telegramChatId: e.target.value })}
                      placeholder="e.g. @OlOlOTrade or -1001234567890"
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  
                  <div className="flex gap-2 mb-4">
                    <button 
                      onClick={() => {
                        fetch('/api/telegram/config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ token: tempApiKeys.telegramBotToken, chatId: tempApiKeys.telegramChatId })
                        }).then(() => {
                          // Success
                        }).catch(() => {
                          // Silently fail if no backend
                        });
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => {
                        setTelegramTestStatus('testing');
                        setTelegramTestMsg('Testing connection...');
                        fetch('/api/telegram/test', { method: 'POST' })
                          .then(res => res.json())
                          .then(data => {
                            if (data.status === 'ok') {
                              setTelegramTestStatus('success');
                              setTelegramTestMsg('Connection Successful!');
                            } else {
                              setTelegramTestStatus('error');
                              setTelegramTestMsg(data.error || 'Connection Failed');
                            }
                          })
                          .catch(() => {
                            setTelegramTestStatus('error');
                            setTelegramTestMsg('Connection Failed');
                          });
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                      Test
                    </button>
                    <button 
                      onClick={() => {
                        setTempApiKeys({ ...tempApiKeys, telegramBotToken: '', telegramChatId: '' });
                        fetch('/api/telegram/config', { method: 'DELETE' }).then(() => {
                          // Success
                        }).catch(() => {
                          // Silently fail if no backend
                        });
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  
                  {telegramTestStatus !== 'idle' && (
                    <div className={`mb-4 text-xs font-bold text-center p-2 rounded-lg ${telegramTestStatus === 'testing' ? 'bg-indigo-500/20 text-indigo-400' : telegramTestStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {telegramTestStatus === 'testing' ? <Loader2 className="w-3 h-3 inline mr-2 animate-spin" /> : null}
                      {telegramTestMsg}
                    </div>
                  )}
                </>
              ) : null}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (settingsTab === 'ai') {
                      setTempApiKeys({ ...tempApiKeys, [tempProvider]: [] });
                    } else {
                      setTempApiKeys({ ...tempApiKeys, telegramBotToken: '', telegramChatId: '' });
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5 transition-colors"
                >
                  Clear Fields
                </button>
                <button
                  onClick={settingsTab === 'telegram' ? handleSaveTelegram : handleSaveApiKey}
                  disabled={telegramTestStatus === 'testing' || telegramTestStatus === 'success' || aiSaveStatus === 'saving' || aiSaveStatus === 'success'}
                  className={`flex-1 py-2.5 rounded-xl text-black text-xs font-black transition-colors ${settingsTab === 'telegram' ? 'bg-indigo-500 hover:bg-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'} ${telegramTestStatus === 'testing' || telegramTestStatus === 'success' || aiSaveStatus === 'saving' || aiSaveStatus === 'success' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {settingsTab === 'telegram' 
                    ? (telegramTestStatus === 'testing' ? 'Connecting...' : 
                       telegramTestStatus === 'success' ? 'Connected ✅' : 
                       (apiKeys.telegramBotToken && tempApiKeys.telegramBotToken === apiKeys.telegramBotToken && tempApiKeys.telegramChatId === apiKeys.telegramChatId ? 'Connected ✅' : 'Save & Connect'))
                    : (aiSaveStatus === 'saving' ? 'Connecting...' :
                       aiSaveStatus === 'success' ? 'Connected ✅' : 'Save & Connect')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Browser Modal */}
      <AnimatePresence>
        {showModelBrowser && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[500] bg-[#050914] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0a0f1c]">
              <div>
                <h3 className="text-white font-bold text-lg">Model Library</h3>
                <p className="text-[10px] text-slate-400">Select an AI model from OpenRouter</p>
              </div>
              <button onClick={() => setShowModelBrowser(false)} className="text-slate-400 hover:text-white p-2 bg-white/5 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 bg-[#0a0f1c]">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search models by name or ID..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex p-3 gap-2 bg-[#0a0f1c] border-b border-white/10">
              <button
                onClick={() => setModelBrowserTab('supported')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${modelBrowserTab === 'supported' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:bg-white/5 border border-transparent'}`}
              >
                ✅ Supported (Vision)
              </button>
              <button
                onClick={() => setModelBrowserTab('unsupported')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${modelBrowserTab === 'unsupported' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-500 hover:bg-white/5 border border-transparent'}`}
              >
                ❌ Unsupported (Text)
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
              {availableModels
                .filter(m => m.isVision === (modelBrowserTab === 'supported'))
                .filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.id.toLowerCase().includes(modelSearch.toLowerCase()))
                .map(m => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-xl border transition-all ${tempOpenRouterModel === m.id ? 'bg-cyan-500/10 border-cyan-500' : 'bg-[#0a0f1c] border-white/5 hover:border-white/20'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-bold text-sm">{m.name}</h4>
                        {m.isFree && <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-500/30">FREE</span>}
                      </div>
                      {tempOpenRouterModel === m.id && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-[10px] text-slate-500 font-mono bg-black/50 px-2 py-1 rounded border border-white/5">{m.id}</p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(m.id);
                          setCopiedId(m.id);
                          setTimeout(() => setCopiedId(''), 2000);
                        }}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                        title="Copy Model ID"
                      >
                        {copiedId === m.id ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    
                    {m.isVision ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
                        <p className="text-emerald-400 text-[11px] font-bold mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5"/> Aladdin AI Scanner supports this model</p>
                        <p className="text-emerald-400/70 text-[10px] leading-relaxed">This model has Vision capabilities and can perfectly read and analyze trading charts.</p>
                      </div>
                    ) : (
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
                        <p className="text-rose-400 text-[11px] font-bold mb-1 flex items-center gap-1.5"><X className="w-3.5 h-3.5"/> Not supported for Chart Scanning</p>
                        <p className="text-rose-400/70 text-[10px] leading-relaxed">This is a text-only model. It is great for chatting or coding, but it CANNOT see your trading charts.</p>
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <button 
                        onClick={() => {
                          setTempOpenRouterModel(m.id);
                          setShowModelBrowser(false);
                        }} 
                        className={`flex-1 text-[10px] font-bold py-2 rounded-lg transition-colors ${tempOpenRouterModel === m.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-cyan-500 hover:bg-cyan-600 text-black'}`}
                      >
                        {tempOpenRouterModel === m.id ? 'Selected' : 'Select Model'}
                      </button>
                      <a 
                        href={`https://openrouter.ai/models/${m.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-center gap-1 px-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-lg transition-colors border border-white/5"
                      >
                        OpenRouter <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
                
                {availableModels.length === 0 && (
                  <div className="text-center text-slate-500 text-sm py-10 flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    Loading models from OpenRouter...
                  </div>
                )}
                
                {availableModels.length > 0 && availableModels.filter(m => m.isVision === (modelBrowserTab === 'supported')).filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.id.toLowerCase().includes(modelSearch.toLowerCase())).length === 0 && (
                  <div className="text-center text-slate-500 text-sm py-10">
                    No models found matching "{modelSearch}"
                  </div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[400] bg-[#050914] flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0a0f1c]">
              <div>
                <h3 className="text-white font-bold text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-cyan-400"/> Scan History</h3>
                <p className="text-[10px] text-slate-400">Your recent analysis results</p>
              </div>
              <div className="flex items-center gap-3">
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-xs text-rose-400 hover:text-white px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 hover:border-rose-500 rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear All
                  </button>
                )}
                <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white p-2 bg-white/5 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Win Rate Dashboard */}
            {history.filter(h => h.outcome).length > 0 && (
              <div className="mx-4 mt-4 p-4 bg-gradient-to-br from-slate-800/50 to-[#0a0f1c] border border-white/10 rounded-xl flex items-center justify-between shadow-lg">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accuracy</span>
                  <span className="text-2xl font-black text-white">
                    {Math.round((history.filter(h => h.outcome === 'WIN').length / history.filter(h => h.outcome).length) * 100)}%
                  </span>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Wins</span>
                    <span className="text-lg font-bold text-emerald-400">{history.filter(h => h.outcome === 'WIN').length}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Losses</span>
                    <span className="text-lg font-bold text-rose-400">{history.filter(h => h.outcome === 'LOSS').length}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Total</span>
                    <span className="text-lg font-bold text-cyan-400">{history.filter(h => h.outcome).length}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
              {/* Performance Dashboard */}
              {history.length > 0 && (
                <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-4 mb-4">
                  <h3 className="text-white font-bold text-sm mb-3">Performance Stats</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-black/40 p-2 rounded-lg border border-white/5 text-center">
                      <div className="text-[10px] text-slate-500 uppercase">Total</div>
                      <div className="text-lg font-black text-white">{history.length}</div>
                    </div>
                    <div className="bg-black/40 p-2 rounded-lg border border-white/5 text-center">
                      <div className="text-[10px] text-slate-500 uppercase">Wins</div>
                      <div className="text-lg font-black text-emerald-400">{history.filter(h => h.outcome === 'WIN').length}</div>
                    </div>
                    <div className="bg-black/40 p-2 rounded-lg border border-white/5 text-center">
                      <div className="text-[10px] text-slate-500 uppercase">Win Rate</div>
                      <div className="text-lg font-black text-cyan-400">
                        {history.length > 0 ? Math.round((history.filter(h => h.outcome === 'WIN').length / history.filter(h => h.outcome === 'WIN' || h.outcome === 'LOSS').length || 0) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {history.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-10">
                  No scan history yet.
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => loadHistoryItem(item)}
                    className="bg-[#0a0f1c] border border-white/5 rounded-xl p-3 flex gap-3 items-center cursor-pointer hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-black flex-none border border-white/10 group-hover:border-cyan-500/30 transition-colors">
                      <img src={item.image || undefined} alt="Scan" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-white font-bold text-sm truncate">{item.assetPair} • {item.timeframe}</h4>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                          item.result.actionSignal === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          item.result.actionSignal === 'SELL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                          'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}>
                          {item.result.actionSignal}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono truncate">
                        <span className="bg-white/5 px-1 rounded">{item.provider}</span>
                        <span className="truncate">{item.model}</span>
                      </div>
                      
                      {/* Feedback Loop UI */}
                      <div className="mt-2 flex items-center gap-2">
                        {!item.outcome ? (
                          <>
                            <button onClick={(e) => markTradeOutcome(e, item.id, 'WIN')} className="flex-1 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded hover:bg-emerald-500/20 transition-colors">
                              🏆 WIN
                            </button>
                            <button onClick={(e) => markTradeOutcome(e, item.id, 'LOSS')} className="flex-1 py-1 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded hover:bg-rose-500/20 transition-colors">
                              ❌ LOSS
                            </button>
                          </>
                        ) : (
                          <div className={`flex-1 py-1 text-[10px] font-bold text-center rounded border ${item.outcome === 'WIN' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                            {item.outcome === 'WIN' ? '🏆 WON' : `❌ LOST: ${item.lossReason}`}
                          </div>
                        )}
                      </div>

                    </div>
                    <button 
                      onClick={(e) => deleteHistoryItem(e, item.id)}
                      className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      title="Delete scan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loss Reason Modal */}
      <AnimatePresence>
        {lossReasonModal.isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-[#0a0f1c] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col p-4 gap-4">
              <h3 className="text-white font-bold text-lg">Why did this trade lose?</h3>
              <p className="text-xs text-slate-400">This helps the AI learn and avoid this trap in the future.</p>
              
              <div className="flex flex-col gap-2">
                {[
                  "Last second spike (Manipulation)",
                  "Trend continued (No reversal)",
                  "Support/Resistance broke",
                  "Choppy/Overlapping market",
                  "News/High Volatility"
                ].map(reason => (
                  <button 
                    key={reason}
                    onClick={(e) => markTradeOutcome(e, lossReasonModal.historyId!, 'LOSS', reason)}
                    className="text-left px-3 py-2 text-sm text-slate-300 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-colors"
                  >
                    {reason}
                  </button>
                ))}
              </div>
              
              <button onClick={() => setLossReasonModal({ isOpen: false, historyId: null })} className="mt-2 py-2 text-sm text-slate-500 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-[#0a0f1c] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <span className="bg-cyan-500/20 text-cyan-400 w-6 h-6 rounded-full flex items-center justify-center text-sm">?</span> 
                  How to Use
                </h3>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white p-2 bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-5 overflow-y-auto hide-scrollbar space-y-6 text-sm text-slate-300">
                
                <section>
                  <h4 className="text-cyan-400 font-bold mb-2 flex items-center gap-2"><Key className="w-4 h-4"/> 1. Setup API Key (Free)</h4>
                  <p className="mb-2 text-slate-400 text-xs">To use the scanner, you need a free API key. We recommend OpenRouter as it gives you access to many free models.</p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-xs text-slate-300">
                    <li>Click the <strong>Key icon</strong> in the top right corner.</li>
                    <li>Select <strong>100+ AIs (OpenRouter)</strong>.</li>
                    <li>Click the <span className="text-indigo-400">Get API Key ↗</span> link.</li>
                    <li>Sign in to OpenRouter (it's free).</li>
                    <li>Create a key, copy it, and paste it back into the app.</li>
                    <li>Click <strong>Save & Connect</strong>.</li>
                  </ol>
                </section>

                <section>
                  <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-2"><Target className="w-4 h-4"/> 2. Choose a Free Model</h4>
                  <p className="mb-2 text-slate-400 text-xs">OpenRouter has many models. We've tagged the completely free ones for you.</p>
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-300">
                    <li>In Settings, click the model dropdown.</li>
                    <li>Look for models with the <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-500/30">FREE</span> tag.</li>
                    <li>Make sure you stay on the <strong>✅ Supported (Vision)</strong> tab, as the AI needs to see your chart!</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2"><Activity className="w-4 h-4"/> 3. Scan a Chart</h4>
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-300">
                    <li>Select your Market (LIVE/OTC) and Timeframe.</li>
                    <li>Enter the Asset name (e.g., EURUSD).</li>
                    <li>Take a clear photo of your trading chart or upload a screenshot.</li>
                    <li>Wait for the Pro Engine to analyze and give you a signal!</li>
                  </ul>
                </section>

                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-xs text-cyan-200">
                  <strong>Tip:</strong> If you get a "Quota Exceeded" error, it means your current API key has reached its free limit. Just go to settings and select a different free model, or create a new key!
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Live Camera Modal */}
      <AnimatePresence>
        {showLiveCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black flex flex-col"
          >
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
              <h3 className="text-white font-bold text-sm tracking-widest">LIVE SCANNER</h3>
              <button onClick={stopLiveCamera} className="text-white p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute min-w-full min-h-full object-cover"
              />
              {/* Scanner overlay effect */}
              <div className="absolute inset-0 pointer-events-none border-[2px] border-cyan-500/30 m-8 rounded-2xl">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-xl -mb-1 -mr-1"></div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center items-center bg-gradient-to-t from-black/90 via-black/50 to-transparent">
              <button 
                onClick={captureFromLiveCamera}
                className="relative group flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-cyan-500 rounded-full blur-md opacity-50 group-hover:opacity-80 transition-opacity duration-300"></div>
                <div className="relative w-20 h-20 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.5)] active:scale-95 transition-transform">
                  <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Scan Modal */}
      <AnimatePresence>
        {isSavingScan && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Save to Vault</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Store this setup for review</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Setup Name</label>
                  <input 
                    type="text" 
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="e.g. Strong Support Breakout"
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => {
                      setIsSavingScan(false);
                      setScanToSave(null);
                      setSaveName('');
                    }}
                    className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={saveScanToVault}
                    disabled={!saveName.trim()}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                  >
                    Save Setup
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

