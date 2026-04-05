import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Plus, Minus, ChevronDown, CalendarIcon, ChevronLeft, ChevronRight, History, Trash2 } from 'lucide-react';
import { DayPicker, CaptionLabel } from 'react-day-picker';
import { format, parse, addMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { CaptionProps } from 'react-day-picker';
import { syncAlarmToDevice } from './localAlarm';
import { AlarmHeroDecor } from './AlarmHeroDecor';
import { RitualDrawerMonetDecor } from './RitualDrawerMonetDecor';

/** My Ritual：极简「去掉此项」— 仅圆角 ×，与右侧粉圈内的时长「−」字形区分 */
function RitualRemoveStepGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M7.35 7.35l9.3 9.3m0-9.3l-9.3 9.3"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </svg>
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
  midnight: 'var(--c-midnight)',
  dark:     'var(--c-dark)',
  moss:     'var(--c-moss)',
  beige:    'var(--c-beige)',
  rosy:     'var(--c-rosy)',
};

/** Flight log：相对起飞早/晚，线稿图标（衬线字体 capsule 内 emoji 常不显示） */
function IconMoodBeforeDep({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="8.5" cy="9.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="9.5" r="1" fill="currentColor" />
      <path
        d="M8 14.5c1.6 2.2 4.6 2.2 8 0"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function IconMoodAfterDep({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="8.5" cy="9.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="9.5" r="1" fill="currentColor" />
      <path
        d="M8 17.5c1.6-2.2 4.6-2.2 8 0"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * 一级页主卡片与抽屉内玻璃；`light` 用于「Not in this journey」等嵌套块。
 * `drawerNested`：关闭 backdrop-filter，避免抽屉内再叠一层实时模糊（移动端易卡顿）。
 */
function liquidGlassPrimaryCard(
  borderRadius: number,
  opts?: { light?: boolean; drawerNested?: boolean },
): React.CSSProperties {
  const light = !!opts?.light;
  const drawerNested = !!opts?.drawerNested;
  const soft = light || drawerNested;
  let background: string;
  if (drawerNested) {
    // 底部略提亮，避免圆角与多层 inset 阴影在 WebKit 上挤出黑边
    background =
      'linear-gradient(155deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.055) 42%, rgba(240,228,210,0.09) 52%, rgba(26,58,52,0.28) 100%)';
  } else if (light) {
    background =
      'linear-gradient(155deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 38%, rgba(240,228,210,0.06) 50%, rgba(0,0,0,0.1) 100%)';
  } else {
    background =
      'linear-gradient(155deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.045) 36%, rgba(240,228,210,0.065) 50%, rgba(0,0,0,0.14) 100%)';
  }
  const bf = drawerNested ? 'none' : light ? 'blur(9px) saturate(1.22)' : 'blur(14px) saturate(1.42)';

  // 抽屉内嵌卡片：禁止外扩 box-shadow — 在 overflow:auto 的父级里会被按矩形裁切，底部像「方角黑块」
  const boxShadow = drawerNested
    ? ['inset 0 0 0 0.5px rgba(255,255,255,0.06)', 'inset 0 1px 0 rgba(255,255,255,0.08)'].join(
        ', ',
      )
    : [
        `inset 0 0 0 0.5px rgba(255,255,255,${soft ? 0.05 : 0.058})`,
        `inset 4px 4px 6px -5px rgba(255,255,255,${soft ? 0.16 : 0.22})`,
        `inset -4px 4px 6px -5px rgba(255,255,255,${soft ? 0.14 : 0.2})`,
        `inset 4px -4px 6px -5px rgba(255,255,255,${soft ? 0.06 : 0.075})`,
        `inset -4px -4px 6px -5px rgba(255,255,255,${soft ? 0.08 : 0.1})`,
        `inset 0 0.5px 0 rgba(255,255,255,${soft ? 0.055 : 0.07})`,
        'inset 0 -1px 0 rgba(0,0,0,0.07)',
        soft ? '0 10px 28px rgba(0,0,0,0.16)' : '0 18px 52px rgba(0,0,0,0.26)',
        soft ? '0 3px 10px rgba(0,0,0,0.1)' : '0 6px 16px rgba(0,0,0,0.16)',
      ].join(', ');

  return {
    position: 'relative',
    overflow: 'hidden',
    borderRadius,
    background,
    backdropFilter: bf,
    WebkitBackdropFilter: bf,
    border: 'none',
    boxShadow,
    // 抽屉内嵌卡片：避免 translateZ 合成层 + 四角大半径 inset 在圆角处出现黑边/锯齿
    ...(drawerNested
      ? {
          WebkitBackfaceVisibility: 'hidden' as const,
          backfaceVisibility: 'hidden' as const,
          isolation: 'isolate' as const,
          contain: 'layout paint' as const,
        }
      : { transform: 'translateZ(0)' }),
  };
}

// ── 莫奈睡莲风格动作音效（Web Audio API，无外链）────────────────────────────
let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext?: new () => AudioContext }).webkitAudioContext)();
  return _audioCtx;
}

/**
 * 必须在用户点击的同步调用栈内完成解锁。
 * 若用 async/await，resume 之后的振荡器创建会落到微任务里，浏览器会按「无用户手势」静音（Go / now 都没声）。
 */
function primeAudioInUserGesture(ctx: AudioContext): void {
  try {
    void ctx.resume();
  } catch {
    /* ignore */
  }
  try {
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
}

/** 轻微触觉震动（支持设备时） */
function triggerHaptic(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([20, 15, 25]);
  }
}

/** GO 按钮：风声 + 低频震动感（触觉 + 听觉 + 视觉轻抖） */
function playGoSound(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  primeAudioInUserGesture(ctx);
  const t = ctx.currentTime + 0.04;

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
function playNowSound(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  primeAudioInUserGesture(ctx);
  const t = ctx.currentTime + 0.04;
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
  MU1259: '12:00',
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
const FLIGHT_HISTORY_KEY = 'chrono_flight_history_v1';
const SKIN_KEY = 'chrono_skin_v1';
/** 各 ritual 时长（用户可改，持久化；独立于单次航班状态） */
const RITUAL_DURATIONS_KEY = 'chrono_ritual_durations_v1';

/** 仅展示字段；完整打卡 The Journey 后写入 */
type FlightHistoryEntry = {
  id: string;
  flightNo: string;
  flightDate: string;
  /** 出发地当地日期（有 API 时用 API；旧数据无此字段则用 flightDate） */
  depDateYmd?: string;
  origin: string;
  dest: string;
  depTime: string;
  comfortTag: string;
  /** 末档打卡相对计划起飞：不晚于 ok，晚于 late（独立字段，避免与文字标签混排） */
  depRel?: 'ok' | 'late';
  savedAt: number;
};

type DepRelMood = 'ok' | 'late';

/** 剥离曾拼在 comfortTag 后的 emoji，并尽量恢复 depRel */
function stripComfortTagSuffixMood(tag: string): { tag: string; mood?: DepRelMood } {
  let t = tag.trimEnd();
  const suffixes: { re: RegExp; mood: DepRelMood }[] = [
    { re: /\s*🙂\s*$/u, mood: 'ok' },
    { re: /\s*🙁\s*$/u, mood: 'late' },
    { re: /\s*☹️\s*$/u, mood: 'late' },
    { re: /\s*😊\s*$/u, mood: 'ok' },
  ];
  for (const { re, mood } of suffixes) {
    if (re.test(t)) {
      t = t.replace(re, '').trimEnd();
      return { tag: t, mood };
    }
  }
  return { tag: t };
}

function normalizeFlightHistoryEntry(raw: unknown): FlightHistoryEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.flightNo !== 'string' || typeof e.comfortTag !== 'string') return null;
  const stripped = stripComfortTagSuffixMood(e.comfortTag);
  const depRelRaw = e.depRel;
  const depRel: DepRelMood | undefined =
    depRelRaw === 'ok' || depRelRaw === 'late' ? depRelRaw : stripped.mood;
  return {
    id: typeof e.id === 'string' ? e.id : `${e.flightNo}_${Date.now()}`,
    flightNo: e.flightNo,
    flightDate: typeof e.flightDate === 'string' ? e.flightDate : '',
    depDateYmd: typeof e.depDateYmd === 'string' ? e.depDateYmd : undefined,
    origin: typeof e.origin === 'string' ? e.origin : '—',
    dest: typeof e.dest === 'string' ? e.dest : '—',
    depTime: typeof e.depTime === 'string' ? e.depTime : '',
    comfortTag: stripped.tag,
    ...(depRel ? { depRel } : {}),
    savedAt: typeof e.savedAt === 'number' ? e.savedAt : 0,
  };
}

function loadFlightHistory(): FlightHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FLIGHT_HISTORY_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p
      .map((item) => normalizeFlightHistoryEntry(item))
      .filter((e): e is FlightHistoryEntry => e !== null)
      .slice(0, 80);
  } catch {
    return [];
  }
}

