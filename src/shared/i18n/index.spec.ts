import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('shared/i18n index', () => {
  const localStorageMock = {
    getItem: vi.fn<(key: string) => string | null>(),
    setItem: vi.fn<(key: string, value: string) => void>(),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should initialize locale from localStorage when available', async () => {
    localStorageMock.getItem.mockReturnValue('en');

    const { getLocale } = await import('./index');

    expect(getLocale()).toBe('en');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('triada-locale');
  });

  it('should fallback to spanish locale when there is no saved locale', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { getLocale } = await import('./index');

    expect(getLocale()).toBe('es');
  });

  it('should set locale, persist it, and notify listeners', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { getLocale, onLocaleChange, setLocale } = await import('./index');
    const listener = vi.fn<(locale: 'es' | 'en') => void>();

    const unsubscribe = onLocaleChange(listener);
    setLocale('en');

    expect(getLocale()).toBe('en');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('triada-locale', 'en');
    expect(listener).toHaveBeenCalledWith('en');

    unsubscribe();
    setLocale('es');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should notify all listeners and keep active subscriptions only', async () => {
    localStorageMock.getItem.mockReturnValue('es');

    const { onLocaleChange, setLocale } = await import('./index');
    const listenerA = vi.fn<(locale: 'es' | 'en') => void>();
    const listenerB = vi.fn<(locale: 'es' | 'en') => void>();

    const unsubscribeA = onLocaleChange(listenerA);
    onLocaleChange(listenerB);

    setLocale('en');
    unsubscribeA();
    setLocale('es');

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(2);
  });

  it('should work without localStorage global', async () => {
    vi.unstubAllGlobals();

    const { getLocale, setLocale } = await import('./index');

    expect(getLocale()).toBe('es');
    expect(() => setLocale('en')).not.toThrow();
    expect(getLocale()).toBe('en');
  });
});
