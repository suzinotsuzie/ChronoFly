import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, ChevronDown, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, CaptionLabel, useNavigation } from 'react-day-picker';
import { format, parse } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { CaptionProps } from 'react-day-picker';

function ChronoCaption(props: CaptionProps) {
  const { previousMonth, nextMonth } = useNavigation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 10 }}>
      <CaptionLabel {...props} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button
          type="button"
          onClick={() => previousMonth()}
          style={{
            background: 'rgba(228,213,183,0.08)', border: '1px solid rgba(228,213,183,0.18)',
            borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.beige, cursor: 'pointer',
          }}
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => nextMonth()}
          style={{
            background: 'rgba(228,213,183,0.08)', border: '1px solid rgba(228,213,183,0.18)',
            borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.beige, cursor: 'pointer',
          }}
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function parseFlightDate(ymd: string): Date {
  try {
    return parse(ymd, 'yyyy-MM-dd', new Date());
  } catch {
    return new Date();
  }
}

const PROFILE_STORAGE_KEY = 'chrono_profile';
const DEFAULT_AVATAR_URL = '/avatar.png';
function loadProfile(): { name: string; avatar: string } {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { name?: string; avatar?: string };
      return { name: p.name ?? 'Suzi', avatar: p.avatar ?? '' };
    }
  } catch (_) {}
  return { name: 'Suzi', avatar: '' };
}
function saveProfile(name: string, avatar: string): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ name, avatar }));
  } catch (_) {}
}

// ── Palette (from icon HTML) ──────────────────────────────────────────────
const C = {
  midnight: '#0D2B2B',
  dark:     '#1E4D3A',
  moss:     '#7A9268',
  beige:    '#E4D5B7',
  rosy:     '#C08070',
};

// ── 莫奈睡莲风格动作音效（Web Audio API，无外链）────────────────────────────
let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext?: new () => AudioContext }).webkitAudioContext)();
  return _audioCtx;
}
/** 轻微触觉震动（支持设备时） */
function triggerHaptic(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([20, 15, 25]);
  }
}

/** GO 按钮：风声 + 低频震动感（触觉 + 听觉 + 视觉轻抖） */
async function playGoSound(): Promise<void> {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }
  const t = ctx.currentTime + 0.01;

  triggerHaptic();

  // 低频震动感：很短的一下嗡鸣
  const rumble = ctx.createOscillator();
  const rumbleGain = ctx.createGain();
  rumble.connect(rumbleGain);
  rumbleGain.connect(ctx.destination);
  rumble.type = 'sine';
  rumble.frequency.setValueAtTime(48, t);
  rumble.frequency.exponentialRampToValueAtTime(36, t + 0.22);
  rumbleGain.gain.setValueAtTime(0, t);
  rumbleGain.gain.linearRampToValueAtTime(0.04, t + 0.02);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  rumble.start(t);
  rumble.stop(t + 0.25);

  // 风声
  const windDur = 1.4;
  const windBuffer = ctx.createBuffer(1, ctx.sampleRate * windDur, ctx.sampleRate);
  const channel = windBuffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) channel[i] = (Math.random() * 2 - 1) * 0.4;
  const windSource = ctx.createBufferSource();
  windSource.buffer = windBuffer;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'lowpass';
  windFilter.frequency.value = 600;
  windFilter.Q.value = 0.4;
  const windGain = ctx.createGain();
  windSource.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(ctx.destination);
  windGain.gain.setValueAtTime(0, t);
  windGain.gain.linearRampToValueAtTime(0.022, t + 0.18);
  windGain.gain.exponentialRampToValueAtTime(0.001, t + windDur);
  windSource.start(t);
  windSource.stop(t + windDur);
}
/** now 按钮：短促双音「哒—哒」— 两下轻触 */
async function playNowSound(): Promise<void> {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }
  const t = ctx.currentTime + 0.01;
  const tap = (start: number, freq: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t + start);
    g.gain.setValueAtTime(0, t + start);
    g.gain.linearRampToValueAtTime(0.022, t + start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + 0.1);
    o.start(t + start);
    o.stop(t + start + 0.1);
  };
  tap(0, 580);
  tap(0.09, 720);
}

// ── Mock departure database ───────────────────────────────────────────────
const MOCK_FLIGHTS: Record<string, string> = {
  MU5101: '08:05', MU5102: '10:20', MU5129: '09:05', MU9007: '06:40',
  CA1234: '09:30', CA888:  '14:10', CA321:  '07:55',
  CZ3456: '07:15', CZ8801: '11:45', CZ200:  '13:30',
  MF8456: '06:50', MF1001: '08:35',
  FM9234: '11:20', FM456:  '15:00',
  ZH9876: '09:45', ZH1234: '16:25',
  AA100:  '08:00', UA200:  '12:30', DL300:  '07:20',
};

// ── Local storage keys ────────────────────────────────────────────────────
const FLIGHT_STATE_KEY = 'chrono_flight_state_v1';