function mockDeparture(flightNo: string): string {
  const key = flightNo.toUpperCase().trim();
  if (MOCK_FLIGHTS[key]) return MOCK_FLIGHTS[key];
  const hash = key.split('').reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 7), 0);
  const hr = 6 + (Math.abs(hash) % 13);
  const minChoices = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const mn = minChoices[Math.abs(hash * 3) % minChoices.length];
  return `${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
}

/** AviationStack `data[]` 单条（仅用到的字段） */
type AviationFlightApiRow = {
  flight_date?: string | null;
  departure?: {
    scheduled?: string | null;
    timezone?: string | null;
    iata?: string | null;
    airport?: string | null;
  };
  arrival?: {
    iata?: string | null;
    airport?: string | null;
  };
};

/** 与一级时间轴、Flight log 共用的 API 解析结果 */
type FlightApiSnapshot = {
  depHHMM: string;
  origin: string;
  dest: string;
  /** 出发机场当地日历日 YYYY-MM-DD */
  depDateYmd: string;
  scheduledRaw: string;
  depTimezone: string;
};

function depLocalFromScheduled(
  scheduled: string,
  timeZone?: string | null,
): { hhmm: string; ymd: string } | null {
  const d = new Date(scheduled);
  if (Number.isNaN(d.getTime())) return null;
  const tz = timeZone?.trim() || undefined;
  try {
    const timeFmt = new Intl.DateTimeFormat('en-GB', {
      ...(tz ? { timeZone: tz } : {}),
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const tp = timeFmt.formatToParts(d);
    const h = tp.find((p) => p.type === 'hour')?.value;
    const m = tp.find((p) => p.type === 'minute')?.value;
    if (h === undefined || m === undefined) return null;
    const hhmm = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    const dateFmt = new Intl.DateTimeFormat('en-CA', {
      ...(tz ? { timeZone: tz } : {}),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const ymd = dateFmt.format(d);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
    return { hhmm, ymd };
  } catch {
    return null;
  }
}

function parseAviationFlightRow(
  row: AviationFlightApiRow | undefined,
  fallbackDateYmd: string,
): FlightApiSnapshot | null {
  const scheduled = row?.departure?.scheduled;
  if (!scheduled || typeof scheduled !== 'string') return null;
  const tz = row.departure?.timezone;
  const local = depLocalFromScheduled(scheduled, tz);
  let depHHMM: string;
  let depDateYmd: string;
  if (local) {
    depHHMM = local.hhmm;
    depDateYmd = local.ymd;
  } else {
    const match = scheduled.match(/T(\d{2}):(\d{2})/);
    if (!match) return null;
    depHHMM = `${match[1]}:${match[2]}`;
    const fd = row.flight_date;
    depDateYmd =
      typeof fd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fd) ? fd : fallbackDateYmd;
  }
  const dep = row.departure;
  const arr = row.arrival;
  const origin = (dep?.iata || dep?.airport || '').trim() || '—';
  const dest = (arr?.iata || arr?.airport || '').trim() || '—';
  return {
    depHHMM,
    origin,
    dest,
    depDateYmd,
    scheduledRaw: scheduled,
    depTimezone: (tz && tz.trim()) || '',
  };
}

function airportsOnlyFromRow(row: AviationFlightApiRow | undefined): { origin: string; dest: string } | null {
  if (!row?.departure) return null;
  const origin = (row.departure.iata || row.departure.airport || '').trim();
  const dest = (row.arrival?.iata || row.arrival?.airport || '').trim();
  if (!origin && !dest) return null;
  return { origin: origin || '—', dest: dest || '—' };
}

/** 飞常准 MCP 网关等扁平字段 */
function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function unwrapFirstFlightRecord(data: unknown): unknown {
  if (data == null) return undefined;
  if (Array.isArray(data)) return data[0];
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.list)) return o.list[0];
    if (Array.isArray(o.flights)) return o.flights[0];
    if (Array.isArray(o.result)) return o.result[0];
    return data;
  }
  return undefined;
}

function normalizeScheduledInput(raw: string): string {
  const s = raw.trim();
  if (/^\d{14}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}`;
  }
  if (/^\d{12}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:00`;
  }
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00`;
  }
  if (s.includes(' ') && !s.includes('T')) return s.replace(' ', 'T');
  return s;
}

function parseVariflightFlatRow(r: Record<string, unknown>, _fallbackDateYmd: string): FlightApiSnapshot | null {
  const plan = pickStr(
    r,
    'FlightDeptimePlanDate',
    'flightDeptimePlanDate',
    'FlightDeptimeDate',
    'schDepTime',
    'std',
    'depScheduled',
    'SchDepTime',
  );
  if (!plan) return null;
  const scheduledNorm = normalizeScheduledInput(plan);
  const local = depLocalFromScheduled(scheduledNorm, null);
  let depHHMM: string;
  let depDateYmd: string;
  if (local) {
    depHHMM = local.hhmm;
    depDateYmd = local.ymd;
  } else {
    const m = scheduledNorm.match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
    if (!m) return null;
    depDateYmd = m[1];
    depHHMM = `${m[2]}:${m[3]}`;
  }
  const depCode = pickStr(r, 'FlightDepcode', 'FlightDepCode', 'flightDepcode', 'DepCode', 'depCode', 'DepAirport');
  const arrCode = pickStr(r, 'FlightArrcode', 'FlightArrCode', 'flightArrcode', 'ArrCode', 'arrCode', 'ArrAirport');
  const cityDep = pickStr(r, 'FlightDep', 'flightDep', 'DepName', 'depName');
  const cityArr = pickStr(r, 'FlightArr', 'flightArr', 'ArrName', 'arrName');
  const origin = depCode || cityDep || '—';
  const dest = arrCode || cityArr || '—';
  return {
    depHHMM,
    origin,
    dest,
    depDateYmd,
    scheduledRaw: plan,
    depTimezone: '',
  };
}

function parseUnifiedFlightRecord(row: unknown, fallbackDateYmd: string): FlightApiSnapshot | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const dep = r.departure;
  if (dep && typeof dep === 'object' && 'scheduled' in dep) {
    return parseAviationFlightRow(row as AviationFlightApiRow, fallbackDateYmd);
  }
  return parseVariflightFlatRow(r, fallbackDateYmd);
}

function unifiedAirportsOnlyFromFlat(row: unknown): { origin: string; dest: string } | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const origin =
    pickStr(r, 'FlightDepcode', 'FlightDepCode', 'flightDepcode', 'DepCode', 'FlightDep', 'flightDep', 'dep') || '';
  const dest =
    pickStr(r, 'FlightArrcode', 'FlightArrCode', 'flightArrcode', 'ArrCode', 'FlightArr', 'flightArr', 'arr') || '';
  if (!origin && !dest) return null;
  return { origin: origin || '—', dest: dest || '—' };
}

/** 飞常准 MCP 包络 `{ code, data, request_id }` 或 AviationStack `{ data: [] }` */
function parseFlightLookupEnvelope(
  json: unknown,
  fallbackDateYmd: string,
): {
  snap: FlightApiSnapshot | null;
  airportsOnly: { origin: string; dest: string } | null;
} {
  if (!json || typeof json !== 'object') return { snap: null, airportsOnly: null };
  const root = json as Record<string, unknown>;

  if ('request_id' in root && 'code' in root) {
    const code = Number(root.code);
    if (code !== 200) return { snap: null, airportsOnly: null };
    const row = unwrapFirstFlightRecord(root.data);
    const snap = parseUnifiedFlightRecord(row, fallbackDateYmd);
    if (snap) return { snap, airportsOnly: null };
    const ap = unifiedAirportsOnlyFromFlat(row);
    return { snap: null, airportsOnly: ap };
  }

  const data = root.data;
  if (Array.isArray(data)) {
    const row = data[0];
    const snap = parseUnifiedFlightRecord(row, fallbackDateYmd);
    if (snap) return { snap, airportsOnly: null };
    const ap =
      row && typeof row === 'object' && 'departure' in row
        ? airportsOnlyFromRow(row as AviationFlightApiRow)
        : unifiedAirportsOnlyFromFlat(row);
    return { snap: null, airportsOnly: ap };
  }

  return { snap: null, airportsOnly: null };
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

/** 各节点 |实际 − 计划| 的平均值（分钟）→ 可爱英文舒适档 */
function comfortTagFromMeanAbs(meanAbs: number): string {
  if (meanAbs <= 2) return 'Snug bunny';
  if (meanAbs <= 5) return 'Cloud slippers';
  if (meanAbs <= 9) return 'Cozy wobble';
  if (meanAbs <= 15) return 'Busy bee';
  return 'Chaos cupcake';
}

/**
 * 把「打卡」的分钟数对齐到与 [wakeMin, boardMin] 同一根轴上。
 * 同日清晨打卡、计划 wake 在下午时，raw 会小于 wake：这是提早，不能 +1440（否则进度条会打满）。
 * 仅当 +1440 后落在行程附近时，才视为午夜后的延续（如深夜航班前后）。
 */
function alignActualToJourneyWindow(rawActual: number, wakeMin: number, boardMin: number): number {
  if (rawActual >= wakeMin - 60) return rawActual;
  const withWrap = rawActual + 1440;
  const slackAfter = 360;
  if (withWrap >= wakeMin - 30 && withWrap <= boardMin + slackAfter) return withWrap;
  return rawActual;
}

function computeMeanAbsDiff(
  nodeIds: string[],
  stamps: Record<string, string>,
  times: Record<string, number>,
): number {
  const wakeMin = times.wake;
  const boardMin = times.board;
  let sum = 0;
  let n = 0;
  for (const id of nodeIds) {
    const exp = times[id];
    if (exp === undefined) continue;
    const st = stamps[id];
    if (!st) continue;
    const raw = toMin(st);
    const actual = alignActualToJourneyWindow(raw, wakeMin, boardMin);
    const diff = actual - exp;
    sum += Math.abs(diff);
    n += 1;
  }
  return n > 0 ? sum / n : 0;
}

/**
 * 行程「最后一档」实际打卡 vs 计划起飞（depStr）：不晚于起飞 ok，晚于 late。
 * 与 comfort tag（My Ritual 偏差）独立；跨日用 ±12h 粗归一。
 */
function departureRelMood(
  depStr: string,
  journeyNodeIds: string[],
  stamps: Record<string, string>,
  times: Record<string, number>,
): DepRelMood | null {
  if (journeyNodeIds.length === 0) return null;
  const lastId = journeyNodeIds[journeyNodeIds.length - 1];
  const st = stamps[lastId];
  if (!st) return null;
  const wakeMin = times.wake;
  const boardMin = times.board;
  const raw = toMin(st);
  const actual = alignActualToJourneyWindow(raw, wakeMin, boardMin);
  const depMin = toMin(depStr);
  let slack = depMin - actual;
  if (slack < -720) slack += 1440;
  else if (slack > 720) slack -= 1440;
  return slack >= 0 ? 'ok' : 'late';
}

// ── Types ─────────────────────────────────────────────────────────────────
type Durations = {
  linger: number;
  polish: number;
  rollout: number;
  checkin: number;
  clear: number;
  gate: number;
  zen: number;
  wheels: number;
};
const DEFAULT_DURATIONS: Durations = {
  linger: 20,
  polish: 20,
  rollout: 30,
  checkin: 15,
  clear: 20,
  gate: 20,
  zen: 10,
  wheels: 30,
};

// ── Custom SVG Icons ──────────────────────────────────────────────────────
const IconRingRing = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bell1" cx="36%" cy="28%" r="68%">
        <stop offset="0%" stopColor="#E4D5B7"/>
        <stop offset="50%" stopColor="var(--c-roseLight)"/>
        <stop offset="100%" stopColor="#A89070"/>
      </radialGradient>
    </defs>
    <path d="M36 12 C24 12 18 22 18 32 L18 46 Q18 50 22 50 L50 50 Q54 50 54 46 L54 32 C54 22 48 12 36 12Z" fill="url(#bell1)"/>
    <path d="M36 14 C26 14 21 23 21 32 L21 42" stroke="#E4D5B7" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.38"/>
    <circle cx="36" cy="54" r="4.5" fill="var(--c-rosy)"/>
    <circle cx="36" cy="54" r="2.2" fill="var(--c-roseDeep)"/>
    <path d="M30 12 Q36 6 42 12" stroke="#A89070" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8"/>
    <circle cx="36" cy="10" r="2.8" fill="var(--c-roseLight)" opacity="0.75"/>
    <path d="M10 28 Q6 36 10 44"  stroke="var(--c-rosy)" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.75"/>
    <path d="M6 22  Q1 36 6 50"   stroke="var(--c-rosy)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.35"/>
    <path d="M62 28 Q66 36 62 44" stroke="var(--c-rosy)" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.75"/>
    <path d="M66 22 Q71 36 66 50" stroke="var(--c-rosy)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.35"/>
    <ellipse cx="18" cy="62" rx="8"   ry="3.2" fill="var(--c-moss)" opacity="0.5"  transform="rotate(-8 18 62)"/>
    <ellipse cx="54" cy="63" rx="6.5" ry="2.8" fill="var(--c-dark)" opacity="0.55" transform="rotate(6 54 63)"/>
  </svg>
);

