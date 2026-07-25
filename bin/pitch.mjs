#!/usr/bin/env node
// Pitch-Maschine — Zielgruppe rein, versandfertige Akquise-Pakete raus.
//
//   pitch "Zahnarztpraxen in Wiesbaden"
//   pitch "Steuerberater München" --anzahl 5

import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { execFile } from 'node:child_process'

import { findeLeads, leseWebsite } from '../src/firecrawl.mjs'
import { analysiere, baueSeite, schreibeMail } from '../src/schritte.mjs'
import { pruefeSeite, korrekturHinweis } from '../src/pruefe.mjs'
import { schriften } from '../src/vorlage.mjs'
import { veroeffentliche, pruefeNetlify, ermittleTeam } from '../src/deploy.mjs'
import { baueCockpit } from '../src/cockpit.mjs'
import { laufNummer, schreibeBericht } from '../src/bericht.mjs'
import * as ui from '../src/ui.mjs'

const WURZEL = resolve(import.meta.dirname, '..')

async function main() {
  const opt = argumente(process.argv.slice(2))
  if (!opt.zielgruppe) return ui.hilfe()

  ui.kopf(opt.zielgruppe, opt.anzahl)

  await ui.schritt('Werkzeuge prüfen', async () => {
    await pruefeNetlify()
    if (!opt.team) opt.team = await ermittleTeam()
  }, () => (opt.team ? `Netlify-Team: ${opt.team}` : 'Netlify: Standardkonto'))

  const leads = await ui.schritt(`Leads suchen`, async () => {
    const gefunden = await findeLeads(opt.zielgruppe, opt.anzahl, { land: opt.land, ort: opt.ort })
    if (!gefunden.length) throw new Error('Keine passenden Firmen gefunden. Formuliere die Zielgruppe konkreter.')
    return gefunden
  }, (l) => `${l.length} Firmen: ${l.map((x) => x.host).join(', ')}`)

  const lauf = laufNummer(opt.zielgruppe)
  const ordner = join(WURZEL, 'out', lauf.id)
  await mkdir(join(ordner, 'shots'), { recursive: true })

  // Alle Leads gleichzeitig — der langsamste bestimmt die Dauer, nicht die Summe.
  ui.abschnitt(`Leads bearbeiten (${leads.length} gleichzeitig)`)
  const ergebnisse = await Promise.all(
    leads.map((lead, i) => verarbeite(lead, i, ordner, opt).catch((e) => {
      ui.fehlerZuLead(lead.host, e)
      return null
    }))
  )
  const fertig = ergebnisse.filter(Boolean)
  if (!fertig.length) throw new Error('Kein einziger Lead ließ sich bearbeiten. Details siehe oben.')

  // Erst live stellen, dann die Mails schreiben: so steht in jeder Mail die echte,
  // klickbare URL — keine geratene.
  const basis = await ui.schritt('Seiten live stellen', async () => {
    await writeFile(join(ordner, 'index.html'), platzhalterCockpit(), 'utf8')
    return veroeffentliche(ordner, lauf.siteName, opt.team)
  }, (url) => url)

  for (const l of fertig) l.neueSeite = `${basis}/${l.slug}/`

  await ui.schritt('Mails schreiben', async () => {
    await Promise.all(
      fertig.map(async (l) => {
        l.mail = await schreibeMail(l.analyse, l.neueSeite, opt.absender)
        await writeFile(
          join(ordner, l.slug, 'mail.txt'),
          `An: ${l.analyse.kontakt?.email || '(Adresse auf der Website suchen)'}\nBetreff: ${l.mail.betreff}\n\n${l.mail.koerper}\n`,
          'utf8'
        )
      })
    )
  }, () => `${fertig.length} Mails fertig`)

  const cockpit = await ui.schritt('Cockpit bauen und veröffentlichen', async () => {
    await writeFile(join(ordner, 'index.html'), baueCockpit(opt.zielgruppe, fertig, opt.absender), 'utf8')
    await schreibeBericht(ordner, opt, fertig, basis)
    return veroeffentliche(ordner, lauf.siteName, opt.team)
  }, (url) => url)

  ui.fazit(fertig, cockpit, ordner, ergebnisse.length - fertig.length)
  if (!opt.keinBrowser) execFile('open', [cockpit], () => {})
}

