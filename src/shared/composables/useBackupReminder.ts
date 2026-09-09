import { computed, ref } from 'vue';

const LAST_BACKUP_KEY = 'triada-last-backup';
const FIRST_SEEN_KEY = 'triada-first-seen';
const SNOOZE_KEY = 'triada-backup-snooze';

const DAY_MS = 86_400_000;
const REMINDER_AFTER_DAYS = 30;
const SNOOZE_DAYS = 7;

function readNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeNumber(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {}
}

const lastBackupAt = ref<number | null>(readNumber(LAST_BACKUP_KEY));
const snoozedUntil = ref<number>(readNumber(SNOOZE_KEY) ?? 0);

const storedFirstSeen = readNumber(FIRST_SEEN_KEY);
const firstSeenAt = storedFirstSeen ?? Date.now();
if (storedFirstSeen === null) {
  writeNumber(FIRST_SEEN_KEY, firstSeenAt);
}

export function isBackupReminderDue(params: {
  now: number;
  lastBackupAt: number | null;
  anchorAt: number;
  snoozedUntil: number;
}): boolean {
  if (params.now < params.snoozedUntil) {
    return false;
  }
  const reference = params.lastBackupAt ?? params.anchorAt;
  return params.now - reference > REMINDER_AFTER_DAYS * DAY_MS;
}

export function markBackedUp(at: number = Date.now()): void {
  lastBackupAt.value = at;
  writeNumber(LAST_BACKUP_KEY, at);
}

export function useBackupReminder() {
  return {
    reminderDue: computed(() =>
      isBackupReminderDue({
        now: Date.now(),
        lastBackupAt: lastBackupAt.value,
        anchorAt: firstSeenAt,
        snoozedUntil: snoozedUntil.value,
      }),
    ),
    snoozeReminder(): void {
      const until = Date.now() + SNOOZE_DAYS * DAY_MS;
      snoozedUntil.value = until;
      writeNumber(SNOOZE_KEY, until);
    },
  };
}