const IconWakeyWakey = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="iris2" cx="40%" cy="38%" r="58%">
        <stop offset="0%" stopColor="var(--c-moss)"/>
        <stop offset="55%" stopColor="var(--c-dark)"/>
        <stop offset="100%" stopColor="var(--c-midnight)"/>
      </radialGradient>
      <clipPath id="eyeclip2">
        <path d="M10 36 Q36 16 62 36 Q36 52 10 36Z"/>
      </clipPath>
    </defs>
    <path d="M10 36 Q36 16 62 36 Q36 56 10 36Z" fill="#E4D5B7" opacity="0.92"/>
    <path d="M10 36 Q36 16 62 36 Q50 28 36 26 Q22 28 10 36Z" fill="var(--c-roseMid)" opacity="0.88"/>
    <circle cx="36" cy="37" r="10" fill="url(#iris2)" clipPath="url(#eyeclip2)"/>
    <circle cx="36" cy="37" r="5"  fill="var(--c-midnight)" opacity="0.9"  clipPath="url(#eyeclip2)"/>
    <circle cx="32" cy="34" r="2.5" fill="#E4D5B7" opacity="0.4" clipPath="url(#eyeclip2)"/>
    <path d="M10 36 Q36 16 62 36" stroke="var(--c-rosy)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
    <path d="M10 36 Q36 52 62 36" stroke="var(--c-rosy)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.55"/>
    <line x1="22" y1="24" x2="20" y2="17" stroke="var(--c-rosy)" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
    <line x1="30" y1="19" x2="29" y2="12" stroke="var(--c-rosy)" strokeWidth="2" strokeLinecap="round" opacity="0.65"/>
    <line x1="36" y1="17" x2="36" y2="10" stroke="var(--c-rosy)" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
    <line x1="43" y1="19" x2="44" y2="12" stroke="var(--c-rosy)" strokeWidth="2" strokeLinecap="round" opacity="0.65"/>
    <line x1="50" y1="24" x2="52" y2="17" stroke="var(--c-rosy)" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
    <text x="52" y="22" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="11" fill="var(--c-moss)" opacity="0.7">z</text>
    <text x="58" y="15" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="9"  fill="var(--c-moss)" opacity="0.5">z</text>
    <text x="63" y="9"  fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="7"  fill="var(--c-moss)" opacity="0.35">z</text>
    <ellipse cx="18" cy="60" rx="7" ry="2.8" fill="var(--c-moss)" opacity="0.45" transform="rotate(-6 18 60)"/>
    <ellipse cx="54" cy="61" rx="6" ry="2.4" fill="var(--c-dark)" opacity="0.5"  transform="rotate(5 54 61)"/>
  </svg>
);

const IconLeavingHome = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="wall3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E4D5B7" stopOpacity="0.92"/>
        <stop offset="100%" stopColor="var(--c-roseMid)" stopOpacity="0.68"/>
      </linearGradient>
      <linearGradient id="roof3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--c-rosy)"/>
        <stop offset="100%" stopColor="var(--c-roseDeep)"/>
      </linearGradient>
    </defs>
    <rect x="10" y="36" width="36" height="26" rx="2" fill="url(#wall3)"/>
    <path d="M6 38 L28 14 L50 38Z" fill="url(#roof3)"/>
    <path d="M8 38 L28 16 L48 38" stroke="#E4D5B7" strokeWidth="1" fill="none" opacity="0.32"/>
    <path d="M21 62 L21 46 Q21 40 28 40 Q35 40 35 46 L35 62Z" fill="var(--c-dark)" opacity="0.82"/>
    <circle cx="33" cy="52" r="2" fill="var(--c-rosy)" opacity="0.85"/>
    <rect x="12" y="42" width="8" height="8" rx="1.5" fill="var(--c-dark)" opacity="0.5"/>
    <line x1="16" y1="42" x2="16" y2="50" stroke="var(--c-moss)" strokeWidth="1.2" opacity="0.6"/>
    <line x1="12" y1="46" x2="20" y2="46" stroke="var(--c-moss)" strokeWidth="1.2" opacity="0.6"/>
    <rect x="38" y="20" width="5" height="12" rx="1" fill="var(--c-rosy)" opacity="0.65"/>
    <path d="M52 44 L64 36" stroke="var(--c-rosy)" strokeWidth="3.8" strokeLinecap="round"/>
    <path d="M58 30 L64 36 L58 42" stroke="var(--c-rosy)" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="55" cy="30" r="2.2" fill="#E4D5B7" opacity="0.55"/>
    <circle cx="61" cy="27" r="1.6" fill="var(--c-rosy)" opacity="0.45"/>
    <ellipse cx="8"  cy="64" rx="6"   ry="2.5" fill="var(--c-moss)" opacity="0.5"/>
    <ellipse cx="48" cy="65" rx="5.5" ry="2.2" fill="var(--c-dark)" opacity="0.5"/>
  </svg>
);

const IconTerminalEntry = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="facade4" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E4D5B7" stopOpacity="0.85"/>
        <stop offset="100%" stopColor="var(--c-moss)" stopOpacity="0.5"/>
      </linearGradient>
      <linearGradient id="archfill4" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--c-moss)" stopOpacity="0.8"/>
        <stop offset="100%" stopColor="var(--c-dark)" stopOpacity="0.95"/>
      </linearGradient>
    </defs>
    <rect x="4" y="38" width="64" height="26" rx="3" fill="url(#facade4)"/>
    <path d="M22 64 L22 46 Q22 34 36 34 Q50 34 50 46 L50 64Z" fill="url(#archfill4)"/>
    <path d="M22 46 Q22 34 36 34 Q50 34 50 46" stroke="#E4D5B7" strokeWidth="2" fill="none" opacity="0.5"/>
    <rect x="8"  y="44" width="11" height="11" rx="2" fill="var(--c-dark)" opacity="0.65"/>
    <rect x="53" y="44" width="11" height="11" rx="2" fill="var(--c-dark)" opacity="0.65"/>
    <path d="M2 38 Q36 24 70 38" stroke="#E4D5B7" strokeWidth="2.2" fill="none" opacity="0.42"/>
    <rect x="30" y="14" width="12" height="24" rx="2" fill="#E4D5B7" opacity="0.6"/>
    <rect x="27" y="11" width="18" height="7"  rx="2" fill="var(--c-rosy)" opacity="0.78"/>
    <path d="M44 9 L58 6 L56 9 L58 12 L44 9Z" fill="var(--c-rosy)" opacity="0.78"/>
    <path d="M44 9 L32 8 L33 9 L32 10 L44 9Z" fill="var(--c-rosy)" opacity="0.62"/>
    <ellipse cx="10" cy="65" rx="6"   ry="2.2" fill="var(--c-moss)" opacity="0.45"/>
    <ellipse cx="62" cy="65" rx="5.5" ry="2"   fill="var(--c-dark)" opacity="0.45"/>
  </svg>
);

const IconCheckInComplete = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="chkBagG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--c-rosy)" stopOpacity="0.82"/>
        <stop offset="100%" stopColor="var(--c-roseDeep)" stopOpacity="0.92"/>
      </linearGradient>
      <linearGradient id="chkPassG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E4D5B7" stopOpacity="0.95"/>
        <stop offset="100%" stopColor="var(--c-moss)" stopOpacity="0.4"/>
      </linearGradient>
    </defs>
    <rect x="8" y="24" width="20" height="30" rx="3" fill="url(#chkBagG)" opacity="0.92"/>
    <path d="M11 28 h14 M11 34 h14" stroke="var(--c-midnight)" strokeWidth="0.9" opacity="0.28"/>
    <rect x="10" y="44" width="16" height="2.5" rx="1" fill="var(--c-midnight)" opacity="0.32"/>
    <circle cx="18" cy="52" r="2.8" fill="var(--c-dark)" opacity="0.7"/>
    <rect x="32" y="18" width="32" height="36" rx="5" fill="url(#chkPassG)" stroke="var(--c-rosy)" strokeWidth="1" opacity="0.92"/>
    <path d="M38 26 h20 M38 32 h14" stroke="var(--c-dark)" strokeWidth="0.9" opacity="0.32"/>
    <rect x="40" y="38" width="16" height="10" rx="2" fill="var(--c-moss)" opacity="0.42"/>
    <path d="M43 43 h10" stroke="#E4D5B7" strokeWidth="1.2" strokeLinecap="round" opacity="0.75"/>
    <path d="M48 40 v10" stroke="#E4D5B7" strokeWidth="0.9" opacity="0.45"/>
    <ellipse cx="16" cy="62" rx="7" ry="2.4" fill="var(--c-moss)" opacity="0.42"/>
    <ellipse cx="52" cy="60" rx="6" ry="2.1" fill="var(--c-dark)" opacity="0.42"/>
  </svg>
);

