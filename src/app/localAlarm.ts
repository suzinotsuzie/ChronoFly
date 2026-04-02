import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const NOTIFICATION_PERMISSION_KEY = 'chrono_notification_granted_v1';
const ALARM_NOTIFICATION_ID = 9527;

function hasGrantedFlag(): boolean {
  try {
    return localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === '1';
  } catch {
    return false;
  }
}

function markGrantedFlag(): void {
  try {
    localStorage.setItem(NOTIFICATION_PERMISSION_KEY, '1');
  } catch {
    // ignore
  }
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (hasGrantedFlag()) return true;

  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') {
    markGrantedFlag();
    return true;
  }

  const asked = await LocalNotifications.requestPermissions();
  if (asked.display === 'granted') {
    markGrantedFlag();
    return true;
  }
  return false;
}

function buildAlarmDate(flightDate: string, alarmHHMM: string): Date | null {
  const [y, m, d] = flightDate.split('-').map(Number);
  const [hh, mm] = alarmHHMM.split(':').map(Number);
  if ([y, m, d, hh, mm].some(Number.isNaN)) return null;
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export async function syncAlarmToDevice(options: {
  flightDate: string;
  alarmHHMM: string;
  flightNo: string;
}): Promise<{ ok: boolean; reason?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: 'web_platform' };
  }

  const permitted = await ensureNotificationPermission();
  if (!permitted) {
    return { ok: false, reason: 'permission_denied' };
  }

  const alarmAt = buildAlarmDate(options.flightDate, options.alarmHHMM);
  if (!alarmAt) return { ok: false, reason: 'invalid_time' };

  if (alarmAt.getTime() <= Date.now()) {
    return { ok: false, reason: 'alarm_in_past' };
  }

  await LocalNotifications.cancel({ notifications: [{ id: ALARM_NOTIFICATION_ID }] });
  await LocalNotifications.schedule({
    notifications: [
      {
        id: ALARM_NOTIFICATION_ID,
        title: 'ChronoFly Alarm',
        body: `${options.flightNo} wake-up time: ${options.alarmHHMM}`,
        schedule: { at: alarmAt, allowWhileIdle: true },
        sound: undefined,
        smallIcon: 'ic_stat_icon_config_sample',
      },
    ],
  });

  return { ok: true };
}

