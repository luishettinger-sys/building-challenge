#!/usr/bin/env node
// Pitch-Maschine — Zielgruppe rein, versandfertige Akquise-Pakete raus.
//
//   pitch "Malerbetriebe in Wiesbaden"
//   pitch "Dachdecker Mainz" --anzahl 5
//
// Was live geht und was nicht, ist bewusst getrennt:
//   out/<lauf>/site/   → wird deployt: nur die eigenen Entwürfe
//   out/<lauf>/…       → bleibt lokal: Screenshots fremder Seiten, Mails, Cockpit

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { execFile } from 'node:child_process'

import { findeLeads, leseWebsite } from '../src/firecrawl.mjs'
import { analysiere, baueSeite, schreibeMail } from '../src/schritte.mjs'
import { pruefeSeite, korrekturHinweis } from '../src/pruefe.mjs'
import { schriften, baueImpressum, ROBOTS_TXT, HEADERS_DATEI, baueStartseite } from '../src/vorlage.mjs'
import { veroeffentliche, pruefeNetlify, ermittleTeam, loescheSite, findeSiteId } from '../src/deploy.mjs'
import { baueCockpit } from '../src/cockpit.mjs'
import { laufNummer, schreibeBericht } from '../src/bericht.mjs'
import * as ui from '../src/ui.mjs'

const WURZEL = resolve(import.meta.dirname, '..')

// Die .env liegt beim Projekt, nicht dort, wo du gerade stehst — der Befehl
// lässt sich schließlich aus jedem Ordner aufrufen. Fehlt sie, ist das kein
// Fehler: dann kommen die Zugänge aus den angemeldeten CLIs.
try {
  process.loadEnvFile?.(join(WURZEL, '.env'))
} catch {}

async function main() {
  const opt = argumente(process.argv.slice(2))
  if (opt.loeschen) return nimmVomNetz(opt.loeschen)
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
  const siteOrdner = join(ordner, 'site')
  await mkdir(join(ordner, 'shots'), { recursive: true })
  await mkdir(siteOrdner, { recursive: true })

  // Alle Leads gleichzeitig — der langsamste bestimmt die Dauer, nicht die Summe.
  ui.abschnitt(`Leads bearbeiten (${leads.length} gleichzeitig)`)
  const ergebnisse = await Promise.all(
    leads.map((lead) => verarbeite(lead, ordner, opt).catch((e) => {
      ui.fehlerZuLead(lead.host, e)
      return null
    }))
  )
  const fertig = ergebnisse.filter(Boolean)
  if (!fertig.length) throw new Error('Kein einziger Lead ließ sich bearbeiten. Details siehe oben.')

  // Erst live stellen, dann die Mails schreiben: so steht in jeder Mail die echte,
  // klickbare URL — keine geratene. Es wird genau einmal deployt.
  const netz = await ui.schritt('Entwürfe live stellen', async () => {
    await schreibePflichtdateien(siteOrdner, fertig)
    return veroeffentliche(siteOrdner, lauf.siteName, opt.team)
  }, (n) => `${n.url} (nur die Entwürfe, ohne Screenshots und Mails)`)

  const basis = netz.url
  for (const l of fertig) l.neueSeite = `${basis}/${l.slug}/`
  await schreibeLaufDatei(ordner, lauf, netz, opt, fertig)

  await ui.schritt('Mails schreiben', async () => {
    await Promise.all(
      fertig.map(async (l) => {
        l.mail = await schreibeMail(l.analyse, l.neueSeite, opt.absender)
        await mkdir(join(ordner, l.slug), { recursive: true })
        await writeFile(
          join(ordner, l.slug, 'mail.txt'),
          `An: ${l.analyse.kontakt?.email || '(Adresse auf der Website suchen)'}\nBetreff: ${l.mail.betreff}\n\n${l.mail.koerper}\n`,
          'utf8'
        )
      })
    )
  }, () => `${fertig.length} Mails fertig`)

  // Das Cockpit zeigt Screenshots fremder Websites. Die bleiben auf dieser
  // Platte — Lichtbilder anderer Leute gehören nicht ins offene Netz.
  const cockpit = join(ordner, 'cockpit.html')
  await ui.schritt('Cockpit bauen (bleibt lokal)', async () => {
    await writeFile(cockpit, baueCockpit(opt.zielgruppe, fertig, opt.absender, basis), 'utf8')
    await schreibeBericht(ordner, opt, fertig, basis)
  }, () => cockpit)

  ui.fazit(fertig, cockpit, ordner, ergebnisse.length - fertig.length)
  if (!opt.keinBrowser) execFile('open', [cockpit], () => {})
}