/** Ein Lead von der URL bis zur fertigen Seite auf der Platte. */
async function verarbeite(lead, i, ordner, opt) {
  const slug = slugify(lead.host)
  ui.leadStart(lead.host)

  const seite = await leseWebsite(lead.url)
  ui.leadSchritt(lead.host, 'Website gelesen')

  const analyse = await analysiere(lead, seite)
  ui.leadSchritt(lead.host, `${analyse.firma} — ${analyse.schwachstellen.length} Schwachstellen`)

  const { html, befund } = await baueGepruefteSeite(lead, analyse, seite)
  if (html.length < 4000) throw new Error('Die gebaute Seite ist verdächtig kurz — Ergebnis verworfen.')

  await mkdir(join(ordner, slug), { recursive: true })
  await writeFile(join(ordner, slug, 'index.html'), html, 'utf8')

  const screenshotDatei = await ladeScreenshot(seite.screenshot, join(ordner, 'shots', `${slug}.png`))
  ui.leadFertig(lead.host, analyse.firma)

  return {
    ...lead,
    slug,
    analyse,
    befund,
    screenshotDatei: screenshotDatei ? `shots/${slug}.png` : null,
    neueSeite: null,
    mail: null,
  }
}

/**
 * Baut die Seite und lässt sie durch die Prüfung laufen.
 * Rechtsverstöße brechen den Lead sofort ab. Handwerkliche Mängel bekommen
 * genau einen zweiten Versuch mit konkretem Korrekturhinweis — danach wird
 * dieser Lead übersprungen, nie der ganze Lauf.
 */
async function baueGepruefteSeite(lead, analyse, seite) {
  const pruefOptionen = {
    original: seite.markdown,
    markenSchriften: schriften(seite.branding).marken,
  }

  let { html } = await baueSeite(analyse, seite)
  let befund = pruefeSeite(html, pruefOptionen)
  if (befund.bestanden) return { html, befund }

  if (befund.hart.length) throw new Error(`Rechtsprüfung nicht bestanden: ${befund.hart.join(' ')}`)

  ui.leadSchritt(lead.host, `Prüfung: ${befund.weich.length} Beanstandung(en), Seite wird neu gebaut`)
  ;({ html } = await baueSeite(analyse, seite, korrekturHinweis(befund)))
  befund = pruefeSeite(html, pruefOptionen)
  if (!befund.bestanden) throw new Error(`Auch der zweite Entwurf fiel durch: ${befund.meldung}`)

  befund.meldung = 'Qualitätsprüfung bestanden (nach einer Korrekturrunde)'
  return { html, befund }
}

/** Screenshot mitnehmen statt verlinken — die Firecrawl-URLs laufen ab. */
async function ladeScreenshot(url, ziel) {
  if (!url) return false
  try {
    const res = await fetch(url)
    if (!res.ok) return false
    await writeFile(ziel, Buffer.from(await res.arrayBuffer()))
    return true
  } catch {
    return false
  }
}

const platzhalterCockpit = () =>
  '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Pitch-Maschine</title></head><body style="background:#0b0d10"></body></html>'

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replaceAll('ä', 'ae').replaceAll('ö', 'oe').replaceAll('ü', 'ue').replaceAll('ß', 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function argumente(argv) {
  const opt = {
    zielgruppe: '',
    anzahl: 3,
    land: 'de',
    ort: 'Germany',
    team: process.env.NETLIFY_TEAM || '',
    keinBrowser: false,
    absender: {
      name: process.env.PITCH_ABSENDER || 'Luis Hettinger',
      firma: process.env.PITCH_FIRMA || '',
    },
  }
  const frei = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--anzahl' || a === '-n') opt.anzahl = Math.max(1, Math.min(8, Number(argv[++i]) || 3))
    else if (a === '--ort') opt.ort = argv[++i]
    else if (a === '--land') opt.land = argv[++i]
    else if (a === '--team') opt.team = argv[++i]
    else if (a === '--kein-browser') opt.keinBrowser = true
    else if (a === '--hilfe' || a === '-h') return {}
    else frei.push(a)
  }
  opt.zielgruppe = frei.join(' ').trim()
  return opt
}

main().catch((e) => {
  ui.abbruch(e)
  process.exit(1)
})