const IconPastSecurity = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shield5" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--c-moss)"/>
        <stop offset="100%" stopColor="var(--c-dark)"/>
      </linearGradient>
    </defs>
    <path d="M36 8 C36 8 12 15 12 28 L12 42 C12 56 22 64 36 68 C50 64 60 56 60 42 L60 28 C60 15 36 8 36 8Z" fill="url(#shield5)" opacity="0.88"/>
    <path d="M36 11 C36 11 15 17.5 15 28 L15 33" stroke="#E4D5B7" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" fill="none"/>
    <path d="M36 8 C36 8 12 15 12 28 L12 42 C12 56 22 64 36 68 C50 64 60 56 60 42 L60 28 C60 15 36 8 36 8Z" stroke="var(--c-moss)" strokeWidth="1.2" fill="none" opacity="0.55"/>
    <path d="M20 38 L31 51 L52 24" stroke="#E4D5B7" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M20 38 L31 51 L52 24" stroke="#E4D5B7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.42"/>
    <circle cx="10" cy="22" r="2.2" fill="var(--c-rosy)" opacity="0.42"/>
    <circle cx="62" cy="24" r="1.8" fill="var(--c-moss)" opacity="0.42"/>
    <ellipse cx="22" cy="70" rx="7" ry="2.5" fill="var(--c-moss)" opacity="0.45"/>
    <ellipse cx="50" cy="71" rx="6" ry="2.2" fill="var(--c-dark)" opacity="0.45"/>
  </svg>
);

const IconAtTheGate = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pillar6" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E4D5B7" stopOpacity="0.92"/>
        <stop offset="100%" stopColor="var(--c-rosy)" stopOpacity="0.6"/>
      </linearGradient>
    </defs>
    <rect x="6"  y="28" width="14" height="36" rx="7" fill="url(#pillar6)"/>
    <rect x="52" y="28" width="14" height="36" rx="7" fill="url(#pillar6)"/>
    <path d="M6 34 Q36 4 66 34" stroke="url(#pillar6)" strokeWidth="12" fill="none" strokeLinecap="round"/>
    <rect x="26" y="12" width="20" height="12" rx="3" fill="var(--c-dark)" opacity="0.88"/>
    <text x="36" y="22" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="10" fill="#E4D5B7" opacity="0.92" fontStyle="italic">G</text>
    <circle cx="36" cy="44" r="5.5" fill="#E4D5B7" opacity="0.82"/>
    <path d="M31 50 Q36 62 41 50" stroke="#E4D5B7" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.75"/>
    <path d="M33 56 L30 64" stroke="#E4D5B7" strokeWidth="3" strokeLinecap="round" opacity="0.58"/>
    <path d="M39 56 L42 64" stroke="#E4D5B7" strokeWidth="3" strokeLinecap="round" opacity="0.58"/>
    <rect x="44" y="52" width="8" height="10" rx="2" fill="var(--c-rosy)" opacity="0.78"/>
    <line x1="48" y1="50" x2="48" y2="52" stroke="var(--c-rosy)" strokeWidth="2.2" strokeLinecap="round" opacity="0.75"/>
    <ellipse cx="8"  cy="66" rx="6"   ry="2.5" fill="var(--c-moss)" opacity="0.45" transform="rotate(-8 8 66)"/>
    <ellipse cx="64" cy="66" rx="5.5" ry="2.2" fill="var(--c-dark)" opacity="0.45"/>
  </svg>
);

const IconGetOnBoard = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="plane7" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#E4D5B7"/>
        <stop offset="100%" stopColor="var(--c-mint)"/>
      </linearGradient>
    </defs>
    <path d="M4 60 Q18 48 34 38" stroke="var(--c-moss)" strokeWidth="3"   fill="none" strokeLinecap="round" strokeDasharray="2 6" opacity="0.65"/>
    <path d="M4 66 Q20 54 34 43" stroke="var(--c-dark)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeDasharray="1.5 6" opacity="0.42"/>
    <path d="M34 38 C42 28 64 22 68 29 C72 36 56 48 34 44 Z" fill="url(#plane7)"/>
    <path d="M66 29 L74 29 L66 33 Z" fill="#E4D5B7" opacity="0.88"/>
    <path d="M46 42 L36 64 L54 48 Z" fill="#E4D5B7" opacity="0.72"/>
    <path d="M34 38 L26 22 L38 34 Z" fill="var(--c-rosy)" opacity="0.88"/>
    <path d="M34 43 L26 56 L38 47 Z" fill="#E4D5B7" opacity="0.55"/>
    <circle cx="58" cy="30" r="2.8" fill="var(--c-dark)" opacity="0.78"/>
    <circle cx="51" cy="33" r="2.8" fill="var(--c-dark)" opacity="0.78"/>
    <circle cx="44" cy="35" r="2.8" fill="var(--c-dark)" opacity="0.78"/>
    <path d="M2 64 Q14 60 24 64 Q34 68 44 64 Q54 60 70 64" stroke="var(--c-dark)" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.45"/>
    <ellipse cx="10" cy="67" rx="9"   ry="3.2" fill="var(--c-moss)" opacity="0.5"/>
    <ellipse cx="36" cy="70" rx="7"   ry="2.8" fill="var(--c-dark)" opacity="0.45"/>
    <ellipse cx="58" cy="68" rx="5.5" ry="2.2" fill="var(--c-moss)" opacity="0.4"/>
  </svg>
);

/** 预计起飞时刻（跑道 / 离地意象）；纯色填充避免与抽屉内重复实例的 gradient id 冲突 */
const IconDepartureTime = () => (
  <svg width="32" height="32" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 58 h64" stroke="var(--c-moss)" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
    <path d="M8 58 L14 52" stroke="var(--c-dark)" strokeWidth="1.2" opacity="0.35"/>
    <path d="M22 58 L28 50" stroke="var(--c-dark)" strokeWidth="1.2" opacity="0.35"/>
    <circle cx="58" cy="14" r="8" fill="var(--c-rosy)" opacity="0.35"/>
    <circle cx="58" cy="14" r="5" fill="#E4D5B7" opacity="0.55"/>
    <path
      d="M18 46 L38 38 L62 28 L66 30 L52 42 L30 50 Z"
      fill="color-mix(in srgb, var(--c-mint) 55%, #E4D5B7)"
      opacity="0.92"
    />
    <path d="M62 28 L70 26 L66 32 Z" fill="var(--c-rosy)" opacity="0.75"/>
    <ellipse cx="14" cy="62" rx="8" ry="2.6" fill="var(--c-moss)" opacity="0.38"/>
    <ellipse cx="48" cy="64" rx="6" ry="2.2" fill="var(--c-dark)" opacity="0.35"/>
  </svg>
);

// ── Node definitions ───────────────────────────────────────────────────────
const NODES = [
  { id: 'wake',    Icon: IconRingRing,        label: 'Ring Ring',          sub: 'Alarm rings',                     cardClass: 'card-1', isFirst: true  },
  { id: 'linger',  Icon: IconWakeyWakey,      label: 'Wakey Wakey',        sub: 'a little longer in bed',        cardClass: 'card-2', isFirst: false },
  { id: 'polish',  Icon: IconLeavingHome,     label: 'Leaving Home',       sub: 'wash up, pack, quick glow-up',   cardClass: 'card-3', isFirst: false },
  { id: 'rollout', Icon: IconTerminalEntry,   label: 'Terminal Entry',     sub: 'travel time to the airport',    cardClass: 'card-4', isFirst: false },
  { id: 'checkin', Icon: IconCheckInComplete, label: 'Check-in Complete',  sub: 'tags, bags, boarding passes',     cardClass: 'card-5', isFirst: false },
  { id: 'clear',   Icon: IconPastSecurity,    label: 'Cleared Security',   sub: 'belt off, shoes off',           cardClass: 'card-6', isFirst: false },
  { id: 'gate',    Icon: IconAtTheGate,       label: 'At the Gate',        sub: 'wander your way to the gate',   cardClass: 'card-7', isFirst: false },
  { id: 'zen',     Icon: IconGetOnBoard,      label: 'Now Boarding',       sub: 'quiet before boarding starts',  cardClass: 'card-8', isFirst: false },
];

type DurKey = keyof Durations;

/** 与一级时间轴 / 计算顺序一致（不含 Ring Ring） */
const RITUAL_ORDER: DurKey[] = ['linger', 'polish', 'rollout', 'checkin', 'clear', 'gate', 'zen', 'wheels'];

function isDurKey(k: unknown): k is DurKey {
  return typeof k === 'string' && (RITUAL_ORDER as readonly string[]).includes(k);
}

/** 去重并按行程顺序排列，避免脏数据导致 UI 异常 */
function normalizeRitualSkipped(raw: unknown[]): DurKey[] {
  const set = new Set<DurKey>();
  for (const x of raw) {
    if (isDurKey(x)) set.add(x);
  }
  return RITUAL_ORDER.filter((k) => set.has(k));
}

function loadStoredDurations(): Durations {
  try {
    if (typeof window === 'undefined') return { ...DEFAULT_DURATIONS };
    const raw = localStorage.getItem(RITUAL_DURATIONS_KEY);
    if (!raw) return { ...DEFAULT_DURATIONS };
    const data = JSON.parse(raw) as Record<string, unknown>;
    const next = { ...DEFAULT_DURATIONS };
    for (const key of RITUAL_ORDER) {
      const v = data[key];
      if (typeof v === 'number' && Number.isFinite(v)) {
        next[key] = Math.max(5, Math.min(120, Math.round(v)));
      }
    }
    return next;
  } catch {
    return { ...DEFAULT_DURATIONS };
  }
}

/** 跳过环节时不计入总时长；各节点时刻为「完成该段之后」的累计时间 */
function calcTimes(depStr: string, d: Durations, skipped: ReadonlySet<DurKey>): Record<string, number> {
  const dep = toMin(depStr);
  let total = 0;
  for (const k of RITUAL_ORDER) {
    if (!skipped.has(k)) total += d[k];
  }
  let t = dep - total;
  const times: Record<string, number> = { wake: t, board: dep };
  for (const k of RITUAL_ORDER) {
    if (skipped.has(k)) continue;
    t += d[k];
    if (k !== 'wheels') times[k] = t;
  }
  return times;
}