/** Ein Lead von der URL bis zur geprüften Seite im Deploy-Ordner. */
async function verarbeite(lead, ordner, opt) {
  const slug = slugify(lead.host)
  ui.leadStart(lead.host)

  const seite = await leseWebsite(lead.url)
  ui.leadSchritt(lead.host, 'Website gelesen')

  const analyse = await analysiere(lead, seite)
  ui.leadSchritt(lead.host, `${analyse.firma} — ${analyse.schwachstellen.length} Schwachstellen`)

  const { html, befund } = await baueGepruefteSeite(lead, analyse, seite)
  if (html.length < 4000) throw new Error('Die gebaute Seite ist verdächtig kurz — Ergebnis verworfen.')

  await mkdir(join(ordner, 'site', slug), { recursive: true })
  await writeFile(join(ordner, 'site', slug, 'index.html'), html, 'utf8')

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

/**
 * Merkt sich, was dieser Lauf im Netz angelegt hat. Ohne diese Datei wüsste
 * "pitch --loeschen" nicht, welche Site gemeint ist.
 */
async function schreibeLaufDatei(ordner, lauf, netz, opt, leads) {
  await writeFile(
    join(ordner, 'lauf.json'),
    JSON.stringify(
      {
        id: lauf.id,
        zielgruppe: opt.zielgruppe,
        erstellt: new Date().toISOString(),
        siteName: netz.siteName,
        siteId: netz.siteId,
        url: netz.url,
        entwuerfe: leads.map((l) => ({ firma: l.analyse.firma, host: l.host, seite: l.neueSeite })),
      },
      null,
      2
    ) + '\n',
    'utf8'
  )
}

/** pitch --loeschen <lauf-id>: nimmt die Entwürfe eines Laufs wieder vom Netz. */
async function nimmVomNetz(laufId) {
  const datei = join(WURZEL, 'out', laufId, 'lauf.json')
  let lauf
  try {
    lauf = JSON.parse(await readFile(datei, 'utf8'))
  } catch {
    throw new Error(`Kein Lauf "${laufId}" gefunden. Erwartet wird ${datei}.`)
  }
  if (lauf.geloescht) {
    ui.hinweis(`Dieser Lauf wurde bereits am ${lauf.geloescht} vom Netz genommen.`)
    return
  }

  ui.hinweis(`Lauf ${lauf.id} · ${lauf.entwuerfe?.length ?? 0} Entwürfe · ${lauf.url}`)

  const siteId = lauf.siteId || (await findeSiteId(lauf.siteName))
  if (!siteId) throw new Error(`Zur Site "${lauf.siteName}" ließ sich keine Projekt-Kennung finden.`)

  await ui.schritt('Netlify-Site löschen', () => loescheSite(siteId), () => `${lauf.siteName} ist weg`)

  lauf.geloescht = new Date().toISOString()
  await writeFile(datei, JSON.stringify(lauf, null, 2) + '\n', 'utf8')
  ui.erledigt(`${lauf.url} ist nicht mehr erreichbar. Die Dateien liegen weiter in out/${lauf.id}.`)
}

/** Impressum, robots.txt, _headers und eine neutrale Startseite für die Site. */
async function schreibePflichtdateien(siteOrdner, leads) {
  await Promise.all([
    writeFile(join(siteOrdner, 'impressum.html'), baueImpressum(), 'utf8'),
    writeFile(join(siteOrdner, 'robots.txt'), ROBOTS_TXT, 'utf8'),
    writeFile(join(siteOrdner, '_headers'), HEADERS_DATEI, 'utf8'),
    writeFile(join(siteOrdner, 'index.html'), baueStartseite(leads.length), 'utf8'),
  ])
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
    loeschen: '',
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
    else if (a === '--loeschen' || a === '--löschen') opt.loeschen = String(argv[++i] ?? '').trim()
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
