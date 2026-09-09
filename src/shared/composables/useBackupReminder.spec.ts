import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
const DAY = 86_400_000;

async function loadModule() {
  return import('./useBackupReminder');
}

beforeEach(() => {
  vi.resetModules();
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });
});

describe('isBackupReminderDue', () => {
  it('should be due when the reference date is older than the threshold and not snoozed', async () => {
    const { isBackupReminderDue } = await loadModule();
    const now = 100 * DAY;

    expect(
      isBackupReminderDue({ now, lastBackupAt: now - 40 * DAY, anchorAt: 0, snoozedUntil: 0 }),
    ).toBe(true);
    expect(
      isBackupReminderDue({ now, lastBackupAt: now - 10 * DAY, anchorAt: 0, snoozedUntil: 0 }),
    ).toBe(false);
  });

  it('should fall back to the anchor date when there is no backup', async () => {
    const { isBackupReminderDue } = await loadModule();
    const now = 100 * DAY;

    expect(
      isBackupReminderDue({ now, lastBackupAt: null, anchorAt: now - 40 * DAY, snoozedUntil: 0 }),
    ).toBe(true);
    expect(
      isBackupReminderDue({ now, lastBackupAt: null, anchorAt: now - 5 * DAY, snoozedUntil: 0 }),
    ).toBe(false);
  });

  it('should not be due while snoozed', async () => {
    const { isBackupReminderDue } = await loadModule();
    const now = 100 * DAY;

    expect(
      isBackupReminderDue({
        now,
        lastBackupAt: now - 40 * DAY,
        anchorAt: 0,
        snoozedUntil: now + DAY,
      }),
    ).toBe(false);
  });
});

describe('useBackupReminder', () => {
  it('should seed the first-seen anchor once and reuse it', async () => {
    await loadModule();
    const seeded = store.get('triada-first-seen');
    expect(seeded).toBeDefined();

    vi.resetModules();
    await loadModule();
    expect(store.get('triada-first-seen')).toBe(seeded);
  });

  it('should be due for a user who has a stale anchor and never backed up', async () => {
    store.set('triada-first-seen', String(Date.now() - 200 * DAY));
    const { useBackupReminder } = await loadModule();

    expect(useBackupReminder().reminderDue.value).toBe(true);
  });

  it('should clear after markBackedUp', async () => {
    store.set('triada-first-seen', String(Date.now() - 200 * DAY));
    const { useBackupReminder, markBackedUp } = await loadModule();
    const reminder = useBackupReminder();

    expect(reminder.reminderDue.value).toBe(true);
    markBackedUp();
    expect(reminder.reminderDue.value).toBe(false);
  });

  it('should treat an old markBackedUp date as still due', async () => {
    store.set('triada-first-seen', String(Date.now()));
    const { useBackupReminder, markBackedUp } = await loadModule();
    const reminder = useBackupReminder();

    markBackedUp(Date.now() - 45 * DAY);
    expect(reminder.reminderDue.value).toBe(true);
  });

  it('should clear after a snooze', async () => {
    store.set('triada-first-seen', String(Date.now() - 200 * DAY));
    const { useBackupReminder } = await loadModule();
    const reminder = useBackupReminder();

    expect(reminder.reminderDue.value).toBe(true);
    reminder.snoozeReminder();
    expect(reminder.reminderDue.value).toBe(false);
  });

  it('should degrade gracefully when storage is unavailable', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    const { useBackupReminder, markBackedUp } = await loadModule();

    expect(() => markBackedUp()).not.toThrow();
    expect(typeof useBackupReminder().reminderDue.value).toBe('boolean');
  });
});
