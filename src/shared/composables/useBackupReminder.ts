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
  } catch {
    // storage unavailable — the reminder just won't persist
  }
}

// Module-level so every screen reads one value; changed by markBackedUp (after a
// real export/import) and snoozeReminder (on dismiss).
const lastBackupAt = ref<number | null>(readNumber(LAST_BACKUP_KEY));
const snoozedUntil = ref<number>(readNumber(SNOOZE_KEY) ?? 0);

// Anchor for "you've never backed up": first time a reminder-aware screen loaded.
// For a new user that's the year view moments after the setup flow, so it tracks
// close to when there's data worth saving.
const storedFirstSeen = readNumber(FIRST_SEEN_KEY);
const firstSeenAt = storedFirstSeen ?? Date.now();
if (storedFirstSeen === null) {
  writeNumber(FIRST_SEEN_KEY, firstSeenAt);
}

/** Stale (no backup, or older than the threshold, measured from the anchor) and not snoozed. */
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

/** Record that the data is safe as of `at` (a real export ⇒ now; an import ⇒ the file's own date). */
export function markBackedUp(at: number = Date.now()): void {
  lastBackupAt.value = at;
  writeNumber(LAST_BACKUP_KEY, at);
}

export function useBackupReminder() {
  return {
    // Re-evaluates when lastBackupAt / snoozedUntil change (export, import, dismiss).
    // `Date.now()` isn't reactive, so it won't flip true while a screen stays open
    // past the threshold — acceptable for a 30-day nudge.
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
