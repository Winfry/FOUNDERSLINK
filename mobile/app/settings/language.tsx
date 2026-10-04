import { useState } from 'react';
import { useToast } from '../../src/components/ui/Toast';
import { Note, RadioRow, RowGroup, SettingsPage } from '../../src/components/settings/SettingsPage';
import { API_URL } from '../../src/services/http/client';
import { updatePreferences } from '../../src/services/http/account.http';
import { useAuthStore } from '../../src/stores/authStore';

type Lang = 'en' | 'sw';
const NAMES: Record<Lang, string> = { en: 'English', sw: 'Kiswahili' };

export default function LanguageScreen() {
  const { show } = useToast();
  const saved = useAuthStore((s) => s.user?.preferredLanguage);
  const [lang, setLang] = useState<Lang>(saved === 'sw' ? 'sw' : 'en');

  // With the backend the choice is saved on her account; without it, it stays on this screen.
  const pick = async (next: Lang) => {
    if (next === lang) return;
    const before = lang;
    setLang(next);
    if (!API_URL) return;
    try {
      await updatePreferences({ preferred_language: next });
      show(`Language saved: ${NAMES[next]}`, 'success');
    } catch (e) {
      setLang(before);
      show((e as { message?: string })?.message ?? 'Could not save. Try again.', 'error');
    }
  };

  return (
    <SettingsPage title="Language" heading="Your language" intro="Pick the language you prefer.">
      <RowGroup>
        <RadioRow label="English" selected={lang === 'en'} onPress={() => pick('en')} />
        <RadioRow label="Kiswahili" selected={lang === 'sw'} onPress={() => pick('sw')} last />
      </RowGroup>
      <Note>The screens are in English for now. Your choice is saved on your account for when Kiswahili is ready.</Note>
    </SettingsPage>
  );
}
