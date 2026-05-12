import type { AppLanguage } from '../locales/translations';

const LANGUAGE_STORAGE_KEY = 'fridgechef.language';
let memoryLanguage: AppLanguage | null = null;

type LocalStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function getLocalStorage(): LocalStorageLike | null {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    return globalThis.localStorage as LocalStorageLike;
  }

  return null;
}

function isSupportedLanguage(value: string | null): value is AppLanguage {
  return value === 'en' || value === 'zh';
}

// Lightweight AsyncStorage-style helpers. If @react-native-async-storage/async-storage
// is added later, this small adapter can be replaced without changing App.tsx.
export const languageStorage = {
  async getItem(): Promise<AppLanguage | null> {
    const storedValue = getLocalStorage()?.getItem(LANGUAGE_STORAGE_KEY) ?? memoryLanguage;
    return isSupportedLanguage(storedValue) ? storedValue : null;
  },

  async setItem(language: AppLanguage): Promise<void> {
    memoryLanguage = language;
    getLocalStorage()?.setItem(LANGUAGE_STORAGE_KEY, language);
  },
};
