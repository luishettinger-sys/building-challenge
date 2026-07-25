// Jeder Lauf hinterlässt eine eigene Netlify-Site und eine Markdown-Übersicht,
// damit verschickte Links dauerhaft gültig bleiben und nachvollziehbar ist,
// wem was geschickt wurde.

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Eindeutige Kennung für den Lauf — Datum plus Zielgruppe, damit Ordner sprechend sind. */
export function laufNummer(zielgruppe) {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const stempel = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
  const kurz = zielgruppe
    .toLowerCase()
    .replaceAll('ä', 'ae').replaceAll('ö', 'oe').replaceAll('ü', 'ue').replaceAll('ß', 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28)
  return { id: `${stempel}-${kurz}`, siteName: `pitch-${kurz}-${stempel}`.slice(0, 60) }
}

export async function schreibeBericht(ordner, opt, leads, basis) {
  const zeilen = [
    `# Pitch-Lauf: ${opt.zielgruppe}`,
    '',
    `Cockpit: ${basis}`,
    `Leads: ${leads.length}`,
    '',
    '| Firma | Ort | Potenzial | Neue Seite | Kontakt |',
    '| --- | --- | --- | --- | --- |',
    ...leads.map((l) => {
      const a = l.analyse
      const kontakt = a.kontakt?.email || a.kontakt?.telefon || '—'
      return `| ${a.firma} | ${a.ort || '—'} | ${a.potenzial ?? '—'}/10 | ${l.neueSeite} | ${kontakt} |`
    }),
    '',
    '---',
    '',
  ]

  for (const l of leads) {
    zeilen.push(
      `## ${l.analyse.firma}`,
      '',
      `Jetzige Seite: ${l.url}`,
      `Neue Seite: ${l.neueSeite}`,
      '',
      '**Gefundene Schwachstellen**',
      ...(l.analyse.schwachstellen ?? []).map((s) => `- **${s.titel}** — ${s.beobachtung} ${s.kostet}`),
      '',
      '**Mail**',
      '',
      '```',
      `Betreff: ${l.mail.betreff}`,
      '',
      l.mail.koerper,
      '```',
      ''
    )
  }

  await writeFile(join(ordner, 'leads.md'), zeilen.join('\n'), 'utf8')
}
