# Pitch-Maschine

> Statt eine Akquise-Mail zu schreiben, baut dieser Agent den Beweis:
> echte Firma rein, fertige Live-Seite in ihren echten Farben raus.

```bash
node bin/pitch.mjs "Malerbetriebe in Wiesbaden" --anzahl 2
```

## Das Problem

Ich baue und verkaufe Websites. Der teuerste Teil daran ist nicht das Bauen,
sondern die Akquise. Für einen einzigen ernsthaften Pitch sitze ich rund 90
Minuten: Firmen suchen, Website ansehen, Schwachstellen notieren, eine Mail
schreiben, die nicht nach Massenmail klingt. Und selbst dann ist die Mail nur
eine Behauptung — „ich könnte das besser". Kein Beweis. Deshalb bleibt Akquise
liegen, und ohne Akquise kommt kein Auftrag.

## Was der Agent macht

Du gibst ihm eine Zielgruppe. Er sucht echte Betriebe im Netz und wirft Portale
und Branchenverzeichnisse raus. Von jedem Betrieb liest er die Startseite und
notiert drei konkrete Schwachstellen — Dinge, die man auf dem Screenshot
nachprüfen kann, nicht Geschmacksurteile. Aus den echten Inhalten baut er der
Firma eine neue Startseite in ihren eigenen Markenfarben, prüft sie und stellt
sie live. Zum Schluss schreibt er die passende Mail mit dem Link darauf.

Am Ende öffnet sich ein Cockpit: pro Betrieb die heutige Seite, was ihr fehlt,
die neue Seite als klickbarer Link und die fertige Mail zum Kopieren.

Aus 90 Minuten Handarbeit werden gut zwei Minuten Rechenzeit. Und statt einer
Behauptung verschickst du etwas, das der Empfänger anklicken kann.

**Der Agent verschickt nichts.** Warum, steht in [RECHT.md](RECHT.md).

## Stack

- [x] Claude Code (Agent / Skills) — headless über `claude -p`, für Analyse, Texte und Seitenaufbau
- [ ] n8n
- [x] Sonstiges: Node.js (Orchestrierung, Layout-Gerüst, Qualitätsprüfung), Firecrawl (Suche, Auslesen, Screenshots, Markenfarben), Netlify (Veröffentlichung)

Die Arbeitsteilung folgt Sebastians Prinzip aus dem Video-Cutter — Agent =
Regie, Code = Kamera: Claude entscheidet, **was** auf die Seite kommt, der Code
entscheidet, **wie** sie aussieht. Deshalb liegen Layout, Typografie und Raster
fest in `src/vorlage.mjs` und nicht im Prompt. Eine erzeugte Seite kann dadurch
inhaltlich schwach sein, aber nicht mehr hässlich.

## Setup

Siehe **[INSTALL.md](INSTALL.md)** — die Datei ist an Claude Code adressiert.
Repo klonen, Claude die INSTALL.md lesen lassen, er richtet den Rest ein.

## Was während der Challenge entstanden ist

- Die komplette Pitch-Maschine: Suche, Auslesen, Analyse, Seitenbau,
  Qualitätsprüfung, Veröffentlichung, Mailentwurf, Cockpit, Löschbefehl.
  Alles am 25.07.2026 entstanden, die Commit-Historie zeigt den Verlauf.
- Das deterministische Layout-Gerüst (`src/vorlage.mjs`) und die automatische
  Qualitätsprüfung (`src/pruefe.mjs`) — der Teil, der verhindert, dass die
  Ergebnisse nach Baukasten aussehen.
- Die rechtliche Härtung: keine fremden Bilder oder Logos, keine wörtlich
  übernommenen Texte, Entwurfskennzeichnung, `noindex`, eigenes Impressum,
  Löschbefehl.

## Was schon vorher existierte

Ehrlich getrennt: Konten und Werkzeuge, kein Code.

- Firecrawl-Konto, Netlify-Konto, Claude-Code-Abo waren vorhanden.
- Erfahrung mit Netlify-Deploys aus anderen Projekten.
- Kein einziger Codebaustein dieses Agenten stammt aus einem früheren Projekt.

