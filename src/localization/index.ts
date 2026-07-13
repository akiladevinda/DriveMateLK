import { useMemo } from 'react';

import { translations, type TranslationKey } from '@/localization/translations';
import { useSettingsStore, type AppLanguage } from '@/stores/settings-store';

type Dict = (typeof translations)[AppLanguage];

function getByPath(obj: Dict, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);

  return useMemo(() => {
    const dict = translations[language] ?? translations.en;

    function t(path: string): string {
      return getByPath(dict, path) ?? getByPath(translations.en, path) ?? path;
    }

    return { t, language, dict };
  }, [language]);
}

export type { TranslationKey };
