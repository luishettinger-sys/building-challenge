// Die drei Denk-Schritte der Pitch-Maschine: analysieren, bauen, anschreiben.

import { frageClaudeJSON, frageClaudeHTML, frageClaude } from './claude.mjs'

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
    { model: 'sonnet' }
  )
  daten.schwachstellen = (daten.schwachstellen ?? []).slice(0, 3)
  return daten
}

/** Schritt 2 — die neue Startseite bauen, in den Farben der Firma. */
export function baueSeite(analyse, seite) {
  const farben = seite.branding?.colors ?? {}
  return frageClaudeHTML(
    `Baue die neue Startseite für diese Firma. Sie wird live ins Netz gestellt und
dem Inhaber als Vorschlag geschickt. Sie muss auf den ersten Blick deutlich besser
wirken als das, was er heute hat.

FIRMA: ${analyse.firma}
BRANCHE: ${analyse.branche}
ORT: ${analyse.ort}
LEISTUNGEN: ${JSON.stringify(analyse.kernleistungen)}
ZIELGRUPPE: ${analyse.zielgruppe}
TONALITÄT: ${analyse.tonalitaet}
KONTAKT: ${JSON.stringify(analyse.kontakt)}
STÄRKE: ${analyse.staerke}
DAS SOLL DIE NEUE SEITE BESSER MACHEN: ${JSON.stringify(analyse.schwachstellen)}

MARKENFARBEN DER FIRMA (aus der alten Seite ausgelesen — benutze sie, damit die
Seite nach DIESER Firma aussieht und nicht nach Vorlage):
${JSON.stringify(farben)}

INHALTE DER ALTEN SEITE (nimm echte Texte, Namen und Leistungen von dort):
"""
${seite.markdown.slice(0, 9000)}
"""

Anforderungen:
- Ein einziges, vollständiges HTML-Dokument. Alles inline: CSS im <style>, kein
  externes Framework, keine externen Schriften, keine externen Bilder, kein
  JavaScript von fremden Servern. Die Seite muss offline aussehen wie online.
- Auf Deutsch. Echte Inhalte der Firma, keine Blindtexte, kein "Lorem ipsum",
  keine Platzhalter in eckigen Klammern.

WAHRHEITSPFLICHT — das ist die wichtigste Regel:
- Verwende ausschließlich Angaben, die oben im Inhalt der alten Seite wirklich
  vorkommen. Erfinde NICHTS: keine Kundenstimmen, keine Bewertungen oder Sterne,
  keine Auszeichnungen, Siegel oder Zertifikate, keine Zahlen (Jahre Erfahrung,
  Patientenzahlen, Prozente), keine Namen von Personen, keine Öffnungszeiten und
  keine Preise, die dort nicht stehen.
- Wenn eine Information fehlt, lass den ganzen Abschnitt weg. Eine kürzere, wahre
  Seite ist besser als eine vollständige, erfundene.

PFLICHT-KENNZEICHNUNG (die Seite wird öffentlich erreichbar sein):
- Im <head>: <meta name="robots" content="noindex, nofollow">
- Direkt nach <body> ein schmaler, ruhiger Hinweisbalken über die volle Breite,
  gedeckte Farbe, kleine Schrift, gut lesbar:
  "Unverbindlicher Gestaltungsentwurf · Keine offizielle Seite von ${analyse.firma}"
- Aufbau: fixierte schlanke Navigation · Hero mit klarem Nutzenversprechen und
  sichtbarem Haupt-Button (Termin/Kontakt/Anfrage — passend zur Branche) ·
  Leistungen als Karten mit Icon · ein Abschnitt Vertrauen (Team, Ablauf oder
  Argumente) · ein ruhiger Zitat- oder Aussagen-Block · Kontaktbereich mit den
  echten Kontaktdaten · schlichter Footer.
- Icons ausschließlich als Inline-SVG, schlicht und einheitlich (Strichstärke 1.5,
  currentColor). Keine Emojis als Icons.
- Statt Fotos: ruhige Flächen aus den Markenfarben, sanfte Verläufe, viel
  Weißraum. Nichts Buntes, nichts Verspieltes.
- Modern und wertig: großzügige Abstände, klare Typo-Hierarchie (Überschrift
  deutlich größer als Fließtext), weiche Ecken, dezente Schatten, feine Trennlinien.
- Vollständig responsiv über CSS-Grid/Flexbox mit relativen Einheiten. Auf dem
  Handy einspaltig und gut lesbar, Buttons groß genug zum Antippen.
- Zugänglich: echte Kontraste, semantische Tags, alt-Texte, sinnvolle Titel.
- Im Footer zusätzlich ein kleiner grauer Absatz: dass dies ein unaufgefordert
  erstellter Gestaltungsvorschlag ist, dass alle Inhalte von der öffentlich
  erreichbaren Website des Unternehmens stammen, und dass die Seite auf Zuruf
  sofort entfernt wird.

Gib nur das HTML-Dokument aus, beginnend mit <!DOCTYPE html>. Kein Kommentar davor
oder danach.`,
    { model: 'sonnet' }
  )
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
- Danach die Mail. Höchstens 130 Wörter. Kurze Absätze.
- Ton: ein Mensch, der sich die Seite wirklich angesehen hat. Direkt, freundlich,
  auf Augenhöhe, kein Agentur-Sprech, keine Superlative, keine Emojis.
- Aufbau: ein Satz, der zeigt dass du die Firma kennst (nimm die Stärke) · ein bis
  zwei konkrete Beobachtungen von der jetzigen Seite und was sie kosten · der
  Satz, dass du eine neue Startseite schon gebaut hast und sie hier live ansehen
  kann: ${url} · Schluss mit einer leichten Frage, die eine Antwort einfach macht.
- Kein Preis, kein Vertrag, kein Druck, keine Frist.
- Duzen nur, wenn die Branche das trägt — im Zweifel siezen.
- Unterschrift mit ${absender.name}.`,
    { model: 'sonnet' }
  )

  const zeilen = text.split('\n')
  const i = zeilen.findIndex((z) => /^betreff\s*:/i.test(z.trim()))
  if (i === -1) return { betreff: `Ein Vorschlag für ${analyse.firma}`, koerper: text.trim() }
  return {
    betreff: zeilen[i].replace(/^betreff\s*:\s*/i, '').trim(),
    koerper: zeilen.slice(i + 1).join('\n').trim(),
  }
}
