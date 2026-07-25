// Die drei Denk-Schritte der Pitch-Maschine: analysieren, texten, anschreiben.
//
// Wichtig für Schritt 2: Claude baut kein HTML mehr. Er entscheidet, WAS auf der
// Seite steht (Reihenfolge, Überschriften, Texte) — WIE das aussieht, legt
// src/vorlage.mjs im Code fest. Agent ist Regie, Code ist Kamera.

import { frageClaudeJSON, frageClaude } from './claude.mjs'
import { baueSeiteHTML, farbwelt, schriften, saeubere, ICON_NAMEN } from './vorlage.mjs'

export const ZEITLIMIT = {
  scrape: 90_000,
  analyse: 120_000,
  seitenbau: 180_000,
  mail: 120_000,
}

/** Schritt 1 — Website lesen und die echten Schwachstellen benennen. */
export async function analysiere(lead, seite) {
  const daten = await frageClaudeJSON(
    `Du bist ein erfahrener Webdesigner und schaust dir die Website eines möglichen Kunden an.

FIRMA: ${lead.titel}
URL: ${lead.url}
SEITENTITEL: ${seite.titel}
META-BESCHREIBUNG: ${seite.beschreibung}
MARKENFARBEN (automatisch ausgelesen): ${JSON.stringify(seite.branding?.colors ?? {})}
SCHRIFTEN: ${JSON.stringify(seite.branding?.typography?.fontFamilies ?? {})}

INHALT DER STARTSEITE:
"""
${seite.markdown}
"""

Analysiere diese Firma und ihre Startseite. Gib dieses JSON zurück:

{
  "firma": "offizieller Firmenname, sauber, ohne Werbezusätze",
  "branche": "in 2-4 Wörtern",
  "ort": "Stadt, falls erkennbar, sonst leer",
  "kernleistungen": ["3-5 Leistungen, die die Firma laut Seite anbietet"],
  "zielgruppe": "wen die Firma anspricht, ein Satz",
  "tonalitaet": "wie die Firma über sich spricht, ein Satz",
  "kontakt": { "telefon": "", "email": "", "adresse": "" },
  "schwachstellen": [
    { "titel": "kurz und konkret, max 6 Wörter",
      "beobachtung": "was du auf DIESER Seite konkret siehst, ein Satz",
      "kostet": "was diese Schwäche die Firma an Kunden oder Umsatz kostet, ein Satz" }
  ],
  "staerke": "eine ehrliche Sache, die die Firma gut macht, ein Satz",
  "potenzial": 7
}

Regeln:
- Genau 3 Schwachstellen. Sie müssen aus dem echten Inhalt oben ableitbar sein.
  Beispiele für gute Schwachstellen: kein sichtbarer Termin- oder Kontakt-Button
  weit oben, Leistungen als Textwüste statt greifbar, kein Vertrauensbeweis
  (Bewertungen, Team, Fotos), unklar was die Firma eigentlich anbietet,
  Fachsprache statt Kundennutzen, keine erkennbare Handlungsaufforderung.
- Erfinde nichts. Keine Behauptungen über Ladezeit oder Technik, die du hier
  nicht sehen kannst.
- "potenzial": 1-10, wie viel eine neue Startseite dieser Firma bringen würde.
- Schreib auf Deutsch, sachlich, nicht überheblich. Der Firmeninhaber soll das
  lesen können, ohne sich angegriffen zu fühlen.`,
    { model: 'sonnet', zeitlimit: ZEITLIMIT.analyse }
  )

  daten.schwachstellen = (daten.schwachstellen ?? []).slice(0, 3)
  daten.kontakt = {
    telefon: saeubere(daten.kontakt?.telefon, 40),
    email: saeubere(daten.kontakt?.email, 80),
    adresse: saeubere(daten.kontakt?.adresse, 120),
  }
  return daten
}

/**
 * Schritt 2 — die Texte der neuen Startseite. Zurück kommt fertiges HTML,
 * gerendert vom festen Gerüst.
 * @param {string} korrektur  Hinweis aus einer fehlgeschlagenen Prüfung
 */
