import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getMemberById } from '../../src/services/mocks/mock-store';
import { useToast } from '../../src/components/ui/Toast';
import { Note, RadioRow, RowGroup, SettingsPage } from '../../src/components/settings/SettingsPage';
import { API_URL } from '../../src/services/http/client';
import { updatePreferences } from '../../src/services/http/account.http';
import { useAuthStore } from '../../src/stores/authStore';

type Lang = 'en' | 'sw';
const NAMES: Record<Lang, string> = { en: 'English', sw: 'Kiswahili' };

export default function LanguageScreen() {
  const { show } = useToast();
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const queryClient = useQueryClient();
  const [lang, setLang] = useState<Lang>(user?.preferredLanguage === 'sw' ? 'sw' : 'en');

  // With the backend the choice is saved on her account; without it, it stays on this screen.
  // Readiness items come in her language, so they are fetched again once it changes.
  const applied = async (next: Lang) => {
    await patchUser({ preferredLanguage: next });
    await queryClient.invalidateQueries({ queryKey: ['compliance'] });
    show(`Language saved: ${NAMES[next]}`, 'success');
  };

  const pick = async (next: Lang) => {
    if (next === lang) return;
    const before = lang;
    setLang(next);
    if (!API_URL) {
      // Demo data: the choice is kept on the demo member, for this visit.
      const member = user ? getMemberById(user.id) : null;
      if (member) member.user.preferredLanguage = next;
      await applied(next);
      return;
    }
    try {
      await updatePreferences({ preferred_language: next });
      await applied(next);
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
      <Note>
        In Kiswahili, your readiness checklist and its explanations are shown in Kiswahili. The rest of the screens are in
        English for now. The AI Co-pilot answers in the language you ask in.
      </Note>
    </SettingsPage>
  );
}
