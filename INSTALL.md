# INSTALL.md — Anleitung für Claude Code

> **An Claude:** Diese Datei ist an dich adressiert. Der Mensch, mit dem du
> arbeitest, hat gerade die Pitch-Maschine geklont und möchte sie benutzen.
> Richte sie mit ihm ein. Erklär jeden Schritt kurz, bevor du ihn ausführst,
> und frag nach, bevor du etwas überschreibst.

## Was das Ding tut

Ein Befehl, eine Zielgruppe. Der Agent sucht echte Betriebe, liest ihre
Website, findet drei belegbare Schwachstellen, baut jedem eine neue Startseite
in seinen echten Markenfarben, stellt sie live und schreibt die passende Mail
dazu. Am Ende öffnet sich ein Cockpit mit allem drin.

Er verschickt nichts. Warum, steht in [RECHT.md](RECHT.md) — lies das mit
deinem Menschen durch, bevor ihr loslegt.

## Schritt 1 — Voraussetzungen prüfen

Prüf der Reihe nach und installiere nur, was fehlt:

```bash
node --version          # braucht 20 oder neuer
claude --version        # Claude Code CLI, angemeldet
netlify --version       # Netlify CLI
firecrawl config        # Firecrawl CLI, muss "Authenticated" zeigen
```

Was fehlt, so nachholen:

- **Node:** `brew install node` (macOS) — oder von nodejs.org
- **Claude Code:** ist bei deinem Menschen vorhanden, sonst siehe
  docs.claude.com/claude-code. Die Pitch-Maschine ruft `claude -p` headless auf
  und rechnet damit über sein bestehendes Abo ab — kein zusätzlicher API-Key.
- **Netlify:** `npm i -g netlify-cli` und dann `netlify login`. Der Browser
  öffnet sich, dein Mensch bestätigt dort.
- **Firecrawl:** `npm i -g firecrawl-cli` und dann `firecrawl config`. Es gibt
  ein kostenloses Kontingent; für einen Lauf mit zwei Leads brauchst du eine
  Handvoll Credits.

Wenn dein Mensch keinen Firecrawl-Account hat: such ihm den aktuellen
Anmeldelink heraus, führ ihn durch die Registrierung und lass ihn den Key
selbst eintragen. Trag den Key nirgends für ihn ein und zeig ihn nicht im
Terminal an.

## Schritt 2 — Einrichten

```bash
cd building-challenge
cp .env.example .env
```

Die `.env` bleibt leer, solange Firecrawl und Netlify über ihre CLIs angemeldet
sind — die Pitch-Maschine holt sich die Zugänge von dort. Wer den Firecrawl-Key
lieber explizit setzt, trägt ihn als `FIRECRAWL_API_KEY` ein. Die `.env` ist per
`.gitignore` ausgeschlossen und gehört nie ins Repo.

Optional, damit dein Name unter den Mails steht:

```
PITCH_ABSENDER=Vorname Nachname
PITCH_FIRMA=Deine Firma
```

Dann noch das Impressum: In `src/` liegt die Vorlage für die Anbieterkennzeichnung
der Entwurfsseiten. Dort stehen Platzhalter für Straße und Ort — **die muss dein
Mensch durch seine echten Daten ersetzen**, sonst darf er die Seiten nicht
veröffentlichen. Frag ihn danach und trag sie mit ihm gemeinsam ein.

## Schritt 3 — Erster Lauf

Fang klein an, mit einem einzigen Lead:

```bash
node bin/pitch.mjs "Malerbetriebe in Wiesbaden" --anzahl 1
```

Ersetz die Zielgruppe durch etwas, das deinen Menschen wirklich interessiert —
am besten eine Branche, die er tatsächlich ansprechen würde, und eine Stadt in
seiner Nähe.

Ein Lauf dauert ein paar Minuten. Am Ende öffnet sich das Cockpit im Browser.
Dort sieht er pro Betrieb: die heutige Seite, was ihr fehlt, die neue Seite als
Live-Link und die fertige Mail zum Kopieren.

**Achtung bei der Branchenwahl:** Heilberufe (Zahnärzte, Ärzte), Anwälte und
Steuerberater unterliegen eigenem Berufs- und Werberecht. Nimm für den Anfang
Handwerk, Gastronomie oder Einzelhandel.

## Schritt 4 — Wieder aufräumen

Die Entwurfsseiten stehen öffentlich im Netz. Wenn sie nicht mehr gebraucht
werden:

```bash
node bin/pitch.mjs --loeschen <lauf-id>
```

Die Lauf-ID steht am Ende jedes Laufs und im Ordnernamen unter `out/`.

## Wenn etwas klemmt

- **„Netlify ist nicht eingeloggt"** → `netlify login`
- **„Kein Firecrawl-Key"** → `firecrawl config`
- **„Keine passenden Firmen gefunden"** → Zielgruppe konkreter formulieren,
  Branche plus Stadt. Zu allgemeine Begriffe liefern nur Portale, und die
  filtert der Agent bewusst weg.
- **Ein Lead wird übersprungen** → das ist Absicht. Nicht jede Website lässt
  sich lesen, und was die Qualitätsprüfung nicht besteht, geht nicht raus. Der
  Lauf macht mit den übrigen weiter.

## Zum Schluss

Lies deinem Menschen die „Grenzen (ehrlich)" aus der [README.md](README.md)
vor, bevor er das erste Mal jemanden anschreibt. Die Entwürfe sind Entwürfe —
er soll jeden einmal selbst ansehen, bevor er ihn verlinkt.