export async function baueSeite(analyse, seite, korrektur = '') {
  const roh = await frageClaudeJSON(inhaltsPrompt(analyse, seite, korrektur), {
    model: 'sonnet',
    zeitlimit: ZEITLIMIT.seitenbau,
  })

  const inhalt = formeInhalt(roh, analyse)
  const html = baueSeiteHTML(inhalt, {
    firma: analyse.firma,
    farben: farbwelt(seite.branding),
    schriften: schriften(seite.branding),
    kontakt: analyse.kontakt,
  })
  return { html, inhalt }
}

function inhaltsPrompt(analyse, seite, korrektur) {
  return `Du schreibst die Texte für einen neuen Startseiten-Entwurf. Layout, Farben,
Typografie und Abstände stehen bereits fest — du lieferst ausschließlich Inhalte
und die Reihenfolge der Abschnitte.

FIRMA: ${analyse.firma}
BRANCHE: ${analyse.branche}
ORT: ${analyse.ort}
LEISTUNGEN LAUT ALTER SEITE: ${JSON.stringify(analyse.kernleistungen)}
ZIELGRUPPE: ${analyse.zielgruppe}
TONALITÄT DER FIRMA: ${analyse.tonalitaet}
DAS SOLL DIE NEUE SEITE BESSER MACHEN: ${JSON.stringify(analyse.schwachstellen)}

INHALT DER ALTEN SEITE (Faktenquelle, NICHT Textvorlage):
"""
${seite.markdown.slice(0, 9000)}
"""

WAS DU ÜBERNEHMEN DARFST — und was nicht:
- Übernehmen erlaubt sind reine Sachangaben: Firmenname, Leistungen, Ort,
  Adresse, Telefon, E-Mail, Öffnungszeiten.
- Fließtexte musst du komplett neu formulieren. Kein einziger Satz der alten
  Seite darf wörtlich auftauchen, auch keine halben Sätze.
- Weder erfinden noch übernehmen darfst du: Kundenstimmen, Zitate, Bewertungen,
  Sterne, Zertifikate, Siegel, Auszeichnungen, Namen von Personen, Jahreszahlen,
  Gründungsjahre, Mitarbeiterzahlen, Kundenzahlen, Prozentwerte und Preise.
  Ein Abschnitt, der ohne so etwas nicht funktioniert, entfällt ersatzlos.
- Verwende keinerlei Bilder, Fotos, Logos oder externe Ressourcen. Kein <img>,
  keine externen URLs. Nur Farbflächen, CSS-Verläufe aus den Markenfarben und
  Inline-SVG-Icons, die du selbst zeichnest. Kein Logo: der Firmenname
  erscheint ausschließlich als Textschriftzug.

SPRACHE:
- Deutsch, Sie-Form, ruhig und konkret. So, wie ein guter Handwerker redet:
  was er macht, für wen, und was der Kunde davon hat.
- Verboten sind Gedankenstriche (—) im Fließtext, Emojis und diese Floskeln:
  "in der heutigen", "Ihr Partner für", "maßgeschneidert", "ganzheitlich",
  "Willkommen bei", "Wir freuen uns", "Exzellenz", "Leidenschaft",
  "Ihre Zufriedenheit ist unser", "Kompetenz und", "aus einer Hand",
  "Rundum-sorglos", "höchstem Niveau".
- Keine Superlative und keine Werbeadjektive ohne Inhalt. Lieber ein konkretes
  Detail als drei schöne Wörter.

GIB GENAU DIESES JSON ZURÜCK:

{
  "titel": "Seitentitel für den Browser-Tab, max 70 Zeichen",
  "beschreibung": "Meta-Beschreibung, ein Satz, max 160 Zeichen",
  "wortmarke": "Firmenname als kurzer Textschriftzug, max 30 Zeichen",
  "hero": {
    "auge": "Kurze Einordnung, z.B. Branche und Ort, max 45 Zeichen",
    "titel": "Die stärkste Aussage der Seite, ein Satz, konkret, max 85 Zeichen",
    "text": "Zwei Sätze: was die Firma macht und für wen. Max 260 Zeichen",
    "aktion": "Text des Hauptbuttons, 2-3 Wörter",
    "zweitAktion": "Text des zweiten, leiseren Buttons, 2-3 Wörter"
  },
  "abschnitte": [
    {
      "typ": "leistungen",
      "menue": "ein Wort fürs Menü",
      "auge": "Kurzlabel, max 30 Zeichen",
      "titel": "Überschrift des Abschnitts",
      "text": "Ein bis zwei Sätze Einleitung",
      "punkte": [ { "titel": "Leistung", "text": "Ein bis zwei Sätze dazu" } ]
    },
    {
      "typ": "ablauf",
      "menue": "Ablauf",
      "auge": "", "titel": "", "text": "",
      "punkte": [ { "titel": "Schritt", "text": "Was dabei passiert" } ]
    },
    {
      "typ": "argumente",
      "menue": "Warum wir",
      "auge": "", "titel": "", "text": "",
      "punkte": [ { "titel": "", "text": "", "icon": "haken" } ]
    },
    {
      "typ": "aussage",
      "menue": "",
      "titel": "Eine ruhige Aussage der Firma über ihre Arbeit, max 180 Zeichen",
      "text": "Optional ein Satz Ergänzung"
    },
    { "typ": "kontakt", "menue": "Kontakt", "auge": "", "titel": "", "text": "" }
  ]
}

Regeln für die Abschnitte:
- 4 bis 5 Abschnitte. "leistungen" und "kontakt" sind Pflicht, "kontakt" steht
  immer am Schluss. Aus "ablauf", "argumente" und "aussage" wählst du, was zu
  dieser Firma wirklich passt. Jeden Typ höchstens einmal.
- "leistungen": 3 bis 6 Punkte, aus den echten Leistungen der Firma.
- "ablauf": 3 oder 4 Schritte, wie eine Zusammenarbeit konkret abläuft.
- "argumente": 2 oder 3 Punkte, warum man diese Firma nimmt. Nur belegbare
  Gründe aus dem Inhalt oben, keine Auszeichnungen, keine Zahlen.
- "aussage" ist ein Satz der Firma über die eigene Arbeit, kein Kundenzitat.
- "icon" wählst du aus dieser Liste: ${ICON_NAMEN.join(', ')}.
- Die Kontaktdaten setzt der Code selbst ein. Schreib im Kontaktabschnitt nur
  Überschrift und Einleitungstext, keine Telefonnummern und keine Adresse.
${korrektur ? `\nKORREKTUR AUS DER LETZTEN PRÜFUNG:\n${korrektur}\n` : ''}`
}