function mockDeparture(flightNo: string): string {
  const key = flightNo.toUpperCase().trim();
  if (MOCK_FLIGHTS[key]) return MOCK_FLIGHTS[key];
  const hash = key.split('').reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 7), 0);
  const hr = 6 + (Math.abs(hash) % 13);
  const minChoices = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const mn = minChoices[Math.abs(hash * 3) % minChoices.length];
  return `${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
}

// ── Time helpers ──────────────────────────────────────────────────────────
function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function toStr(mins: number): string {
  const total = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function nowStr(): string {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

// ── Types ─────────────────────────────────────────────────────────────────
type Durations = { linger: number; polish: number; rollout: number; clear: number; gate: number; board: number };
const DEFAULT_DURATIONS: Durations = {
  linger: 20, polish: 30, rollout: 30, clear: 20, gate: 15, board: 20,
};

function calcTimes(depStr: string, d: Durations): Record<string, number> {
  const dep     = toMin(depStr);
  const board   = dep      - d.board;
  const gate    = board    - d.gate;
  const clear   = gate     - d.clear;
  const rollout = clear    - d.rollout;
  const polish  = rollout  - d.polish;
  const linger  = polish   - d.linger;
  const wake    = linger   - d.linger;
  return { wake, linger, polish, rollout, clear, gate, board };
}

// ── Custom SVG Icons ──────────────────────────────────────────────────────
const IconRingRing = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bell1" cx="36%" cy="28%" r="68%">
        <stop offset="0%" stopColor="#E4D5B7"/>
        <stop offset="50%" stopColor="#CEBF9E"/>
        <stop offset="100%" stopColor="#A89070"/>
      </radialGradient>
    </defs>
    <path d="M36 12 C24 12 18 22 18 32 L18 46 Q18 50 22 50 L50 50 Q54 50 54 46 L54 32 C54 22 48 12 36 12Z" fill="url(#bell1)"/>
    <path d="M36 14 C26 14 21 23 21 32 L21 42" stroke="#E4D5B7" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.38"/>
    <circle cx="36" cy="54" r="4.5" fill="#C08070"/>
    <circle cx="36" cy="54" r="2.2" fill="#9A6050"/>
    <path d="M30 12 Q36 6 42 12" stroke="#A89070" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8"/>
    <circle cx="36" cy="10" r="2.8" fill="#CEBF9E" opacity="0.75"/>
    <path d="M10 28 Q6 36 10 44"  stroke="#C08070" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.75"/>
    <path d="M6 22  Q1 36 6 50"   stroke="#C08070" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.35"/>
    <path d="M62 28 Q66 36 62 44" stroke="#C08070" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.75"/>
    <path d="M66 22 Q71 36 66 50" stroke="#C08070" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.35"/>
    <ellipse cx="18" cy="62" rx="8"   ry="3.2" fill="#7A9268" opacity="0.5"  transform="rotate(-8 18 62)"/>
    <ellipse cx="54" cy="63" rx="6.5" ry="2.8" fill="#1E4D3A" opacity="0.55" transform="rotate(6 54 63)"/>
  </svg>
);

const IconWakeyWakey = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="iris2" cx="40%" cy="38%" r="58%">
        <stop offset="0%" stopColor="#7A9268"/>
        <stop offset="55%" stopColor="#1E4D3A"/>
        <stop offset="100%" stopColor="#0D2B2B"/>
      </radialGradient>
      <clipPath id="eyeclip2">
        <path d="M10 36 Q36 16 62 36 Q36 52 10 36Z"/>
      </clipPath>
    </defs>
    <path d="M10 36 Q36 16 62 36 Q36 56 10 36Z" fill="#E4D5B7" opacity="0.92"/>
    <path d="M10 36 Q36 16 62 36 Q50 28 36 26 Q22 28 10 36Z" fill="#C4B08A" opacity="0.88"/>
    <circle cx="36" cy="37" r="10" fill="url(#iris2)" clipPath="url(#eyeclip2)"/>
    <circle cx="36" cy="37" r="5"  fill="#0D2B2B" opacity="0.9"  clipPath="url(#eyeclip2)"/>
    <circle cx="32" cy="34" r="2.5" fill="#E4D5B7" opacity="0.4" clipPath="url(#eyeclip2)"/>
    <path d="M10 36 Q36 16 62 36" stroke="#C08070" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
    <path d="M10 36 Q36 52 62 36" stroke="#C08070" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.55"/>
    <line x1="22" y1="24" x2="20" y2="17" stroke="#C08070" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
    <line x1="30" y1="19" x2="29" y2="12" stroke="#C08070" strokeWidth="2" strokeLinecap="round" opacity="0.65"/>
    <line x1="36" y1="17" x2="36" y2="10" stroke="#C08070" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
    <line x1="43" y1="19" x2="44" y2="12" stroke="#C08070" strokeWidth="2" strokeLinecap="round" opacity="0.65"/>
    <line x1="50" y1="24" x2="52" y2="17" stroke="#C08070" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
    <text x="52" y="22" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="11" fill="#7A9268" opacity="0.7">z</text>
    <text x="58" y="15" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="9"  fill="#7A9268" opacity="0.5">z</text>
    <text x="63" y="9"  fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="7"  fill="#7A9268" opacity="0.35">z</text>
    <ellipse cx="18" cy="60" rx="7" ry="2.8" fill="#7A9268" opacity="0.45" transform="rotate(-6 18 60)"/>
    <ellipse cx="54" cy="61" rx="6" ry="2.4" fill="#1E4D3A" opacity="0.5"  transform="rotate(5 54 61)"/>
  </svg>
);

const IconLeavingHome = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="wall3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E4D5B7" stopOpacity="0.92"/>
        <stop offset="100%" stopColor="#C4B08A" stopOpacity="0.68"/>
      </linearGradient>
      <linearGradient id="roof3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#C08070"/>
        <stop offset="100%" stopColor="#9A6050"/>
      </linearGradient>
    </defs>
    <rect x="10" y="36" width="36" height="26" rx="2" fill="url(#wall3)"/>
    <path d="M6 38 L28 14 L50 38Z" fill="url(#roof3)"/>
    <path d="M8 38 L28 16 L48 38" stroke="#E4D5B7" strokeWidth="1" fill="none" opacity="0.32"/>
    <path d="M21 62 L21 46 Q21 40 28 40 Q35 40 35 46 L35 62Z" fill="#1E4D3A" opacity="0.82"/>
    <circle cx="33" cy="52" r="2" fill="#C08070" opacity="0.85"/>
    <rect x="12" y="42" width="8" height="8" rx="1.5" fill="#1E4D3A" opacity="0.5"/>
    <line x1="16" y1="42" x2="16" y2="50" stroke="#7A9268" strokeWidth="1.2" opacity="0.6"/>
    <line x1="12" y1="46" x2="20" y2="46" stroke="#7A9268" strokeWidth="1.2" opacity="0.6"/>
    <rect x="38" y="20" width="5" height="12" rx="1" fill="#C08070" opacity="0.65"/>
    <path d="M52 44 L64 36" stroke="#C08070" strokeWidth="3.8" strokeLinecap="round"/>
    <path d="M58 30 L64 36 L58 42" stroke="#C08070" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="55" cy="30" r="2.2" fill="#E4D5B7" opacity="0.55"/>
    <circle cx="61" cy="27" r="1.6" fill="#C08070" opacity="0.45"/>
    <ellipse cx="8"  cy="64" rx="6"   ry="2.5" fill="#7A9268" opacity="0.5"/>
    <ellipse cx="48" cy="65" rx="5.5" ry="2.2" fill="#1E4D3A" opacity="0.5"/>
  </svg>
);

const IconTerminalEntry = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="facade4" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E4D5B7" stopOpacity="0.85"/>
        <stop offset="100%" stopColor="#7A9268" stopOpacity="0.5"/>
      </linearGradient>
      <linearGradient id="archfill4" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7A9268" stopOpacity="0.8"/>
        <stop offset="100%" stopColor="#1E4D3A" stopOpacity="0.95"/>
      </linearGradient>
    </defs>
    <rect x="4" y="38" width="64" height="26" rx="3" fill="url(#facade4)"/>
    <path d="M22 64 L22 46 Q22 34 36 34 Q50 34 50 46 L50 64Z" fill="url(#archfill4)"/>
    <path d="M22 46 Q22 34 36 34 Q50 34 50 46" stroke="#E4D5B7" strokeWidth="2" fill="none" opacity="0.5"/>
    <rect x="8"  y="44" width="11" height="11" rx="2" fill="#1E4D3A" opacity="0.65"/>
    <rect x="53" y="44" width="11" height="11" rx="2" fill="#1E4D3A" opacity="0.65"/>
    <path d="M2 38 Q36 24 70 38" stroke="#E4D5B7" strokeWidth="2.2" fill="none" opacity="0.42"/>
    <rect x="30" y="14" width="12" height="24" rx="2" fill="#E4D5B7" opacity="0.6"/>
    <rect x="27" y="11" width="18" height="7"  rx="2" fill="#C08070" opacity="0.78"/>
    <path d="M44 9 L58 6 L56 9 L58 12 L44 9Z" fill="#C08070" opacity="0.78"/>
    <path d="M44 9 L32 8 L33 9 L32 10 L44 9Z" fill="#C08070" opacity="0.62"/>
    <ellipse cx="10" cy="65" rx="6"   ry="2.2" fill="#7A9268" opacity="0.45"/>
    <ellipse cx="62" cy="65" rx="5.5" ry="2"   fill="#1E4D3A" opacity="0.45"/>
  </svg>
);

const IconPastSecurity = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shield5" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7A9268"/>
        <stop offset="100%" stopColor="#1E4D3A"/>
      </linearGradient>
    </defs>
    <path d="M36 8 C36 8 12 15 12 28 L12 42 C12 56 22 64 36 68 C50 64 60 56 60 42 L60 28 C60 15 36 8 36 8Z" fill="url(#shield5)" opacity="0.88"/>
    <path d="M36 11 C36 11 15 17.5 15 28 L15 33" stroke="#E4D5B7" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" fill="none"/>
    <path d="M36 8 C36 8 12 15 12 28 L12 42 C12 56 22 64 36 68 C50 64 60 56 60 42 L60 28 C60 15 36 8 36 8Z" stroke="#7A9268" strokeWidth="1.2" fill="none" opacity="0.55"/>
    <path d="M20 38 L31 51 L52 24" stroke="#E4D5B7" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M20 38 L31 51 L52 24" stroke="#E4D5B7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.42"/>
    <circle cx="10" cy="22" r="2.2" fill="#C08070" opacity="0.42"/>
    <circle cx="62" cy="24" r="1.8" fill="#7A9268" opacity="0.42"/>
    <ellipse cx="22" cy="70" rx="7" ry="2.5" fill="#7A9268" opacity="0.45"/>
    <ellipse cx="50" cy="71" rx="6" ry="2.2" fill="#1E4D3A" opacity="0.45"/>
  </svg>
);

const IconAtTheGate = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pillar6" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E4D5B7" stopOpacity="0.92"/>
        <stop offset="100%" stopColor="#C08070" stopOpacity="0.6"/>
      </linearGradient>
    </defs>
    <rect x="6"  y="28" width="14" height="36" rx="7" fill="url(#pillar6)"/>
    <rect x="52" y="28" width="14" height="36" rx="7" fill="url(#pillar6)"/>
    <path d="M6 34 Q36 4 66 34" stroke="url(#pillar6)" strokeWidth="12" fill="none" strokeLinecap="round"/>
    <rect x="26" y="12" width="20" height="12" rx="3" fill="#1E4D3A" opacity="0.88"/>
    <text x="36" y="22" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="10" fill="#E4D5B7" opacity="0.92" fontStyle="italic">G</text>
    <circle cx="36" cy="44" r="5.5" fill="#E4D5B7" opacity="0.82"/>
    <path d="M31 50 Q36 62 41 50" stroke="#E4D5B7" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.75"/>
    <path d="M33 56 L30 64" stroke="#E4D5B7" strokeWidth="3" strokeLinecap="round" opacity="0.58"/>
    <path d="M39 56 L42 64" stroke="#E4D5B7" strokeWidth="3" strokeLinecap="round" opacity="0.58"/>
    <rect x="44" y="52" width="8" height="10" rx="2" fill="#C08070" opacity="0.78"/>
    <line x1="48" y1="50" x2="48" y2="52" stroke="#C08070" strokeWidth="2.2" strokeLinecap="round" opacity="0.75"/>
    <ellipse cx="8"  cy="66" rx="6"   ry="2.5" fill="#7A9268" opacity="0.45" transform="rotate(-8 8 66)"/>
    <ellipse cx="64" cy="66" rx="5.5" ry="2.2" fill="#1E4D3A" opacity="0.45"/>
  </svg>
);

const IconGetOnBoard = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="plane7" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#E4D5B7"/>
        <stop offset="100%" stopColor="#C8D8CC"/>
      </linearGradient>
    </defs>
    <path d="M4 60 Q18 48 34 38" stroke="#7A9268" strokeWidth="3"   fill="none" strokeLinecap="round" strokeDasharray="2 6" opacity="0.65"/>
    <path d="M4 66 Q20 54 34 43" stroke="#1E4D3A" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeDasharray="1.5 6" opacity="0.42"/>
    <path d="M34 38 C42 28 64 22 68 29 C72 36 56 48 34 44 Z" fill="url(#plane7)"/>
    <path d="M66 29 L74 29 L66 33 Z" fill="#E4D5B7" opacity="0.88"/>
    <path d="M46 42 L36 64 L54 48 Z" fill="#E4D5B7" opacity="0.72"/>
    <path d="M34 38 L26 22 L38 34 Z" fill="#C08070" opacity="0.88"/>
    <path d="M34 43 L26 56 L38 47 Z" fill="#E4D5B7" opacity="0.55"/>
    <circle cx="58" cy="30" r="2.8" fill="#1E4D3A" opacity="0.78"/>
    <circle cx="51" cy="33" r="2.8" fill="#1E4D3A" opacity="0.78"/>
    <circle cx="44" cy="35" r="2.8" fill="#1E4D3A" opacity="0.78"/>
    <path d="M2 64 Q14 60 24 64 Q34 68 44 64 Q54 60 70 64" stroke="#1E4D3A" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.45"/>
    <ellipse cx="10" cy="67" rx="9"   ry="3.2" fill="#7A9268" opacity="0.5"/>
    <ellipse cx="36" cy="70" rx="7"   ry="2.8" fill="#1E4D3A" opacity="0.45"/>
    <ellipse cx="58" cy="68" rx="5.5" ry="2.2" fill="#7A9268" opacity="0.4"/>
  </svg>
);

// ── Node definitions ───────────────────────────────────────────────────────
const NODES = [
  { id: 'wake',    Icon: IconRingRing,      label: 'Ring Ring',       sub: 'Alarm rings',       cardClass: 'card-1', isFirst: true  },
  { id: 'linger',  Icon: IconWakeyWakey,    label: 'Wakey Wakey',     sub: 'Rise & ease in',    cardClass: 'card-2', isFirst: false },
  { id: 'polish',  Icon: IconLeavingHome,   label: 'Leaving Home',    sub: 'Wash up & pack',    cardClass: 'card-3', isFirst: false },
  { id: 'rollout', Icon: IconTerminalEntry, label: 'Terminal Entry',  sub: 'Drive to airport',  cardClass: 'card-4', isFirst: false },
  { id: 'clear',   Icon: IconPastSecurity,  label: 'Cleared Security', sub: 'Security check',    cardClass: 'card-5', isFirst: false },
  { id: 'gate',    Icon: IconAtTheGate,     label: 'At the Gate',     sub: 'Walk to gate',      cardClass: 'card-6', isFirst: false },
  { id: 'board',   Icon: IconGetOnBoard,    label: 'Get On Board',    sub: 'Boarding begins',   cardClass: 'card-7', isFirst: false },
];

type DurKey = keyof Durations;

// ── Main Component ────────────────────────────────────────────────────────
export default function App() {
  const [flightNo, setFlightNo]         = useState('');
  const [submitted, setSubmitted]       = useState('');
  const [durations, setDurations]       = useState<Durations>(DEFAULT_DURATIONS);
  const [stamps, setStamps]             = useState<Record<string, string>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [revealed, setRevealed]         = useState(false);
  const [goShakeKey, setGoShakeKey]     = useState(0);
  const [userName, setUserName]         = useState(() => loadProfile().name);
  const [userAvatar, setUserAvatar]     = useState(() => loadProfile().avatar);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileEditName, setProfileEditName] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [flightDepStr, setFlightDepStr] = useState<string | null>(null);
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightDate, setFlightDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const datePickerTriggerRef = useRef<HTMLButtonElement>(null);
  const dateColumnRef = useRef<HTMLDivElement>(null);
  const avatarBlockRef = useRef<HTMLDivElement>(null);
  const [datePickerRect, setDatePickerRect] = useState<{ top: number; left: number; width: number; columnRight?: number; blockLeft?: number } | null>(null);

  // ── Restore last flight state for today ──────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(FLIGHT_STATE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        flightNo?: string;
        submitted?: string;
        flightDate?: string;
        stamps?: Record<string, string>;
      };
      if (!data.submitted || !data.flightDate) return;
      // 仅在航班当天恢复
      const now = new Date();
      const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (data.flightDate !== todayYmd) return;
      // 如果最后一个节点已打卡，则视为完成，不再恢复
      const done = data.stamps && data.stamps['board'];
      if (done) return;

      setFlightDate(data.flightDate);
      setFlightNo(data.flightNo || data.submitted);
      setSubmitted(data.submitted);
      setStamps(data.stamps ?? {});
      setRevealed(true);
      setFlightDepStr(mockDeparture(data.submitted));
    } catch {
      // ignore parse errors
    }
  }, []);

  // ── Persist current flight state ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!submitted) return;
    try {
      const payload = {
        flightNo,
        submitted,
        flightDate,
        stamps,
      };
      localStorage.setItem(FLIGHT_STATE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota errors
    }
  }, [flightNo, submitted, flightDate, stamps]);
  useEffect(() => {
    if (!datePickerOpen) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (datePickerRef.current?.contains(target) || datePickerTriggerRef.current?.contains(target)) return;
      setDatePickerOpen(false);
    };
    document.addEventListener('click', close, true);
    return () => {
      document.removeEventListener('click', close, true);
      setDatePickerRect(null);
    };
  }, [datePickerOpen]);

  useEffect(() => {
    saveProfile(userName, userAvatar);
  }, [userName, userAvatar]);

  const openProfileEdit = () => {
    setProfileEditName(userName);
    setProfileEditOpen(true);
  };
  const saveProfileEdit = () => {
    const name = profileEditName.trim() || 'Suzi';
    setUserName(name);
    setProfileEditOpen(false);
  };
  const onAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const max = 400;
        let w = img.width;
        let h = img.height;
        if (w > max || h > max) {
          if (w > h) {
            h = Math.round((h * max) / w);
            w = max;
          } else {
            w = Math.round((w * max) / h);
            h = max;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setUserAvatar(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        setUserAvatar(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => setUserAvatar(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const depStr   = submitted ? (flightDepStr ?? mockDeparture(submitted)) : null;
  const times    = depStr   ? calcTimes(depStr, durations) : null;
  const alarmStr = times    ? toStr(times.wake) : null;

  const submit = () => {
    const val = flightNo.trim().toUpperCase();
    if (!val) return;
    playGoSound();
    setGoShakeKey(k => k + 1);
    setSubmitted(val);
    setRevealed(false);
    setTimeout(() => setRevealed(true), 80);
    setStamps({});
    const mock = mockDeparture(val);
    setFlightDepStr(mock);
    setFlightLoading(true);
    fetch(`/api/flight?flightNo=${encodeURIComponent(val)}&flight_date=${encodeURIComponent(flightDate)}`)
      .then((r) => r.json())
      .then((json: { data?: Array<{ departure?: { scheduled?: string } }> }) => {
        const scheduled = json?.data?.[0]?.departure?.scheduled;
        if (scheduled && typeof scheduled === 'string') {
          const d = new Date(scheduled);
          if (!Number.isNaN(d.getTime())) {
            const h = d.getHours();
            const m = d.getMinutes();
            setFlightDepStr(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
          } else {
            const match = scheduled.match(/T(\d{2}):(\d{2})/);
            if (match) setFlightDepStr(`${match[1]}:${match[2]}`);
          }
        }
      })
      .catch(() => {})
      .finally(() => setFlightLoading(false));
  };

  const stampNow = (id: string) => {
    setStamps(prev => ({ ...prev, [id]: nowStr() }));
  };

  const clearStamp = (id: string) => {
    setStamps(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const getDiff = (id: string) => {
    if (!times || !stamps[id]) return null;
    const diff = toMin(stamps[id]) - times[id];
    if (Math.abs(diff) < 2) return { label: 'on time', color: C.moss };
    if (diff > 0)            return { label: `+${diff}m`, color: C.rosy };
    return                          { label: `${diff}m`,  color: C.dark };
  };

  // ── Progress bar data ──────────────────────────────────────────────────
  const getProgressData = (nodeId: string) => {
    if (!times || !stamps[nodeId]) return null;
    const wakeMin  = times.wake;
    const boardMin = times.board;
    const span = boardMin - wakeMin;
    if (span <= 0) return null;
    const expectedMin = times[nodeId];
    const rawActual   = toMin(stamps[nodeId]);
    // Handle midnight wrap
    const actualMin = rawActual < wakeMin - 60 ? rawActual + 1440 : rawActual;
    const ePct = Math.max(0, Math.min(100, (expectedMin - wakeMin) / span * 100));
    const aPct = Math.max(0, Math.min(100, (actualMin   - wakeMin) / span * 100));
    return { ePct, aPct, isEarly: aPct <= ePct };
  };

  const adjustDuration = (key: DurKey, delta: number) => {
    setDurations(prev => ({ ...prev, [key]: Math.max(5, Math.min(120, prev[key] + delta)) }));
  };

  return (
    <div
      className="chrono-bg"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        background: '#060F0F',
        paddingTop: 'max(8px, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
        touchAction: 'none',
        overscrollBehavior: 'none',
      }}
    >
      {/* ── Phone frame ── */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        height: '100%',
        maxHeight: 900,
        marginInline: 8,
        position: 'relative', overflow: 'hidden',
        borderRadius: 44,
        boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.07), inset 0 0 0 1px rgba(255,255,255,0.04)',
        background: [
          'radial-gradient(ellipse 90% 55% at 15% 8%,  rgba(30,77,58,0.65) 0%, transparent 55%)',
          'radial-gradient(ellipse 70% 45% at 85% 22%, rgba(122,146,104,0.15) 0%, transparent 55%)',
          'radial-gradient(ellipse 80% 55% at 40% 90%, rgba(13,43,43,0.9) 0%, transparent 60%)',
          '#0D2B2B',
        ].join(', '),
        fontFamily: "'Jost', system-ui, -apple-system, sans-serif",
      }}>
        {/* 颗粒磨砂层（手机内） */}
        <div className="chrono-phone-grain" aria-hidden />
        {/* 莫奈笔触：手机内柔色块 */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, borderRadius: 'inherit',
          background: [
            'radial-gradient(ellipse 55% 45% at 10% 12%, rgba(122,146,104,0.08) 0%, transparent 50%)',
            'radial-gradient(ellipse 45% 50% at 88% 18%, rgba(228,213,183,0.05) 0%, transparent 45%)',
            'radial-gradient(ellipse 60% 50% at 35% 92%, rgba(30,77,58,0.12) 0%, transparent 50%)',
          ].join(', '),
          mixBlendMode: 'soft-light',
          pointerEvents: 'none',
        }} aria-hidden />
        {/* Ambient blobs */}
        <div style={{ position:'absolute', top:-20, left:-30, width:200, height:200, borderRadius:'50%', background:'rgba(122,146,104,0.08)', filter:'blur(50px)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:200, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(192,128,112,0.06)', filter:'blur(40px)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:60, left:10, width:200, height:200, borderRadius:'50%', background:'rgba(30,77,58,0.25)', filter:'blur(55px)', pointerEvents:'none' }}/>

        {/* ── Main content ── */}
        <div style={{
          position:'relative', zIndex:1,
          height:'100%', boxSizing:'border-box',
          display:'flex', flexDirection:'column',
          padding:'50px 16px 18px',
          gap:7,
        }}>

          {/* ── Header ── */}
          <div style={{ textAlign:'center', flexShrink:0, marginBottom:10 }}>
            <div style={{
              fontFamily:'"Cormorant Garamond", Georgia, serif',
              fontStyle:'italic', fontWeight:300,
              fontSize:26, color:C.beige,
              letterSpacing:'0.08em', lineHeight:1.05,
            }}>{userName}, Décollage</div>
          </div>

          {/* ── Flight input ── */}
          <input
            type="file"
            ref={avatarInputRef}
            accept="image/*"
            onChange={onAvatarFile}
            style={{ display: 'none' }}
            aria-hidden
          />
          <div
            ref={avatarBlockRef}
            style={{
            flexShrink:0,
            background:'rgba(228,213,183,0.06)',
            backdropFilter:'blur(14px)',
            border:'1px solid rgba(228,213,183,0.13)',
            borderRadius:16,
            padding:'8px 14px',
            display:'flex', alignItems:'center', gap:10,
          }}>
            <button
              type="button"
              onClick={openProfileEdit}
              style={{
                width:32, height:32, flexShrink:0,
                borderRadius:'50%',
                border:'1px solid rgba(228,213,183,0.12)',
                background: 'transparent',
                overflow:'hidden',
                padding:0,
                cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}
              aria-label="Edit profile"
            >
              <img
                src={userAvatar || DEFAULT_AVATAR_URL}
                alt=""
                style={{
                  width:'100%', height:'100%', objectFit:'cover',
                }}
              />
            </button>
            <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'stretch', gap:12 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:2, position:'relative' }} ref={dateColumnRef}>
                <div style={{ fontSize:8, color:C.moss, letterSpacing:'0.2em', textTransform:'uppercase' }}>Date</div>
                <button
                  ref={datePickerTriggerRef}
                  type="button"
                  onClick={() => {
                    if (!datePickerOpen && datePickerTriggerRef.current && avatarBlockRef.current) {
                      const r = datePickerTriggerRef.current.getBoundingClientRect();
                      const blockLeft = avatarBlockRef.current.getBoundingClientRect().left;
                      setDatePickerRect({ left: r.left, top: r.bottom + 4, width: r.width, blockLeft });
                    }
                    setDatePickerOpen(o => !o);
                  }}
                  style={{
                    background:'rgba(228,213,183,0.06)', border:'1px solid rgba(228,213,183,0.15)',
                    borderRadius:8, padding:'4px 8px', height:28, boxSizing:'border-box',
                    color:C.beige, fontSize:12, fontFamily:"'Jost', sans-serif", minWidth:0,
                    display:'flex', alignItems:'center', gap:4, cursor:'pointer', width:'100%',
                  }}
                >
                  <CalendarIcon size={12} style={{ opacity:0.7 }} />
                  {format(parseFlightDate(flightDate), 'MMM d, yyyy', { locale: enUS })}
                </button>
                {datePickerOpen && datePickerRect && (() => {
                  const popoverW = 284;
                  const popoverH = 360;
                  const pad = 8;
                  let left = datePickerRect.blockLeft ?? datePickerRect.left;
                  let top = datePickerRect.top;
                  left = Math.max(pad, Math.min(left, window.innerWidth - popoverW - pad));
                  top = Math.max(pad, Math.min(top, window.innerHeight - popoverH - pad));
                  return createPortal(
                  <div
                    ref={datePickerRef}
                    style={{
                      position:'fixed',
                      left,
                      top,
                      zIndex:9999,
                      width:popoverW,
                      maxHeight:`calc(100vh - ${pad * 2}px)`,
                      overflow:'auto',
                      background:'#152A2A',
                      border:'1px solid rgba(228,213,183,0.14)',
                      borderRadius:12, padding:16, boxShadow:'0 12px 32px rgba(0,0,0,0.4)',
                      fontFamily:"'Jost', system-ui, sans-serif",
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <DayPicker
                      mode="single"
                      selected={parseFlightDate(flightDate)}
                      onSelect={(d) => {
                        if (d) setFlightDate(format(d, 'yyyy-MM-dd'));
                        setDatePickerOpen(false);
                      }}
                      locale={enUS}
                      captionLayout="buttons"
                      components={{ Caption: ChronoCaption }}
                      formatters={{
                        formatWeekdayName: (date) => format(date, 'EEE', { locale: enUS }),
                      }}
                      styles={{
                        root: { margin:0, fontFamily:"'Jost', system-ui, sans-serif", width:252 },
                        caption_label: { color:C.beige, fontSize:15 },
                        head_cell: { color:C.moss, fontSize:11, letterSpacing:'0.06em', width:36 },
                        day: { color:C.beige, fontSize:13, width:36, height:36 },
                      }}
                      modifiersStyles={{
                        selected: { background:'rgba(192,128,112,0.35)', color:C.beige },
                        today: { color:C.moss, fontWeight:600 },
                      }}
                    />
                  </div>,
                  document.body
                );
                })()}
              </div>
              <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:2 }}>
                <div style={{ fontSize:8, color:C.moss, letterSpacing:'0.2em', textTransform:'uppercase' }}>Flight No.</div>
                <div style={{
                  background:'rgba(228,213,183,0.06)', border:'1px solid rgba(228,213,183,0.15)',
                  borderRadius:8, padding:'4px 8px', height:28, boxSizing:'border-box',
                  display:'flex', alignItems:'center',
                }}>
                  <input
                    type="text"
                    value={flightNo}
                    onChange={e => setFlightNo(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    placeholder="e.g. MU5129"
                    style={{
                      background:'transparent', border:'none', outline:'none',
                      color:C.beige, fontSize:14, width:'100%', padding:0,
                      fontFamily:'"Cormorant Garamond", Georgia, serif',
                      letterSpacing:'0.04em', fontStyle:'italic',
                    }}
                  />
                </div>
              </div>
            </div>
            <motion.button
              key={goShakeKey}
              onClick={submit}
              initial={{ x: 0 }}
              animate={{ x: goShakeKey > 0 ? [0, -2, 2, -1, 1, 0] : 0 }}
              transition={{ duration: 0.2 }}
              style={{
                background:'rgba(192,128,112,0.2)',
                border:'1px solid rgba(192,128,112,0.38)',
                borderRadius:9, padding:'5px 14px',
                color:C.rosy,
                fontSize:9, letterSpacing:'0.16em',
                cursor:'pointer', fontFamily:"'Jost', sans-serif", fontWeight:500,
              }}
            >GO</motion.button>
          </div>

          {/* ── Wake Alarm Hero ── */}
          <motion.div style={{
            flexShrink:0,
            background:'linear-gradient(135deg, rgba(30,77,58,0.55) 0%, rgba(228,213,183,0.06) 100%)',
            backdropFilter:'blur(16px)',
            border:'1px solid rgba(228,213,183,0.14)',
            borderRadius:20,
            padding:'10px 20px 10px',
            textAlign:'center',
            position:'relative', overflow:'hidden',
          }}>
            {/* 闹钟区装饰：左侧 Twin Pads，右侧 Rising Bud，中间少许 Floating Petals */}
            <div style={{ position:'absolute', inset:0, pointerEvents:'none', borderRadius:20, overflow:'hidden' }} aria-hidden>
              {/* 左侧：Twin Pads */}
              <svg width="100" height="70" viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position:'absolute', left:-8, bottom:-5, opacity:0.42 }}>
                <defs>
                  <radialGradient id="alarm-padL-a" cx="42%" cy="38%" r="62%"><stop offset="0%" stopColor="#7A9268"/><stop offset="100%" stopColor="#0D2B2B"/></radialGradient>
                  <radialGradient id="alarm-padL-b" cx="48%" cy="42%" r="58%"><stop offset="0%" stopColor="#1E4D3A"/><stop offset="100%" stopColor="#0D2B2B"/></radialGradient>
                  <radialGradient id="alarm-budL" cx="50%" cy="35%" r="55%"><stop offset="0%" stopColor="#E4D5B7"/><stop offset="100%" stopColor="#C08070" stopOpacity="0.5"/></radialGradient>
                </defs>
                <ellipse cx="80" cy="75" rx="70" ry="20" fill="#1E4D3A" opacity="0.2"/>
                <ellipse cx="95" cy="62" rx="36" ry="18" fill="url(#alarm-padL-b)" opacity="0.85" transform="rotate(-8 95 62)"/>
                <path d="M95 44 L95 62" stroke="#0D2B2B" strokeWidth="1.2" opacity="0.4"/>
                <ellipse cx="58" cy="68" rx="44" ry="22" fill="url(#alarm-padL-a)" opacity="0.9" transform="rotate(5 58 68)"/>
                <path d="M58 46 L58 68" stroke="#0D2B2B" strokeWidth="1.5" opacity="0.45"/>
                <path d="M58 68 Q38 60 20 63" stroke="#7A9268" strokeWidth="0.8" fill="none" opacity="0.5"/>
                <path d="M58 68 Q78 60 96 63" stroke="#7A9268" strokeWidth="0.8" fill="none" opacity="0.5"/>
                <path d="M95 44 Q98 36 95 30" stroke="#1E4D3A" strokeWidth="1.2" strokeLinecap="round" opacity="0.55"/>
                <ellipse cx="95" cy="28" rx="5" ry="8" fill="url(#alarm-budL)" opacity="0.85" transform="rotate(10 95 28)"/>
                <path d="M58 46 Q60 38 58 32" stroke="#1E4D3A" strokeWidth="1.5" strokeLinecap="round" opacity="0.55"/>
                <ellipse cx="58" cy="24" rx="6" ry="10" fill="#E4D5B7" opacity="0.8" transform="rotate(0 58 24)"/>
                <ellipse cx="58" cy="24" rx="6" ry="10" fill="#C08070" opacity="0.6" transform="rotate(40 58 32)"/>
                <ellipse cx="58" cy="24" rx="6" ry="10" fill="#C08070" opacity="0.6" transform="rotate(-40 58 32)"/>
                <circle cx="58" cy="30" r="4.5" fill="#D4A860" opacity="0.85"/><circle cx="58" cy="30" r="2.5" fill="#E4D5B7" opacity="0.65"/>
              </svg>
              {/* 右侧：Rising Bud（竖茎 + 花蕾） */}
              <svg width="56" height="75" viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position:'absolute', right:4, bottom:-2, opacity:0.38 }}>
                <defs>
                  <radialGradient id="alarm-padR" cx="44%" cy="40%" r="60%"><stop offset="0%" stopColor="#7A9268"/><stop offset="100%" stopColor="#1E4D3A"/></radialGradient>
                  <linearGradient id="alarm-stemR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1E4D3A"/><stop offset="100%" stopColor="#7A9268"/></linearGradient>
                </defs>
                <ellipse cx="40" cy="88" rx="30" ry="10" fill="#1E4D3A" opacity="0.25"/>
                <ellipse cx="40" cy="84" rx="28" ry="14" fill="url(#alarm-padR)" opacity="0.88"/>
                <path d="M40 70 L40 84" stroke="#0D2B2B" strokeWidth="1.2" opacity="0.4"/>
                <path d="M40 84 Q26 78 14 80" stroke="#7A9268" strokeWidth="0.7" fill="none" opacity="0.45"/>
                <path d="M40 84 Q54 78 66 80" stroke="#7A9268" strokeWidth="0.7" fill="none" opacity="0.45"/>
                <path d="M40 84 Q43 65 40 18" stroke="url(#alarm-stemR)" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
                <ellipse cx="40" cy="16" rx="8" ry="14" fill="#C08070" opacity="0.78"/>
                <ellipse cx="40" cy="16" rx="5" ry="11" fill="#E4D5B7" opacity="0.72"/>
                <ellipse cx="40" cy="16" rx="3" ry="8" fill="#E4D5B7" opacity="0.85"/>
                <path d="M34 22 Q32 28 36 30" stroke="#1E4D3A" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.55"/>
                <path d="M46 22 Q48 28 44 30" stroke="#1E4D3A" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.55"/>
              </svg>
              {/* 中间：少量 Floating Petals 点缀（不挡文字） */}
              <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ position:'absolute', left:0, top:0, opacity:0.28 }}>
                <defs>
                  <radialGradient id="alarm-petalA" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#E4D5B7"/><stop offset="100%" stopColor="#C08070" stopOpacity="0.5"/></radialGradient>
                  <radialGradient id="alarm-petalB" cx="45%" cy="38%" r="58%"><stop offset="0%" stopColor="#C08070"/><stop offset="100%" stopColor="#9A6050" stopOpacity="0.4"/></radialGradient>
                </defs>
                <ellipse cx="22" cy="28" rx="6" ry="3.5" fill="url(#alarm-petalA)" transform="rotate(-25 22 28)"/>
                <ellipse cx="78" cy="22" rx="5" ry="3" fill="url(#alarm-petalB)" transform="rotate(15 78 22)"/>
                <ellipse cx="82" cy="72" rx="5.5" ry="3" fill="url(#alarm-petalA)" transform="rotate(35 82 72)"/>
                <ellipse cx="18" cy="78" rx="4" ry="2.5" fill="url(#alarm-petalB)" transform="rotate(-12 18 78)"/>
              </svg>
            </div>
            {/* radial glow */}
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 65% 55% at 50% 60%, rgba(192,128,112,0.1), transparent)', pointerEvents:'none' }}/>

            <AnimatePresence mode="wait">
              {alarmStr ? (
                /* ── Active: flight entered ── */
                <motion.div
                  key="active"
                  initial={{ opacity:0, scale:0.9, filter:'blur(8px)' }}
                  animate={{ opacity:1, scale:1,   filter:'blur(0px)' }}
                  exit={{    opacity:0, scale:1.05, filter:'blur(4px)' }}
                  transition={{ duration:0.55, ease:[0.22,1,0.36,1] }}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}
                >
                  {/* label: set alarm text */}
                  <div style={{
                    fontSize:10,
                    color:C.moss,
                    letterSpacing:'0.16em',
                    textTransform:'uppercase',
                    marginBottom:0,
                  }}>
                    set your alarm to this time
                  </div>

                  {/* big time */}
                  <div style={{
                    fontFamily:'"Cormorant Garamond", Georgia, serif',
                    fontSize:56, color:C.beige, lineHeight:1,
                    letterSpacing:'-0.01em',
                    marginTop:0,
                    marginBottom:8,
                  }}>{alarmStr}</div>

                  {/* flight badge */}
                  <div style={{
                    display:'inline-flex', alignItems:'center', gap:6,
                    marginTop:2,
                    background:'rgba(192,128,112,0.12)',
                    border:'1px solid rgba(192,128,112,0.28)',
                    borderRadius:20, padding:'3px 12px',
                  }}>
                    <span style={{ fontSize:9, color:C.rosy, letterSpacing:'0.1em' }}>
                      {submitted}
                    </span>
                    <span style={{ width:3, height:3, borderRadius:'50%', background:'rgba(192,128,112,0.45)', display:'inline-block' }}/>
                    <span style={{ fontSize:9, color:'rgba(192,128,112,0.7)', letterSpacing:'0.06em' }}>
                      departs {depStr}{flightLoading ? ' …' : ''}
                    </span>
                  </div>
                </motion.div>
              ) : (
                /* ── Empty: no flight yet ── */
                <motion.div
                  key="empty"
                  initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  transition={{ duration:0.3 }}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}
                >
                  {/* Faded large bell icon as visual cue */}
                  <div style={{ opacity:0.22 }}>
                    <svg width="40" height="40" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <radialGradient id="bell_ph" cx="36%" cy="28%" r="68%">
                          <stop offset="0%"   stopColor="#E4D5B7"/>
                          <stop offset="50%"  stopColor="#CEBF9E"/>
                          <stop offset="100%" stopColor="#A89070"/>
                        </radialGradient>
                      </defs>
                      <path d="M36 12 C24 12 18 22 18 32 L18 46 Q18 50 22 50 L50 50 Q54 50 54 46 L54 32 C54 22 48 12 36 12Z" fill="url(#bell_ph)"/>
                      <circle cx="36" cy="54" r="4.5" fill="#C08070"/>
                      <path d="M30 12 Q36 6 42 12" stroke="#A89070" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8"/>
                      <circle cx="36" cy="10" r="2.8" fill="#CEBF9E" opacity="0.75"/>
                      <path d="M10 28 Q6 36 10 44"  stroke="#C08070" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.75"/>
                      <path d="M62 28 Q66 36 62 44" stroke="#C08070" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.75"/>
                    </svg>
                  </div>

                  {/* placeholder time */}
                  <div style={{
                    fontFamily:'"Cormorant Garamond", Georgia, serif',
                    fontSize:46, color:'rgba(228,213,183,0.12)', lineHeight:1,
                    letterSpacing:'-0.01em',
                  }}>--:--</div>

                  {/* guiding hint */}
                  <div style={{
                    fontSize:10, color:'rgba(122,146,104,0.55)',
                    letterSpacing:'0.06em', lineHeight:1.5,
                  }}>
                    enter your flight number<br/>
                    <span style={{ opacity:0.7 }}>to see your wake alarm</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Timeline ── */}
          <div style={{
            flex:1, minHeight:0,
            background:'rgba(228,213,183,0.03)',
            backdropFilter:'blur(8px)',
            border:'1px solid rgba(228,213,183,0.08)',
            borderRadius:18,
            padding:'8px 10px 6px',
            display:'flex', flexDirection:'column',
          }}>
            <div style={{
              display:'flex',
              alignItems:'center',
              justifyContent:'space-between',
              marginBottom:6,
              paddingInline:2,
            }}>
              <div style={{
                fontSize:11,
                color:C.moss,
                letterSpacing:'0.22em',
                textTransform:'uppercase',
              }}>
                The Journey
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                style={{
                  display:'inline-flex',
                  alignItems:'center',
                  gap:4,
                  padding:'4px 10px',
                  borderRadius:999,
                  border:'1px solid rgba(228,213,183,0.09)',
                  background:'rgba(10,20,20,0.35)',
                  color:'rgba(228,213,183,0.82)',
                  fontSize:9,
                  letterSpacing:'0.16em',
                  textTransform:'uppercase',
                  fontFamily: "'Jost', sans-serif",
                  cursor:'pointer',
                }}
              >
                <Settings size={11} strokeWidth={1.5}/>
                MY RITUAL
              </button>
            </div>

            <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
              {NODES.map((node, index) => {
                const time    = times?.[node.id];
                const diff    = getDiff(node.id);
                const stamped = stamps[node.id];
                const isFirst = node.isFirst;
                const isLast  = index === NODES.length - 1;
                const { Icon } = node;
                const progress = getProgressData(node.id);

                return (
                  <div key={node.id}>
                    <motion.div
                      initial={revealed ? { opacity:0, x:-10 } : false}
                      animate={revealed ? { opacity:1,  x:0  } : {}}
                      transition={{ delay: index * 0.055, duration:0.38, ease:[0.22,1,0.36,1] }}
                      style={{ display:'flex', alignItems:'center', gap:7 }}
                    >
                      {/* Custom icon — scaled down */}
                      <div style={{
                        width:26, height:26, flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        overflow:'hidden',
                      }}>
                        <div style={{ transform:'scale(0.78)', transformOrigin:'center', flexShrink:0 }}>
                          <Icon />
                        </div>
                      </div>

                      {/* Label */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{
                          fontSize:13, color: isFirst ? C.rosy : C.beige,
                          letterSpacing:'0.02em', lineHeight:1.1,
                          fontFamily:'"Cormorant Garamond", Georgia, serif',
                          fontStyle: isFirst ? 'italic' : 'normal',
                          fontWeight: isFirst ? 400 : 300,
                        }}>
                          {node.label}
                        </div>

                        {/* Stamp row */}
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                          {stamped ? (
                            <>
                              <span style={{
                                fontSize:12, color: C.moss,
                                fontFamily:'"Cormorant Garamond", serif',
                                letterSpacing:'0.04em',
                              }}>
                                {stamped}
                              </span>
                              {diff && (
                                <span style={{
                                  fontSize:10,
                                  color: '#0B1515',
                                  letterSpacing:'0.08em',
                                  background: diff.color === C.moss
                                    ? 'rgba(122,146,104,0.28)'
                                    : diff.color === C.rosy
                                      ? 'rgba(192,128,112,0.32)'
                                      : 'rgba(30,77,58,0.4)',
                                  borderRadius:20, padding:'1px 6px',
                                }}>
                                  {diff.label}
                                </span>
                              )}
                              <button
                                onClick={() => clearStamp(node.id)}
                                style={{
                                  background:'none', border:'none', padding:0,
                                  color:'rgba(228,213,183,0.22)', cursor:'pointer',
                                  display:'flex', alignItems:'center',
                                  fontSize:11, lineHeight:1,
                                }}
                              >×</button>
                            </>
                          ) : (
                            <button
                              onClick={() => { playNowSound(); stampNow(node.id); }}
                              style={{
                                background:'transparent',
                                border:'1px solid rgba(192,128,112,0.28)',
                                borderRadius:20,
                                padding:'1px 14px',
                                color:'rgba(192,128,112,0.65)',
                                fontSize:9,
                                cursor:'pointer',
                                letterSpacing:'0.08em',
                                fontFamily:'"Cormorant Garamond", Georgia, serif',
                                fontStyle:'italic',
                                marginTop:3,
                              }}
                            >
                              now
                            </button>
                          )}
                        </div>

                        {/* ── Progress bar (shown after stamp) ── */}
                        {progress && (
                          <motion.div
                            initial={{ opacity:0, scaleX:0.8 }}
                            animate={{ opacity:1, scaleX:1 }}
                            transition={{ duration:0.4, ease:[0.22,1,0.36,1] }}
                            style={{ marginTop:5, position:'relative', height:4, borderRadius:2, background:'rgba(228,213,183,0.07)', transformOrigin:'left' }}
                          >
                            {/* Fill to actual */}
                            <div style={{
                              position:'absolute', left:0, top:0, bottom:0,
                              width:`${progress.aPct}%`,
                              borderRadius:2,
                              background: progress.isEarly
                                ? 'linear-gradient(to right, rgba(122,146,104,0.25), rgba(122,146,104,0.55))'
                                : 'linear-gradient(to right, rgba(192,128,112,0.25), rgba(192,128,112,0.55))',
                            }}/>
                            {/* Expected marker (white tick) */}
                            <div style={{
                              position:'absolute', top:-1, bottom:-1,
                              left:`${progress.ePct}%`,
                              width:1.5, borderRadius:1,
                              background:'rgba(228,213,183,0.55)',
                              transform:'translateX(-50%)',
                            }}/>
                            {/* Actual dot */}
                            <div style={{
                              position:'absolute', top:'50%',
                              left:`${progress.aPct}%`,
                              width:7, height:7, borderRadius:'50%',
                              background: progress.isEarly ? C.moss : C.rosy,
                              transform:'translate(-50%, -50%)',
                              boxShadow:`0 0 5px ${progress.isEarly ? 'rgba(122,146,104,0.7)' : 'rgba(192,128,112,0.7)'}`,
                            }}/>
                            {/* Start cap */}
                            <div style={{ position:'absolute', left:0, top:'50%', width:3, height:3, borderRadius:'50%', background:'rgba(228,213,183,0.22)', transform:'translateY(-50%)' }}/>
                            {/* End cap */}
                            <div style={{ position:'absolute', right:0, top:'50%', width:3, height:3, borderRadius:'50%', background:'rgba(228,213,183,0.22)', transform:'translateY(-50%)' }}/>
                          </motion.div>
                        )}
                      </div>

                      {/* Calculated time */}
                      <div style={{ flexShrink:0 }}>
                        {time !== undefined ? (
                          <span style={{
                            fontFamily:'"Cormorant Garamond", Georgia, serif',
                            fontSize:18,
                            color: isFirst ? C.rosy : C.beige,
                            letterSpacing:'0.01em',
                          }}>
                            {toStr(time)}
                          </span>
                        ) : (
                          <span style={{
                            fontFamily:'"Cormorant Garamond", Georgia, serif',
                            fontSize:18,
                            color:'rgba(228,213,183,0.12)',
                          }}>--:--</span>
                        )}
                      </div>
                    </motion.div>

                    {/* Lily-pad connector */}
                    {!isLast && (
                      <div style={{ display:'flex', alignItems:'center', height:8, marginLeft:13 }}>
                        <div style={{
                          width:1, height:'100%',
                          background:'linear-gradient(to bottom, rgba(122,146,104,0.3), rgba(122,146,104,0.08))',
                        }}/>
                        <div style={{
                          width:4, height:4, borderRadius:'50%',
                          background:'rgba(122,146,104,0.22)',
                          marginLeft:4, alignSelf:'center',
                        }}/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Settings button 已移至 The Journey 标题行右侧，这里留空以腾出更大可视区域 */}
        </div>

        {/* ── Settings Drawer ── */}
        <AnimatePresence>
          {settingsOpen && (
            <>
              <motion.div
                key="scrim"
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                onClick={() => setSettingsOpen(false)}
                style={{
                  position:'absolute', inset:0, zIndex:9,
                  background:'rgba(5,15,15,0.6)', backdropFilter:'blur(4px)',
                }}
              />
              <motion.div
                key="drawer"
                initial={{ y:'100%' }}
                animate={{ y:0 }}
                exit={{ y:'100%' }}
                transition={{ type:'spring', damping:28, stiffness:300 }}
                style={{
                  position:'absolute', bottom:0, left:0, right:0, zIndex:10,
                  borderRadius:'24px 24px 0 0',
                  background:[
                    'radial-gradient(ellipse 80% 45% at 20% 0%, rgba(30,77,58,0.85) 0%, transparent 60%)',
                    '#152A2A',
                  ].join(', '),
                  border:'1px solid rgba(228,213,183,0.12)',
                  borderBottom:'none',
                  padding:'16px 20px 40px',
                }}
              >
                {/* Handle */}
                <div style={{ width:36, height:4, borderRadius:2, background:'rgba(228,213,183,0.18)', margin:'0 auto 14px' }}/>

                {/* Header */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                  <div>
                    <div style={{
                      fontFamily:'"Cormorant Garamond", Georgia, serif',
                      fontStyle:'italic', fontWeight:300,
                      fontSize:22, color:C.beige, lineHeight:1.1,
                    }}>MY RITUAL</div>
                    <div style={{ fontSize:10, color:C.moss, letterSpacing:'0.12em', marginTop:3 }}>your defaults, your pace.</div>
                  </div>
                  <button
                    onClick={() => setSettingsOpen(false)}
                    style={{
                      background:'rgba(228,213,183,0.07)',
                      border:'1px solid rgba(228,213,183,0.11)',
                      borderRadius:'50%', width:30, height:30,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor:'pointer', color:C.beige, flexShrink:0,
                    }}
                  ><X size={14}/></button>
                </div>

                {/* Duration rows */}
                {(
                  [
                    { key:'linger',  Icon:IconWakeyWakey,    label:'Wakey Wakey',    sub:'rise & ease in'   },
                    { key:'polish',  Icon:IconLeavingHome,    label:'Leaving Home',   sub:'wash up & pack'   },
                    { key:'rollout', Icon:IconTerminalEntry,  label:'Terminal Entry', sub:'drive to airport' },
                    { key:'clear',   Icon:IconPastSecurity,   label:'Cleared Security', sub:'security check'   },
                    { key:'gate',    Icon:IconAtTheGate,      label:'At the Gate',    sub:'walk to gate'     },
                    { key:'board',   Icon:IconGetOnBoard,     label:'Get On Board',   sub:'before departure' },
                  ] as const
                ).map((item, i) => (
                  <div
                    key={item.key}
                    style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'9px 0',
                      borderBottom: i < 5 ? '1px solid rgba(228,213,183,0.06)' : 'none',
                    }}
                  >
                    <div style={{
                      width:30, height:30, flexShrink:0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <item.Icon />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontSize:12, color:'rgba(228,213,183,0.85)', lineHeight:1.2,
                        fontFamily:'"Cormorant Garamond", serif', fontStyle:'italic',
                      }}>{item.label}</div>
                      <div style={{ fontSize:9, color:'rgba(122,146,104,0.75)', letterSpacing:'0.07em' }}>{item.sub}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <button
                        onClick={() => adjustDuration(item.key as DurKey, -5)}
                        style={{
                          background:'rgba(228,213,183,0.07)',
                          border:'1px solid rgba(228,213,183,0.1)',
                          borderRadius:7, width:26, height:26,
                          color:C.beige, cursor:'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:18, lineHeight:1, paddingBottom:1,
                        }}
                      >−</button>
                      <span style={{
                        fontFamily:'"Cormorant Garamond", Georgia, serif',
                        fontSize:16, color:C.rosy, minWidth:38, textAlign:'center',
                      }}>
                        {durations[item.key as DurKey]}m
                      </span>
                      <button
                        onClick={() => adjustDuration(item.key as DurKey, +5)}
                        style={{
                          background:'rgba(228,213,183,0.07)',
                          border:'1px solid rgba(228,213,183,0.1)',
                          borderRadius:7, width:26, height:26,
                          color:C.beige, cursor:'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:18, lineHeight:1, paddingBottom:1,
                        }}
                      >+</button>
                    </div>
                  </div>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── 头像/名称编辑弹层 ── */}
        <AnimatePresence>
          {profileEditOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setProfileEditOpen(false)}
                style={{
                  position: 'absolute', inset: 0, zIndex: 11,
                  background: 'rgba(5,15,15,0.6)', backdropFilter: 'blur(4px)',
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                style={{
                  position: 'absolute', left: 20, right: 20, top: '50%',
                  transform: 'translateY(-50%)', zIndex: 12,
                  background: 'linear-gradient(180deg, rgba(21,42,42,0.98) 0%, rgba(13,43,43,0.98) 100%)',
                  border: '1px solid rgba(228,213,183,0.14)',
                  borderRadius: 20,
                  padding: '20px 20px 24px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 18, color: C.beige, fontStyle: 'italic' }}>EDIT PROFILE</span>
                  <button
                    type="button"
                    onClick={() => setProfileEditOpen(false)}
                    style={{
                      background: 'rgba(228,213,183,0.08)', border: '1px solid rgba(228,213,183,0.12)',
                      borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: C.beige,
                    }}
                  ><X size={14} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    style={{
                      width: 72, height: 72, borderRadius: '50%',
                      border: '1px solid rgba(228,213,183,0.2)',
                      background: 'rgba(30,77,58,0.3)',
                      overflow: 'hidden', padding: 0, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <img src={userAvatar || DEFAULT_AVATAR_URL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                  <span style={{ fontSize: 7.5, color: C.moss, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Tap avatar to upload from gallery</span>
                  <div style={{ width: '100%' }}>
                    <label style={{ fontSize: 7.5, color: C.moss, letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Name (shown in title)</label>
                    <input
                      type="text"
                      value={profileEditName}
                      onChange={e => setProfileEditName(e.target.value)}
                      placeholder="Suzi"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(228,213,183,0.06)', border: '1px solid rgba(228,213,183,0.18)',
                        borderRadius: 10, padding: '10px 12px',
                        color: C.beige, fontSize: 14, fontFamily: '"Cormorant Garamond", serif',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={saveProfileEdit}
                    style={{
                      width: '100%', padding: '10px',
                      background: 'rgba(192,128,112,0.25)', border: '1px solid rgba(192,128,112,0.4)',
                      borderRadius: 10, color: C.rosy, fontSize: 11, letterSpacing: '0.1em',
                      cursor: 'pointer', fontFamily: "'Jost', sans-serif",
                    }}
                  >Save</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}