# Pitch-Maschine

> SKAILE Building Challenge #2 — ein Agent, der aus einer Zielgruppe fertige
> Akquise-Pakete macht: echte Leads, echte Analyse, echte Live-Seite, fertige Mail.

## Das Problem

Ich baue und verkaufe Websites (Kanzlei-Seiten, Landingpages, Shops). Der teuerste
Teil daran ist nicht das Bauen — es ist die Akquise. Für einen einzigen ernsthaften
Pitch sitze ich 60–90 Minuten: Firmen suchen, Website ansehen, Schwachstellen
notieren, eine Mail schreiben, die nicht nach Massenmail klingt. Und selbst dann ist
die Mail nur eine Behauptung ("ich könnte das besser") — kein Beweis. Deshalb bleibt
Akquise liegen, und ohne Akquise kein Auftrag.

## Was der Agent macht

Du gibst ihm eine Zielgruppe, z.B. `pitch "Zahnarztpraxen in Wiesbaden"`. Der Agent
sucht daraufhin echte Betriebe im Netz, ruft deren Website auf und analysiert sie auf
konkrete Schwachstellen (kein Handy-Layout, kein klarer Termin-Button, veraltetes
Design, langsam). Aus dem, was er dort liest, baut er der Firma **eine neue
Startseite** — mit ihren echten Inhalten, ihrem Namen, ihren Leistungen — und stellt
sie live ins Netz. Am Ende bekommst du pro Lead eine fertige, persönliche Mail, in der
genau die gefundenen Schwachstellen stehen und ein Link auf die neue Seite.

Aus 90 Minuten Handarbeit pro Lead werden ca. 2 Minuten Rechenzeit. Und statt einer
Behauptung verschickst du einen Beweis, den der Empfänger anklicken kann.

## Stack

- [x] Claude Code (Agent / Skills) — Analyse, Copy, Seitenbau via `claude -p` (headless)
- [ ] n8n
- [x] Sonstiges: Node.js-Orchestrator, Firecrawl (Suche + Scraping), Netlify (Deploy)

## Setup

Siehe **[INSTALL.md](INSTALL.md)** — die Datei ist an Claude Code adressiert. Repo
klonen, Claude die INSTALL.md lesen lassen, er richtet den Rest ein.

## Was während der Challenge entstanden ist

[wird beim Bauen gefüllt]

## Learnings

[wird beim Bauen gefüllt]

---

**Demo-Video:** [folgt]

*SKAILE Academy Building Challenge — Juli 2026*
