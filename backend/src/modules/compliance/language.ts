// Compliance items in the member's language. Each item has English text,
// and may have Kiswahili text; where the Kiswahili is missing the English
// is shown, so a member never sees an empty line.

import { prisma } from "../../shared/db.js";

export type Lang = "en" | "sw";

export const asLang = (value: string | null | undefined): Lang => (value === "sw" ? "sw" : "en");

export async function languageOf(userId: string): Promise<Lang> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { preferred_language: true } });
  return asLang(user?.preferred_language);
}

interface ItemText {
  title: string;
  why: string | null;
  when_to_get_help: string | null;
  title_sw: string | null;
  why_sw: string | null;
  when_to_get_help_sw: string | null;
}

export function itemText(item: ItemText, lang: Lang) {
  const sw = lang === "sw";
  return {
    title: (sw && item.title_sw) || item.title,
    why: (sw && item.why_sw) || item.why,
    when_to_get_help: (sw && item.when_to_get_help_sw) || item.when_to_get_help,
  };
}