// ────────────────────────────────────── Modellantwort in Form bringen ──────

const ERLAUBT = ['leistungen', 'ablauf', 'argumente', 'aussage', 'kontakt']
const ERSATZ_TITEL = {
  leistungen: 'Was wir machen',
  ablauf: 'So läuft es ab',
  argumente: 'Warum wir',
  aussage: '',
  kontakt: 'Sprechen wir über Ihr Vorhaben',
}
const ERSATZ_MENUE = { leistungen: 'Leistungen', ablauf: 'Ablauf', argumente: 'Warum wir', aussage: '', kontakt: 'Kontakt' }
const GRENZEN = { leistungen: [2, 6], ablauf: [2, 4], argumente: [2, 3] }

/** Kappt, säubert und ergänzt, bis die Struktur garantiert renderbar ist. */
function formeInhalt(roh, analyse) {
  const gesehen = new Set()
  const abschnitte = []

  for (const a of Array.isArray(roh?.abschnitte) ? roh.abschnitte : []) {
    const typ = String(a?.typ ?? '').toLowerCase().trim()
    if (!ERLAUBT.includes(typ) || gesehen.has(typ)) continue

    const punkte = (Array.isArray(a.punkte) ? a.punkte : [])
      .map((p) => ({
        titel: saeubere(p?.titel, 70),
        text: saeubere(p?.text, 260),
        icon: ICON_NAMEN.includes(String(p?.icon)) ? String(p.icon) : 'haken',
      }))
      .filter((p) => p.titel)

    const grenze = GRENZEN[typ]
    if (grenze && punkte.length < grenze[0]) continue // halbe Abschnitte lieber weglassen

    const menueText = saeubere(a.menue, 18) || ERSATZ_MENUE[typ]
    gesehen.add(typ)
    abschnitte.push({
      typ,
      id: typ === 'argumente' ? 'vertrauen' : typ,
      menueText,
      imMenue: Boolean(menueText),
      auge: saeubere(a.auge, 40),
      titel: saeubere(a.titel, typ === 'aussage' ? 200 : 90) || ERSATZ_TITEL[typ],
      text: saeubere(a.text, 300),
      punkte: grenze ? punkte.slice(0, grenze[1]) : [],
    })
  }

  // Kontakt ist Pflicht und steht immer am Schluss.
  const ohneKontakt = abschnitte.filter((a) => a.typ !== 'kontakt')
  const kontakt = abschnitte.find((a) => a.typ === 'kontakt') ?? {
    typ: 'kontakt',
    id: 'kontakt',
    menueText: 'Kontakt',
    imMenue: true,
    auge: 'Kontakt',
    titel: ERSATZ_TITEL.kontakt,
    text: '',
    punkte: [],
  }

  const hero = roh?.hero ?? {}
  const ortZusatz = analyse.ort ? ` in ${analyse.ort}` : ''

  return {
    titel: saeubere(roh?.titel, 80) || `${analyse.firma} · ${analyse.branche}${ortZusatz}`,
    beschreibung: saeubere(roh?.beschreibung, 170) || `${analyse.branche}${ortZusatz}.`,
    wortmarke: saeubere(roh?.wortmarke, 34) || analyse.firma,
    hero: {
      auge: saeubere(hero.auge, 50) || `${analyse.branche}${ortZusatz}`.trim(),
      titel: saeubere(hero.titel, 110) || analyse.firma,
      text: saeubere(hero.text, 300) || analyse.zielgruppe,
      aktion: saeubere(hero.aktion, 26) || 'Kontakt aufnehmen',
      zweitAktion: saeubere(hero.zweitAktion, 26) || 'Leistungen ansehen',
    },
    abschnitte: [...ohneKontakt, kontakt],
  }
}