## Learnings

- **`--allowed-tools ""` schaltet Claudes Werkzeuge nicht ab.** Der Unterschied
  ist `--tools ""`. Vorher hat der Subprozess die erzeugte Seite brav als Datei
  auf meine Platte geschrieben, statt sie zurückzugeben — und dabei sogar einen
  Eintrag in meinem Gedächtnis hinterlassen. Ein Agent, der Werkzeuge hat, wird
  sie benutzen.
- **Eine Regel im Prompt ist keine Garantie.** Ich hatte „erfinde nichts"
  ausdrücklich hineingeschrieben. Claude hat daraufhin nichts erfunden — aber
  zwei echte Kundenstimmen inklusive Namen wörtlich von der fremden Seite
  kopiert. Formal regelkonform, urheberrechtlich heikel. Was wirklich gelten
  soll, muss nach der Generierung im Code geprüft werden, nicht davor erbeten.
- **Der teuerste Fehler war fast unsichtbar.** `netlify deploy --site-name`
  legt keine neue Site an, wenn der Ordner schon mit einer verknüpft ist — ein
  neuer Lauf hätte die Entwürfe des vorigen überschrieben, obwohl deren Links
  längst in Mails stehen. Aufgefallen ist das erst beim zweiten Testlauf.
- **Was lokal bleiben soll, muss man beim Bauen entscheiden.** Mein erstes
  Cockpit wurde mitveröffentlicht — samt Screenshots fremder Websites. Jetzt
  geht nur noch der Ordner mit den eigenen Entwürfen ins Netz.

## Grenzen (ehrlich)

- **Er verschickt nichts und wird es nie tun.** Das ist keine fehlende Funktion,
  sondern eine Entscheidung ([RECHT.md](RECHT.md)).
- **Die Entwürfe sind Entwürfe.** Sieh dir jeden einmal an, bevor du ihn
  verlinkst. „100 % ohne Draufschauen" gibt es hier nicht.
- **Bilderlos.** Die Entwurfsseiten enthalten keine Fotos, weil fremde Bilder
  geschützt sind. Das ist rechtlich sauber, wirkt aber zurückhaltender als eine
  fertige Website mit echten Aufnahmen.
- **Dünne Website, dünne Analyse.** Steht auf der Startseite kaum etwas, hat der
  Agent wenig, woraus er arbeiten kann. Zwei Betriebe von fünf werden bei
  manchen Suchen übersprungen — kaputte Seite, Bot-Sperre, oder die
  Qualitätsprüfung schlägt an.
- **Die Suche ist nur so gut wie die Zielgruppe.** „Handwerker" liefert Portale,
  „Malerbetriebe in Wiesbaden" liefert Betriebe.
- **Getestet auf macOS** mit Node 26. Andere Systeme sollten laufen, sind aber
  ungetestet.
- **Keine Erfolgsversprechen.** Ich habe mit diesem Werkzeug noch keinen Kunden
  gewonnen — es ist einen Tag alt. Was es nachweislich tut, ist die 90 Minuten
  Vorarbeit auf zwei Minuten zu drücken.

## Kosten

Gemessen, nicht geschätzt:

| Posten | Kosten |
| --- | --- |
| Firecrawl | 3–5 Credits pro Lauf mit zwei Betrieben (1 Suche + 1 Auslesen je Betrieb, inkl. Screenshot und Markenfarben) |
| Claude Code | läuft über das bestehende Abo, keine zusätzliche Abrechnung |
| Netlify | kostenlos im Free-Tier, eine Site pro Lauf |
| **Laufzeit** | **2 Minuten 3 Sekunden** für zwei Betriebe, Ende zu Ende |

Die gesamte Entwicklung dieses Agenten — alle Testläufe, Fehlversuche und
Screenshots zusammen — hat **24 Firecrawl-Credits** verbraucht.

---

**Demo-Video:** [folgt]

*SKAILE Academy Building Challenge — Juli 2026*