/** 一级时间轴最后一个可打卡节点（不含 wake） */
function getLastVisibleJourneyId(skipped: ReadonlySet<DurKey>, isPink: boolean): string {
  for (let i = NODES.length - 1; i >= 0; i--) {
    const n = NODES[i];
    if (n.id === 'wake') continue;
    if (isPink && n.id === 'linger') continue;
    if (skipped.has(n.id as DurKey)) continue;
    return n.id;
  }
  return 'wake';
}

const RITUAL_ROWS: { key: DurKey; title: string; sub: string }[] = [
  { key: 'linger', title: 'Snooze time', sub: 'a little longer in bed' },
  { key: 'polish', title: 'Pre-flight prep', sub: 'wash up, pack, quick glow-up' },
  { key: 'rollout', title: 'En route', sub: 'travel time to the airport' },
  { key: 'checkin', title: 'Check-in', sub: 'tags, bags, boarding passes' },
  { key: 'clear', title: 'Security', sub: 'belt off, shoes off' },
  { key: 'gate', title: 'Gate stroll', sub: 'wander your way to the gate' },
  { key: 'zen', title: 'Pre-board buffer', sub: 'quiet before boarding starts' },
  { key: 'wheels', title: 'Board to wheels', sub: 'from the gate to wheels-up' },
];

type RitualDrawerDurationSectionProps = {
  isPink: boolean;
  ritualSkipped: DurKey[];
  durations: Durations;
  notInJourneyGlass: React.CSSProperties;
  onToggleSkip: (key: DurKey) => void;
  onAdjustDuration: (key: DurKey, delta: number) => void;
};

/** My Ritual 列表与 Not in this journey：memo + 稳定回调，避免父组件无关重绘拖慢区块更新 */
const RitualDrawerDurationSection = memo(function RitualDrawerDurationSection({
  isPink,
  ritualSkipped,
  durations,
  notInJourneyGlass,
  onToggleSkip,
  onAdjustDuration,
}: RitualDrawerDurationSectionProps) {
  const ritualVisible = useMemo(
    () =>
      RITUAL_ROWS.filter(
        (row) => !ritualSkipped.includes(row.key) && !(isPink && row.key === 'linger'),
      ),
    [isPink, ritualSkipped],
  );
  const ritualHidden = useMemo(
    () =>
      RITUAL_ROWS.filter(
        (row) => ritualSkipped.includes(row.key) && !(isPink && row.key === 'linger'),
      ),
    [isPink, ritualSkipped],
  );
  const rowDivider = '0.5px solid rgba(201, 169, 110, 0.12)';
  const showHidden = ritualHidden.length > 0;
  const rowBtn: React.CSSProperties = {
    background: 'rgba(228,213,183,0.07)',
    border: '1px solid rgba(228,213,183,0.1)',
    borderRadius: '50%',
    width: 30,
    height: 30,
    color: C.beige,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
  const ritualDurBtn: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: `1px solid color-mix(in srgb, ${C.rosy} 55%, transparent)`,
    background: 'transparent',
    color: C.rosy,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    flexShrink: 0,
    boxSizing: 'border-box',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <>
      {ritualVisible.map((item, i, arr) => (
        <div
          key={item.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxSizing: 'border-box',
            minHeight: 72,
            borderBottom: i < arr.length - 1 ? rowDivider : 'none',
            padding: '0 2px',
          }}
        >
          <button
            type="button"
            aria-label="Remove this step from your journey"
            title="Remove this step from your journey"
            onClick={() => onToggleSkip(item.key)}
            style={rowBtn}
          >
            <RitualRemoveStepGlyph size={18} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: C.beige,
                lineHeight: 1.25,
                fontFamily: "'Jost', system-ui, sans-serif",
                letterSpacing: '0.02em',
                marginBottom: 2,
              }}
            >
              {item.title}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: 'rgba(228,213,183,0.52)',
                lineHeight: 1.4,
                fontFamily: "'Jost', system-ui, sans-serif",
                letterSpacing: '0.04em',
              }}
            >
              {item.sub}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              aria-label="Decrease minutes"
              onClick={() => onAdjustDuration(item.key, -5)}
              style={ritualDurBtn}
            >
              <Minus size={15} strokeWidth={2.25} absoluteStrokeWidth />
            </button>
            <span
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: 16,
                color: C.rosy,
                minWidth: 40,
                textAlign: 'center',
              }}
            >
              {durations[item.key]}m
            </span>
            <button
              type="button"
              aria-label="Increase minutes"
              onClick={() => onAdjustDuration(item.key, +5)}
              style={ritualDurBtn}
            >
              <Plus size={15} strokeWidth={2.25} absoluteStrokeWidth />
            </button>
          </div>
        </div>
      ))}
      {showHidden && (
        <div
          style={{
            marginTop: 20,
            marginBottom: 4,
            padding: '14px 14px 16px',
            ...notInJourneyGlass,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.moss,
              letterSpacing: '0.14em',
              marginBottom: 10,
              textTransform: 'uppercase',
              fontFamily: "'Jost', sans-serif",
            }}
          >
            Not in this journey
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              contain: 'layout style',
            }}
          >
            {ritualHidden.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onToggleSkip(item.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  maxWidth: '100%',
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(228,213,183,0.32)',
                  background: 'color-mix(in srgb, var(--c-midnight) 78%, rgba(228,213,183,0.14))',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  flexShrink: 0,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'rgba(228,213,183,0.92)',
                    fontFamily: "'Jost', system-ui, sans-serif",
                    letterSpacing: '0.02em',
                    textAlign: 'left',
                  }}
                >
                  {item.title}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'color-mix(in srgb, var(--c-rosy) 62%, transparent)',
                    fontFamily: "'Jost', sans-serif",
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                    flexShrink: 0,
                  }}
                >
                  restore
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
});

