// Die Qualitäts- und Rechtsprüfung jeder erzeugten Seite.
//
// Zwei Klassen von Funden:
//   hart  — Rechtsrisiko (fremde Bilder, externe Ressourcen, Skripte).
//           Der Lead wird sofort und sauber abgebrochen, nichts geht live.
//   weich — Handwerk (abgeschriebene Sätze, KI-Floskeln, KI-Farben).
//           Die Seite wird einmal mit konkretem Hinweis neu gebaut; besteht sie
//           dann immer noch nicht, wird nur dieser Lead übersprungen.
//
// Bewusst im Code und nicht nur im Prompt: ein Prompt ist eine Bitte,
// eine Prüfung ist eine Zusage.

// ─────────────────────────────────────────────────────────── Textgewinnung ──

/** Entfernt Stil, Skripte und alle vom Code gesetzten Pflichtbausteine. */
function sichtbarerText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<(div|p|span|section|aside)\b[^>]*\bdata-geruest=[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

const normal = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[*_#>`|\[\]()]/g, ' ')
    .replace(/[«»„“”"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Zerlegt den Originaltext in Sätze — die Vorlage für den Abschreib-Test. */
function saetze(text) {
  return String(text ?? '')
    .split(/(?<=[.!?:])\s+|\n+/)
    .map((s) => normal(s))
    .filter((s) => s.length > 60)
}

// ──────────────────────────────────────────────────────────── Verbotslisten ──

const FLOSKELN = [
  'in der heutigen',
  'ihr partner für',
  'maßgeschneidert',
  'ganzheitlich',
  'willkommen bei',
  'wir freuen uns',
  'exzellenz',
  'leidenschaft',
  'ihre zufriedenheit ist unser',
  'kompetenz und',
  'aus einer hand',
  'rundum-sorglos',
  'rundum sorglos',
  'höchstem niveau',
]

const KI_FARBEN = ['#8b5cf6', '#6366f1', '#a855f7']

const EMOJI =
  /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u

// ───────────────────────────────────────────────────────────────── Prüfung ──

/**
 * Prüft eine fertige Entwurfsseite.
 * @param {string} html            das erzeugte Dokument
 * @param {object} opt
 * @param {string} opt.original    Rohtext der alten Website (Abschreib-Test)
 * @param {string[]} opt.markenSchriften  Hausschriften der Firma
 * @returns {{bestanden:boolean, hart:string[], weich:string[], meldung:string}}
 */
export function pruefeSeite(html, { original = '', markenSchriften = [] } = {}) {
  const hart = []
  const weich = []
  const text = sichtbarerText(html)
  const textKlein = normal(text)

  // ── hart: kein Bild, keine fremde Ressource, kein Skript ──────────────────
  if (/<img[\s/>]/i.test(html)) hart.push('Die Seite enthält ein <img>-Element. Fremde Fotos sind tabu.')
  if (/background-image\s*:/i.test(html)) hart.push('Die Seite setzt ein background-image.')
  if (/url\(\s*["']?(?!#)/i.test(html)) hart.push('Die Seite lädt eine Ressource über url(...).')
  if (/<(iframe|video|audio|embed|object|picture|source|canvas)\b/i.test(html))
    hart.push('Die Seite bindet fremde Medien ein (iframe/video/object …).')
  if (/<script\b/i.test(html)) hart.push('Die Seite enthält JavaScript.')
  if (/\bsrcset\s*=/i.test(html)) hart.push('Die Seite verweist über srcset auf Bilddateien.')
  if (/data:image/i.test(html)) hart.push('Die Seite enthält ein eingebettetes Bild (data:image).')
  if (/<image\b/i.test(html) || /xlink:href/i.test(html))
    hart.push('Ein SVG verweist auf eine fremde Grafik.')

  const externe = [...html.matchAll(/https?:\/\/[^\s"'<>)]+/gi)].map((m) => m[0])
  if (externe.length) hart.push(`Die Seite verweist nach außen: ${externe.slice(0, 3).join(', ')}`)

  // ── hart: die Pflichtkennzeichnung muss dranstehen ───────────────────────
  if (!/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html))
    hart.push('Die Seite trägt kein noindex im <head>.')
  if (!/href=["']impressum\.html["']/i.test(html)) hart.push('Im Footer fehlt der Link zum Impressum.')
  if (!/Unverbindlicher Gestaltungsentwurf/i.test(html)) hart.push('Der Entwurfsbanner fehlt.')

  // ── hart: ohne Kontaktweg ist der Entwurf wertlos ────────────────────────
  // Eine Startseite, die zum Anrufen auffordert und dann keine Nummer zeigt,
  // ist schlechter als die alte Seite. Das darf nie live gehen.
  const hatTelefon = /href=["']tel:/i.test(html)
  const hatMail = /href=["']mailto:/i.test(html)
  if (!hatTelefon && !hatMail)
    hart.push('Die Seite nennt weder Telefonnummer noch E-Mail. Ein Entwurf ohne Kontaktweg ist wertlos.')

  // ── weich: wörtlich abgeschriebene Fließtexte ────────────────────────────
  const abgeschrieben = saetze(original).filter((s) => textKlein.includes(s))
  for (const s of abgeschrieben.slice(0, 3))
    weich.push(`Wörtlich von der alten Seite übernommen: „${s.slice(0, 90)}…"`)

  // ── weich: KI-Handschrift ────────────────────────────────────────────────
  if (text.includes('—')) weich.push('Gedankenstrich (—) im Fließtext. Bitte umformulieren.')

  for (const f of FLOSKELN) if (textKlein.includes(f)) weich.push(`Floskel im Text: „${f}"`)

  for (const c of KI_FARBEN)
    if (html.toLowerCase().includes(c)) weich.push(`KI-Standardfarbe ${c} im Stilbogen.`)

  if (/linear-gradient\(\s*135deg/i.test(html)) weich.push('Verlauf linear-gradient(135deg …) im Layout.')

  if (EMOJI.test(text)) weich.push('Emoji im Text. Icons sind gezeichnet, nicht getippt.')

  const markenKlein = markenSchriften.map((s) => String(s).toLowerCase())
  for (const s of ['inter', 'poppins'])
    if (new RegExp(`\\b${s}\\b`, 'i').test(html) && !markenKlein.includes(s))
      weich.push(`Standardschrift ${s} verwendet, obwohl die Firma sie nicht führt.`)

  // ── weich: Zahlenbehauptungen ohne Beleg im Original ─────────────────────
  const originalKlein = normal(original)
  for (const m of textKlein.matchAll(/\b(über|mehr als|seit)\s+(\d[\d.]*)/g)) {
    if (!originalKlein.includes(m[0])) weich.push(`Zahlenangabe „${m[0]}" steht so nicht auf der alten Seite.`)
  }

  const alle = [...hart, ...weich]
  return {
    bestanden: alle.length === 0,
    hart,
    weich,
    meldung: alle.length ? alle.join(' | ') : 'Qualitätsprüfung bestanden',
  }
}

/** Kurzer, konkreter Korrekturhinweis für den zweiten Versuch. */
export function korrekturHinweis(befund) {
  return `Dein erster Entwurf ist durch die Qualitätsprüfung gefallen. Beheb genau das:

${[...befund.hart, ...befund.weich].map((f) => `- ${f}`).join('\n')}

Schreib die betroffenen Stellen neu. Formuliere jeden Satz eigenständig, nutze keinen
Gedankenstrich (—) im Fließtext, keine Werbefloskeln und keine Zahlen, die nicht
belegt sind. Lieber ein Abschnitt weniger als ein Satz zu viel.`
}