/** Schritt 3 — die Mail, die den Link auf die neue Seite trägt. */
export async function schreibeMail(analyse, url, absender) {
  const text = await frageClaude(
    `Schreib die Akquise-Mail an ${analyse.firma}.

BRANCHE: ${analyse.branche}
ORT: ${analyse.ort}
WAS AUF DER JETZIGEN SEITE FEHLT: ${JSON.stringify(analyse.schwachstellen)}
WAS DIE FIRMA GUT MACHT: ${analyse.staerke}
LINK ZUR NEUEN SEITE, DIE ICH SCHON GEBAUT HABE: ${url}

ABSENDER: ${absender.name}${absender.firma ? ', ' + absender.firma : ''}

Regeln:
- Erste Zeile: "Betreff: ..." — konkret, kein Werbe-Ton, keine Großbuchstaben-Schreie.
- Danach die Mail. Höchstens 140 Wörter. Kurze Absätze.
- Ton: ein Mensch, der sich die Seite wirklich angesehen hat. Direkt, freundlich,
  auf Augenhöhe, kein Agentur-Sprech, keine Superlative, keine Emojis.
- Aufbau: ein Satz, der zeigt dass du die Firma kennst (nimm die Stärke) · ein bis
  zwei konkrete Beobachtungen von der jetzigen Seite und was sie kosten · der
  Satz, dass du eine neue Startseite schon gebaut hast und sie hier live ansehen
  kann: ${url} · Schluss mit einer leichten Frage, die eine Antwort einfach macht.
- Ein kurzer Satz muss klarstellen: der Entwurf ist unverbindlich, keine
  offizielle Seite der Firma und wird auf Zuruf sofort gelöscht.
- Kein Preis, kein Vertrag, kein Druck, keine Frist.
- Duzen nur, wenn die Branche das trägt — im Zweifel siezen.
- Unterschrift mit ${absender.name}.`,
    { model: 'sonnet', zeitlimit: ZEITLIMIT.mail }
  )

  const zeilen = text.split('\n')
  const i = zeilen.findIndex((z) => /^betreff\s*:/i.test(z.trim()))
  if (i === -1) return { betreff: `Ein Vorschlag für ${analyse.firma}`, koerper: text.trim() }
  return {
    betreff: zeilen[i].replace(/^betreff\s*:\s*/i, '').trim(),
    koerper: zeilen.slice(i + 1).join('\n').trim(),
  }
}