// ── Main Component ────────────────────────────────────────────────────────
export default function App() {
  const [flightNo, setFlightNo]         = useState('');
  const [submitted, setSubmitted]       = useState('');
  const [durations, setDurations]       = useState<Durations>(() => loadStoredDurations());
  const [stamps, setStamps]             = useState<Record<string, string>>({});
  /** 手动隐藏的 ritual 段：不计入总时长、一级不展示对应节点；新航班提交时清空 */
  const [ritualSkipped, setRitualSkipped] = useState<DurKey[]>([]);
  const skippedSet = useMemo(() => new Set(ritualSkipped), [ritualSkipped]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [flightHistory, setFlightHistory] = useState<FlightHistoryEntry[]>(loadFlightHistory);
  const [flightOrigin, setFlightOrigin] = useState('');
  const [flightDest, setFlightDest] = useState('');
  const [revealed, setRevealed]         = useState(false);
  const [goShakeKey, setGoShakeKey]     = useState(0);
  const [skin, setSkin]                 = useState<'theme-green' | 'theme-pink'>('theme-green');
  const [userName, setUserName]         = useState(() => loadProfile().name);
  const [userAvatar, setUserAvatar]     = useState(() => loadProfile().avatar);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileEditName, setProfileEditName] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  /** 早起/非早起开关：记录触点用于滑动切换 */
  const riseModeSwitchPtr = useRef<{ startX: number } | null>(null);
  /** 避免同一套打卡重复写入历史 */
  const journeyHistorySigRef = useRef<string>('');
  const [flightDepStr, setFlightDepStr] = useState<string | null>(null);
  const [flightApiSnapshot, setFlightApiSnapshot] = useState<FlightApiSnapshot | null>(null);
  const [flightLoading, setFlightLoading] = useState(false);
  const [alarmSyncHint, setAlarmSyncHint] = useState('');
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
  const [datePickerMonth, setDatePickerMonth] = useState<Date | undefined>(() => parseFlightDate(flightDate));

  const phoneBackground = [
    'radial-gradient(ellipse 90% 55% at 15% 8%, color-mix(in srgb, var(--c-dark) 65%, transparent) 0%, transparent 55%)',
    'radial-gradient(ellipse 70% 45% at 85% 22%, color-mix(in srgb, var(--c-moss) 15%, transparent) 0%, transparent 55%)',
    'radial-gradient(ellipse 80% 55% at 40% 90%, color-mix(in srgb, var(--c-midnight) 90%, transparent) 0%, transparent 60%)',
    'var(--c-bg-1A3A2A)',
  ].join(', ');


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
        ritualSkipped?: unknown;
        flightApiSnapshot?: FlightApiSnapshot | null;
      };
      if (!data.submitted || !data.flightDate) return;
      // 仅在航班当天恢复
      const now = new Date();
      const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (data.flightDate !== todayYmd) return;
      let pinkRestore = false;
      try {
        pinkRestore = localStorage.getItem(SKIN_KEY) === 'theme-pink';
      } catch {
        // ignore
      }
      const skippedRestore = new Set(
        Array.isArray(data.ritualSkipped) ? data.ritualSkipped.filter(isDurKey) : [],
      );
      const lastMilestone = getLastVisibleJourneyId(skippedRestore, pinkRestore);
      // 旧版曾可打卡 Departure Time（board）；新版以当前最后一档可见节点为准
      const done =
        data.stamps &&
        (data.stamps['board'] || (lastMilestone ? !!data.stamps[lastMilestone] : false));
      if (done) return;

      setFlightDate(data.flightDate);
      setFlightNo(data.flightNo || data.submitted);
      setSubmitted(data.submitted);
      setStamps(data.stamps ?? {});
      setRitualSkipped(normalizeRitualSkipped(Array.isArray(data.ritualSkipped) ? data.ritualSkipped : []));
      setRevealed(true);
      const snap = data.flightApiSnapshot;
      if (
        snap &&
        typeof snap.depHHMM === 'string' &&
        typeof snap.origin === 'string' &&
        typeof snap.dest === 'string' &&
        typeof snap.depDateYmd === 'string'
      ) {
        setFlightDepStr(snap.depHHMM);
        setFlightOrigin(snap.origin);
        setFlightDest(snap.dest);
        setFlightApiSnapshot(snap);
      } else {
        setFlightDepStr(mockDeparture(data.submitted));
        setFlightApiSnapshot(null);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // ── Skin apply (green/pink) ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let saved: 'theme-green' | 'theme-pink' = 'theme-green';
    try {
      const raw = localStorage.getItem(SKIN_KEY);
      saved = raw === 'theme-pink' ? 'theme-pink' : 'theme-green';
    } catch {
      // ignore
    }
    setSkin(saved);
    document.body.classList.remove('theme-green', 'theme-pink');
    document.body.classList.add(saved);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SKIN_KEY, skin);
    } catch {
      // ignore
    }
    document.body.classList.remove('theme-green', 'theme-pink');
    document.body.classList.add(skin);
  }, [skin]);

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
        ritualSkipped: normalizeRitualSkipped(ritualSkipped),
        flightApiSnapshot,
      };
      localStorage.setItem(FLIGHT_STATE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota errors
    }
  }, [flightNo, submitted, flightDate, stamps, ritualSkipped, flightApiSnapshot]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(RITUAL_DURATIONS_KEY, JSON.stringify(durations));
    } catch {
      // ignore quota
    }
  }, [durations]);

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

  /** 底栏抽屉打开时锁住 html/body 滚动，避免触摸滑动穿透到背后一级页（尤其 iOS） */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!settingsOpen && !historyOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [settingsOpen, historyOpen]);

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

  const isPink = skin === 'theme-pink';
  const notInJourneyGlass = useMemo(
    () => liquidGlassPrimaryCard(20, { light: true, drawerNested: true }),
    [],
  );

  const depStr   = submitted ? (flightDepStr ?? mockDeparture(submitted)) : null;
  const times    = depStr   ? calcTimes(depStr, durations, skippedSet) : null;
  const alarmStr = times    ? toStr(times.wake) : null;

  const journeyNodes = useMemo(
    () =>
      NODES.filter((n) => {
        if (n.id === 'wake') return true;
        if (isPink && n.id === 'linger') return false;
        if (skippedSet.has(n.id as DurKey)) return false;
        return true;
      }),
    [isPink, skippedSet],
  );
  const journeyNodeIds = useMemo(() => journeyNodes.map((n) => n.id), [journeyNodes]);

  useEffect(() => {
    if (!submitted || !alarmStr) return;
    let cancelled = false;
    (async () => {
      const ret = await syncAlarmToDevice({
        flightDate,
        alarmHHMM: alarmStr,
        flightNo: submitted,
      });
      if (cancelled) return;
      if (ret.ok) {
        setAlarmSyncHint('alarm synced to device');
      } else if (ret.reason === 'permission_denied') {
        setAlarmSyncHint('notification permission required');
      } else {
        setAlarmSyncHint('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [submitted, alarmStr, flightDate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(FLIGHT_HISTORY_KEY, JSON.stringify(flightHistory));
    } catch {
      // ignore quota
    }
  }, [flightHistory]);

  /** The Journey 每一档都点了 now 后写入一条历史（舒适标签 = 各节点 |实际−计划| 平均分档；depRel = 末档 vs 起飞） */
  useEffect(() => {
    if (!submitted || !flightDate || !depStr || !times) return;
    const ids = journeyNodeIds;
    const complete = ids.every((id) => stamps[id]);
    if (!complete) {
      journeyHistorySigRef.current = '';
      return;
    }
    const sig = ids.map((id) => `${id}:${stamps[id]}`).join('|');
    if (journeyHistorySigRef.current === sig) return;
    journeyHistorySigRef.current = sig;

    const meanAbs = computeMeanAbsDiff(ids, stamps, times);
    const comfortTag = comfortTagFromMeanAbs(meanAbs);
    const depRel = departureRelMood(depStr, ids, stamps, times);
    const depYmd = flightApiSnapshot?.depDateYmd ?? flightDate;
    const entry: FlightHistoryEntry = {
      id: `${submitted}_${flightDate}_${Date.now()}`,
      flightNo: submitted,
      flightDate,
      depDateYmd: depYmd,
      origin: flightOrigin.trim() || '—',
      dest: flightDest.trim() || '—',
      depTime: depStr,
      comfortTag,
      ...(depRel ? { depRel } : {}),
      savedAt: Date.now(),
    };
    setFlightHistory((prev) =>
      [entry, ...prev.filter((e) => !(e.flightNo === submitted && e.flightDate === flightDate))].slice(0, 50),
    );
  }, [stamps, submitted, flightDate, depStr, times, journeyNodeIds, flightOrigin, flightDest, flightApiSnapshot]);

  /** API 晚于打卡返回时，补全日志里的起降地 */
  useEffect(() => {
    if (!submitted || !flightDate) return;
    const o = flightOrigin.trim();
    const d = flightDest.trim();
    if (!o && !d) return;
    setFlightHistory((prev) => {
      let changed = false;
      const next = prev.map((e) => {
        if (e.flightNo !== submitted || e.flightDate !== flightDate) return e;
        const no = o || e.origin;
        const nd = d || e.dest;
        if (no === e.origin && nd === e.dest) return e;
        changed = true;
        return { ...e, origin: no, dest: nd };
      });
      return changed ? next : prev;
    });
  }, [flightOrigin, flightDest, submitted, flightDate]);

  const submit = () => {
    const val = flightNo.trim().toUpperCase();
    if (!val) return;
    playGoSound();
    setGoShakeKey(k => k + 1);
    setSubmitted(val);
    setRevealed(false);
    setTimeout(() => setRevealed(true), 80);
    setStamps({});
    setRitualSkipped([]);
    journeyHistorySigRef.current = '';
    setFlightOrigin('');
    setFlightDest('');
    setFlightApiSnapshot(null);
    const mock = mockDeparture(val);
    setFlightDepStr(mock);
    setFlightLoading(true);
    fetch(`/api/flight?flightNo=${encodeURIComponent(val)}&flight_date=${encodeURIComponent(flightDate)}`)
      .then((r) => r.json())
      .then((json: unknown) => {
        const { snap, airportsOnly } = parseFlightLookupEnvelope(json, flightDate);
        if (snap) {
          setFlightDepStr(snap.depHHMM);
          setFlightOrigin(snap.origin);
          setFlightDest(snap.dest);
          setFlightApiSnapshot(snap);
          if (/^\d{4}-\d{2}-\d{2}$/.test(snap.depDateYmd)) {
            setFlightDate(snap.depDateYmd);
            setDatePickerMonth(parseFlightDate(snap.depDateYmd));
          }
        } else {
          setFlightApiSnapshot(null);
          if (airportsOnly) {
            setFlightOrigin(airportsOnly.origin);
            setFlightDest(airportsOnly.dest);
          }
        }
      })
      .catch(() => {})
      .finally(() => setFlightLoading(false));
  };

  const removeFlightHistoryEntry = (id: string) => {
    setFlightHistory((prev) => prev.filter((e) => e.id !== id));
  };

  const stampNow = (id: string) => {
    setStamps(prev => ({ ...prev, [id]: nowStr() }));
  };

  const clearStamp = (id: string) => {
    setStamps(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const getDiff = (id: string) => {
    if (!times || !stamps[id] || times[id] === undefined) return null;
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
    if (expectedMin === undefined) return null;
    const rawActual = toMin(stamps[nodeId]);
    const actualMin = alignActualToJourneyWindow(rawActual, wakeMin, boardMin);
    const ePct = Math.max(0, Math.min(100, (expectedMin - wakeMin) / span * 100));
    const aPct = Math.max(0, Math.min(100, (actualMin   - wakeMin) / span * 100));
    return { ePct, aPct, isEarly: aPct <= ePct };
  };

  const adjustDuration = useCallback((key: DurKey, delta: number) => {
    setDurations((prev) => ({ ...prev, [key]: Math.max(5, Math.min(120, prev[key] + delta)) }));
  }, []);

  const toggleRitualSkip = useCallback((key: DurKey) => {
    setRitualSkipped((prev) =>
      normalizeRitualSkipped(prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]),
    );
    if (key !== 'wheels') {
      setStamps((s) => {
        const n = { ...s };
        delete n[key];
        return n;
      });
    }
  }, []);

  // 点击“背景空白区域”切换皮肤：只要点击目标不在任何卡片模块内，就在 theme-green/theme-pink 间切换
  const onBgClickToggleSkin = (e: React.PointerEvent<HTMLDivElement>) => {
    if (settingsOpen || profileEditOpen || datePickerOpen || historyOpen) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    // 仅当点击“不属于任何半透明模块”时切换皮肤
    if (target.closest('[data-skin-card="1"]')) return;
    setSkin(prev => (prev === 'theme-pink' ? 'theme-green' : 'theme-pink'));
  };

  return (
    <div
      className="chrono-bg"
      onPointerDown={onBgClickToggleSkin}
      style={{
        width: '100%',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'stretch',
        background: 'var(--c-bg-1A3A2A)',
        padding: 0,
        boxSizing: 'border-box',
        touchAction: 'manipulation',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'auto',
      }}
    >
      {/* ── App full-screen canvas ── */}
      <div
        style={{
          width: '100%',
          minHeight: '100dvh',
          position: 'relative',
          overflow: 'visible',
          borderRadius: 0,
          boxShadow: 'none',
          marginInline: 0,
          background: phoneBackground,
          fontFamily: "'Jost', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* 颗粒磨砂层（手机内） */}
        <div className="chrono-phone-grain" aria-hidden />
        {/* 莫奈笔触：手机内柔色块 */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, borderRadius: 'inherit',
          background: [
            'radial-gradient(ellipse 55% 45% at 10% 12%, color-mix(in srgb, var(--c-moss) 8%, transparent) 0%, transparent 50%)',
            'radial-gradient(ellipse 45% 50% at 88% 18%, rgba(228,213,183,0.05) 0%, transparent 45%)',
            'radial-gradient(ellipse 60% 50% at 35% 92%, color-mix(in srgb, var(--c-dark) 12%, transparent) 0%, transparent 50%)',
          ].join(', '),
          mixBlendMode: 'soft-light',
          pointerEvents: 'none',
        }} aria-hidden />
        {/* Ambient blobs */}
        <div style={{ position:'absolute', top:-20, left:-30, width:200, height:200, borderRadius:'50%', background:'color-mix(in srgb, var(--c-moss) 8%, transparent)', filter:'blur(50px)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:200, right:-40, width:160, height:160, borderRadius:'50%', background:'color-mix(in srgb, var(--c-rosy) 6%, transparent)', filter:'blur(40px)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:60, left:10, width:200, height:200, borderRadius:'50%', background:'color-mix(in srgb, var(--c-dark) 25%, transparent)', filter:'blur(55px)', pointerEvents:'none' }}/>

        {/* ── Main content ── */}
        <div style={{
          position:'relative', zIndex:1,
          boxSizing:'border-box',
          minHeight: '100dvh',
          display:'flex', flexDirection:'column',
          paddingTop: `calc(26px + env(safe-area-inset-top, 0px))`,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: `calc(22px + env(safe-area-inset-bottom, 0px))`,
          gap:5,
        }}>

          {/* ── Title + Early / Snooze + Log 同一行 ── */}
          <div
            data-skin-card="1"
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '8px 12px',
              ...liquidGlassPrimaryCard(14),
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flex: 1,
                minWidth: 0,
              }}
            >
              <button
                type="button"
                onClick={openProfileEdit}
                style={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  borderRadius: '50%',
                  border: '1px solid rgba(228,213,183,0.14)',
                  background: 'transparent',
                  overflow: 'hidden',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Edit profile"
              >
                <img
                  src={userAvatar || DEFAULT_AVATAR_URL}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </button>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                paddingRight: 4,
              }}
              aria-label={`${userName}'s Fly`}
            >
              <span
                style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 19,
                  color: C.beige,
                  letterSpacing: '0.02em',
                  lineHeight: 1.15,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    maxWidth: '9rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    verticalAlign: 'baseline',
                  }}
                >
                  {userName}
                </span>
                <span
                  style={{
                    color: 'color-mix(in srgb, var(--c-beige) 88%, var(--c-moss) 12%)',
                  }}
                >
                  {'\u2019'}s{'\u00a0'}
                </span>
                <span
                  style={{
                    fontWeight: 500,
                    color: C.rosy,
                    letterSpacing: '0.05em',
                  }}
                >
                  Fly
                </span>
              </span>
            </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontFamily: "'Jost', sans-serif",
                  color: !isPink
                    ? C.beige
                    : 'color-mix(in srgb, var(--c-moss) 52%, transparent)',
                  opacity: !isPink ? 1 : 0.62,
                  whiteSpace: 'nowrap',
                }}
              >
                Early
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={!isPink}
                aria-label={
                  isPink
                    ? 'Late mode: tap or slide to Early rise (includes one last dream)'
                    : 'Early rise: tap or slide to Late mode'
                }
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSkin((prev) => (prev === 'theme-pink' ? 'theme-green' : 'theme-pink'));
                  }
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  riseModeSwitchPtr.current = { startX: e.clientX };
                  (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  const start = riseModeSwitchPtr.current;
                  riseModeSwitchPtr.current = null;
                  try {
                    (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
                  } catch {
                    /* released */
                  }
                  if (!start) return;
                  const dx = e.clientX - start.x;
                  if (Math.abs(dx) > 14) {
                    setSkin(dx > 0 ? 'theme-pink' : 'theme-green');
                  } else {
                    setSkin((prev) => (prev === 'theme-pink' ? 'theme-green' : 'theme-pink'));
                  }
                }}
                onPointerCancel={() => {
                  riseModeSwitchPtr.current = null;
                }}
                style={{
                  position: 'relative',
                  width: 42,
                  height: 20,
                  boxSizing: 'border-box',
                  borderRadius: 999,
                  flexShrink: 0,
                  border: '1px solid rgba(228,213,183,0.1)',
                  background: isPink
                    ? 'color-mix(in srgb, var(--c-rosy) 25%, transparent)'
                    : 'color-mix(in srgb, var(--c-moss) 32%, transparent)',
                  cursor: 'pointer',
                  padding: 0,
                  touchAction: 'none',
                }}
              >
                <motion.div
                  transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                  animate={{ x: isPink ? 24 : 2 }}
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: 0,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#E4D5B7',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.22)',
                    pointerEvents: 'none',
                  }}
                />
              </button>
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontFamily: "'Jost', sans-serif",
                  color: isPink
                    ? C.beige
                    : 'color-mix(in srgb, var(--c-moss) 52%, transparent)',
                  opacity: isPink ? 1 : 0.62,
                  whiteSpace: 'nowrap',
                }}
              >
                LATE
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label="Open flight log"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                height: 20,
                boxSizing: 'border-box',
                padding: '0 8px',
                borderRadius: 999,
                border: '1px solid rgba(228,213,183,0.1)',
                background: 'rgba(10,20,20,0.35)',
                color: 'rgba(228,213,183,0.88)',
                fontSize: 9,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontFamily: "'Jost', sans-serif",
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <History size={11} strokeWidth={1.5} />
              Log
            </button>
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
            data-skin-card="1"
            style={{
            flexShrink:0,
            padding:'8px 14px',
            display:'flex', alignItems:'center', gap:12,
            ...liquidGlassPrimaryCard(16),
          }}>
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
                      background:'var(--c-bg-152A2A)',
                      border:'1px solid rgba(228,213,183,0.14)',
                      borderRadius:12, padding:16, boxShadow:'0 12px 32px rgba(0,0,0,0.4)',
                      fontFamily:"'Jost', system-ui, sans-serif",
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <DayPicker
                      mode="single"
                      month={datePickerMonth}
                      selected={parseFlightDate(flightDate)}
                      onSelect={(d) => {
                        if (d) setFlightDate(format(d, 'yyyy-MM-dd'));
                        setDatePickerOpen(false);
                      }}
                      onMonthChange={(m) => setDatePickerMonth(m)}
                      locale={enUS}
                      components={{
                        Caption: (captionProps: CaptionProps) => {
                          const displayMonth = datePickerMonth ?? captionProps.displayMonth;
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 10 }}>
                              <CaptionLabel {...captionProps} displayMonth={displayMonth} />
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <button
                                  type="button"
                                  onClick={() => setDatePickerMonth(addMonths(displayMonth, -1))}
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
                                  onClick={() => setDatePickerMonth(addMonths(displayMonth, 1))}
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
                        },
                      }}
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
                        selected: { background:'color-mix(in srgb, var(--c-rosy) 35%, transparent)', color:C.beige },
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
                    className="no-ios-zoom-input"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    style={{
                      background:'transparent', border:'none', outline:'none',
                      color:C.beige, width:'100%', padding:0,
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
              data-skin-card="1"
              initial={{ x: 0 }}
              animate={{ x: goShakeKey > 0 ? [0, -2, 2, -1, 1, 0] : 0 }}
              transition={{ duration: 0.2 }}
              style={{
                background:'color-mix(in srgb, var(--c-rosy) 20%, transparent)',
                border:'1px solid color-mix(in srgb, var(--c-rosy) 38%, transparent)',
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
            padding:'10px 20px 10px',
            textAlign:'center',
            ...liquidGlassPrimaryCard(20),
          }} data-skin-card="1">
            <AlarmHeroDecor />

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
                  {alarmSyncHint && (
                    <div style={{ fontSize:9, color:'color-mix(in srgb, var(--c-beige) 72%, transparent)', letterSpacing:'0.06em' }}>
                      {alarmSyncHint}
                    </div>
                  )}

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
                    background:'color-mix(in srgb, var(--c-rosy) 12%, transparent)',
                    border:'1px solid color-mix(in srgb, var(--c-rosy) 28%, transparent)',
                    borderRadius:20, padding:'3px 12px',
                  }}>
                    <span style={{ fontSize:9, color:C.rosy, letterSpacing:'0.1em' }}>
                      {submitted}
                    </span>
                    <span style={{ width:3, height:3, borderRadius:'50%', background:'color-mix(in srgb, var(--c-rosy) 45%, transparent)', display:'inline-block' }}/>
                    <span style={{ fontSize:9, color:'color-mix(in srgb, var(--c-rosy) 70%, transparent)', letterSpacing:'0.06em' }}>
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
                          <stop offset="50%"  stopColor="var(--c-roseLight)"/>
                          <stop offset="100%" stopColor="#A89070"/>
                        </radialGradient>
                      </defs>
                      <path d="M36 12 C24 12 18 22 18 32 L18 46 Q18 50 22 50 L50 50 Q54 50 54 46 L54 32 C54 22 48 12 36 12Z" fill="url(#bell_ph)"/>
                      <circle cx="36" cy="54" r="4.5" fill="var(--c-rosy)"/>
                      <path d="M30 12 Q36 6 42 12" stroke="#A89070" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8"/>
                      <circle cx="36" cy="10" r="2.8" fill="var(--c-roseLight)" opacity="0.75"/>
                      <path d="M10 28 Q6 36 10 44"  stroke="var(--c-rosy)" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.75"/>
                      <path d="M62 28 Q66 36 62 44" stroke="var(--c-rosy)" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.75"/>
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
                    fontSize:10, color:'color-mix(in srgb, var(--c-moss) 55%, transparent)',
                    letterSpacing:'0.06em', lineHeight:1.5,
                  }}>
                    enter your flight number<br/>
                    <span style={{ opacity:0.7 }}>
                      {isPink ? 'to see your alarm' : 'to see your wake alarm'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Timeline：与整页同滚，节点多时不限高（由外层 chrono-bg 纵向滚动） ── */}
          <div
            data-skin-card="1"
            style={{
            flex: '0 0 auto',
            padding:'8px 10px 10px',
            display:'flex', flexDirection:'column',
            overflow:'visible',
            ...liquidGlassPrimaryCard(18),
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
                  fontSize:10,
                  letterSpacing:'0.06em',
                  textTransform:'none',
                  fontFamily: "'Jost', sans-serif",
                  cursor:'pointer',
                }}
              >
                <Settings size={11} strokeWidth={1.5}/>
                My Ritual
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                paddingBottom: 6,
              }}
            >
              {journeyNodes.map((node, index) => {
                const time    = times?.[node.id];
                const diff    = getDiff(node.id);
                const stamped = stamps[node.id];
                const isFirst = node.isFirst;
                const isLast  = index === journeyNodes.length - 1;
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
                      <div
                        className="journey-icon-tint"
                        style={{
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
                                  color: 'rgba(228,213,183,0.92)',
                                  letterSpacing:'0.08em',
                                  background: diff.color === C.moss
                                    ? 'color-mix(in srgb, var(--c-moss) 50%, transparent)'
                                    : diff.color === C.rosy
                                      ? 'color-mix(in srgb, var(--c-rosy) 52%, transparent)'
                                      : 'color-mix(in srgb, var(--c-dark) 56%, transparent)',
                                  border:'1px solid rgba(228,213,183,0.22)',
                                  boxShadow:'inset 0 1px 0 rgba(255,255,255,0.08)',
                                  borderRadius:20, padding:'1px 7px',
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
                                border:'1px solid color-mix(in srgb, var(--c-rosy) 28%, transparent)',
                                borderRadius:20,
                                padding:'1px 14px',
                                color:'color-mix(in srgb, var(--c-rosy) 65%, transparent)',
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
                            style={{ marginTop:5, marginBottom: isLast ? 8 : 0, position:'relative', height:4, borderRadius:2, background:'rgba(228,213,183,0.07)', transformOrigin:'left' }}
                          >
                            {/* Fill to actual */}
                            <div style={{
                              position:'absolute', left:0, top:0, bottom:0,
                              width:`${progress.aPct}%`,
                              borderRadius:2,
                              background: progress.isEarly
                                ? 'linear-gradient(to right, color-mix(in srgb, var(--c-moss) 25%, transparent), color-mix(in srgb, var(--c-moss) 55%, transparent))'
                                : 'linear-gradient(to right, color-mix(in srgb, var(--c-rosy) 25%, transparent), color-mix(in srgb, var(--c-rosy) 55%, transparent))',
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
                              boxShadow:`0 0 5px ${progress.isEarly ? 'color-mix(in srgb, var(--c-moss) 70%, transparent)' : 'color-mix(in srgb, var(--c-rosy) 70%, transparent)'}`,
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
                          background:'linear-gradient(to bottom, color-mix(in srgb, var(--c-moss) 30%, transparent), color-mix(in srgb, var(--c-moss) 8%, transparent))',
                        }}/>
                        <div style={{
                          width:4, height:4, borderRadius:'50%',
                          background:'color-mix(in srgb, var(--c-moss) 22%, transparent)',
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
                transition={{ duration: 0.2 }}
                onClick={() => setSettingsOpen(false)}
                style={{
                  position:'fixed', inset:0, zIndex:50,
                  background:'rgba(5,15,15,0.62)',
                }}
              />
              <motion.div
                key="drawer"
                layout={false}
                initial={{ y:'100%' }}
                animate={{ y:0 }}
                exit={{ y:'100%' }}
                transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
                style={{
                  position:'fixed', bottom:0, left:0, right:0, zIndex:51,
                  borderRadius:'24px 24px 0 0',
                  background:'linear-gradient(180deg, color-mix(in srgb, var(--c-bg-152A2A) 99%, transparent) 0%, color-mix(in srgb, var(--c-midnight) 99.5%, transparent) 100%)',
                  border:'1px solid rgba(228,213,183,0.12)',
                  borderBottom:'none',
                  padding:'0 20px calc(22px + env(safe-area-inset-bottom, 0px))',
                  overflow:'hidden',
                  maxHeight: 'min(88dvh, 640px)',
                  display: 'flex',
                  flexDirection: 'column',
                  isolation: 'isolate',
                  touchAction: 'auto',
                }}
              >
                {/* 置于滚动层之下，避免与胶囊叠层滚动时产生重影/撕裂 */}
                <RitualDrawerMonetDecor />
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    paddingTop: 16,
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehaviorY: 'contain',
                    touchAction: 'pan-y',
                  }}
                >
                  {/* Handle */}
                  <div style={{ width:36, height:4, borderRadius:2, background:'rgba(228,213,183,0.18)', margin:'0 auto 14px' }}/>

                  {/* Header */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                    <div>
                      <div style={{
                        fontFamily:'Georgia, "Cormorant Garamond", serif',
                        fontWeight:500,
                        fontSize:22,
                        color:C.beige,
                        lineHeight:1.15,
                      }}>My Ritual</div>
                      <div style={{ fontSize:11, color:C.moss, letterSpacing:'0.12em', marginTop:4 }}>my defaults, my pace.</div>
                    </div>
                    <button
                      type="button"
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

                  <RitualDrawerDurationSection
                    isPink={isPink}
                    ritualSkipped={ritualSkipped}
                    durations={durations}
                    notInJourneyGlass={notInJourneyGlass}
                    onToggleSkip={toggleRitualSkip}
                    onAdjustDuration={adjustDuration}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Flight log：仅收录 The Journey 全部 now 打卡完成的航班 ── */}
        <AnimatePresence>
          {historyOpen && (
            <>
              <motion.div
                key="hist-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setHistoryOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 52,
                  background: 'rgba(5,15,15,0.6)',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                }}
              />
              <motion.div
                key="hist-drawer"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                style={{
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 53,
                  maxHeight: 'min(78vh, 560px)',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '24px 24px 0 0',
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--c-bg-152A2A) 98%, transparent) 0%, color-mix(in srgb, var(--c-midnight) 98%, transparent) 100%)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(228,213,183,0.12)',
                  borderBottom: 'none',
                  padding: '0 20px calc(22px + env(safe-area-inset-bottom, 0px))',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'relative', zIndex: 1, paddingTop: 16, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    background: 'rgba(228,213,183,0.18)',
                    margin: '0 auto 14px',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 16,
                    flexShrink: 0,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: 'Georgia, "Cormorant Garamond", serif',
                        fontWeight: 500,
                        fontSize: 22,
                        color: C.beige,
                        lineHeight: 1.15,
                      }}
                    >
                      Flight Log
                    </div>
                    <div style={{ fontSize: 11, color: C.moss, letterSpacing: '0.12em', marginTop: 4 }}>
                      Each comfort tag summarizes drift from My Ritual.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(false)}
                    style={{
                      background: 'rgba(228,213,183,0.07)',
                      border: '1px solid rgba(228,213,183,0.11)',
                      borderRadius: '50%',
                      width: 30,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: C.beige,
                      flexShrink: 0,
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div
                  style={{
                    overflowY: 'auto',
                    flex: 1,
                    minHeight: 0,
                    marginRight: -4,
                    paddingRight: 4,
                  }}
                >
                  {flightHistory.length === 0 ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'color-mix(in srgb, var(--c-moss) 70%, transparent)',
                        fontFamily: '"Cormorant Garamond", serif',
                        fontStyle: 'italic',
                        lineHeight: 1.5,
                        padding: '12px 0 8px',
                      }}
                    >
                      nothing here yet — finish The Journey once (every checkpoint), and this list will
                      keep that flight with a comfort tag.
                    </div>
                  ) : (
                    flightHistory.map((h) => (
                      <div
                        key={h.id}
                        style={{
                          padding: '10px 0',
                          borderBottom: '1px solid rgba(228,213,183,0.06)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 10,
                            marginBottom: 3,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              gap: '6px 10px',
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: '"Cormorant Garamond", Georgia, serif',
                                fontSize: 17,
                                color: C.beige,
                                letterSpacing: '0.04em',
                              }}
                            >
                              {h.flightNo}
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                flexShrink: 0,
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-block',
                                  fontSize: 10,
                                  fontFamily: '"Cormorant Garamond", serif',
                                  fontStyle: 'italic',
                                  color: C.rosy,
                                  letterSpacing: '0.03em',
                                  background: 'color-mix(in srgb, var(--c-rosy) 12%, transparent)',
                                  border: '1px solid color-mix(in srgb, var(--c-rosy) 22%, transparent)',
                                  borderRadius: 999,
                                  padding: '2px 8px',
                                  lineHeight: 1.35,
                                }}
                              >
                                {h.comfortTag}
                              </span>
                              {h.depRel === 'ok' && (
                                <span
                                  style={{
                                    color: C.beige,
                                    opacity: 0.9,
                                    display: 'flex',
                                    lineHeight: 0,
                                  }}
                                  title="Last checkpoint on or before scheduled departure"
                                >
                                  <IconMoodBeforeDep size={15} />
                                </span>
                              )}
                              {h.depRel === 'late' && (
                                <span
                                  style={{
                                    color: C.beige,
                                    opacity: 0.9,
                                    display: 'flex',
                                    lineHeight: 0,
                                  }}
                                  title="Last checkpoint after scheduled departure"
                                >
                                  <IconMoodAfterDep size={15} />
                                </span>
                              )}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span
                              style={{
                                fontSize: 10,
                                color: C.moss,
                                letterSpacing: '0.08em',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {format(parseFlightDate(h.depDateYmd ?? h.flightDate), 'MMM d, yyyy', { locale: enUS })}
                            </span>
                            <button
                              type="button"
                              aria-label="删除此条记录"
                              onClick={() => removeFlightHistoryEntry(h.id)}
                              style={{
                                background: 'rgba(228,213,183,0.07)',
                                border: '1px solid rgba(228,213,183,0.1)',
                                borderRadius: '50%',
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: C.moss,
                                flexShrink: 0,
                              }}
                            >
                              <Trash2 size={14} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'rgba(228,213,183,0.78)',
                            letterSpacing: '0.06em',
                            lineHeight: 1.35,
                          }}
                        >
                          {h.origin} → {h.dest} · dep {h.depTime}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                </div>
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
                  background: 'linear-gradient(180deg, color-mix(in srgb, var(--c-bg-152A2A) 98%, transparent) 0%, color-mix(in srgb, var(--c-midnight) 98%, transparent) 100%)',
                  border: '1px solid rgba(228,213,183,0.14)',
                  borderRadius: 20,
                  padding: '20px 20px 24px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span
                    style={{
                      fontFamily: 'Georgia, "Cormorant Garamond", serif',
                      fontSize: 18,
                      fontWeight: 500,
                      color: C.beige,
                    }}
                  >
                    Edit Profile
                  </span>
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
                      background: 'color-mix(in srgb, var(--c-dark) 30%, transparent)',
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
                      background: 'color-mix(in srgb, var(--c-rosy) 25%, transparent)', border: '1px solid color-mix(in srgb, var(--c-rosy) 40%, transparent)',
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