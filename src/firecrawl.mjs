// Firecrawl: Leads finden und ihre Website einlesen.
// Key kommt aus der .env, ersatzweise aus den Credentials der Firecrawl-CLI.

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const API = 'https://api.firecrawl.dev/v2'

function apiKey() {
  if (process.env.FIRECRAWL_API_KEY) return process.env.FIRECRAWL_API_KEY
  try {
    const p = join(homedir(), 'Library/Application Support/firecrawl-cli/credentials.json')
    return JSON.parse(readFileSync(p, 'utf8')).apiKey
  } catch {
    throw new Error(
      'Kein Firecrawl-Key. Trag FIRECRAWL_API_KEY in die .env ein oder führe "firecrawl config" aus.'
    )
  }
}

async function call(path, body) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Firecrawl ${path} → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  if (!json.success) throw new Error(`Firecrawl ${path} → ${JSON.stringify(json).slice(0, 200)}`)
  return json.data
}

// Verzeichnisse, Portale und Plattformen — das sind keine Leads, das sind Mitbewerber.
const AUSSCHLUSS = [
  'jameda', 'doctolib', 'gelbeseiten', 'dasoertliche', 'yelp', '11880', 'wikipedia',
  'facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'google.', 'apple.com',
  'meinestadt', 'stadtbranchenbuch', 'werkenntdenbesten', 'provenexpert', 'kununu',
  'indeed', 'stepstone', 'ebay', 'amazon', 'tripadvisor', 'booking.', 'firmenwissen',
  'northdata', 'wlw.de', 'branchenbuch', 'herold.at', 'local.ch', 'x.com', 'reddit',
]

const istEchteFirma = (url) => {
  const u = url.toLowerCase()
  return !AUSSCHLUSS.some((bad) => u.includes(bad))
}

/** Sucht echte Firmen-Websites zu einer Zielgruppe. */
export async function findeLeads(zielgruppe, anzahl, { land = 'de', ort = 'Germany' } = {}) {
  const data = await call('/search', {
    query: zielgruppe,
    limit: Math.min(anzahl * 4 + 6, 40), // Puffer, weil wir kräftig aussortieren
    sources: ['web'],
    country: land,
    location: ort,
  })

  const gesehen = new Set()
  const leads = []
  for (const t of data.web ?? []) {
    if (!t.url || !istEchteFirma(t.url)) continue
    let host
    try {
      host = new URL(t.url).hostname.replace(/^www\./, '')
    } catch {
      continue
    }
    if (gesehen.has(host)) continue // pro Firma nur eine Seite
    gesehen.add(host)
    leads.push({ titel: t.title ?? host, url: `https://${host}/`, host, snippet: t.description ?? '' })
    if (leads.length >= anzahl) break
  }
  return leads
}

/** Liest eine Website: Inhalt, Screenshot, Markenfarben und Schriften. */
export async function leseWebsite(url) {
  const d = await call('/scrape', {
    url,
    formats: [
      'markdown',
      'branding',
      { type: 'screenshot', fullPage: false, viewport: { width: 1280, height: 800 } },
    ],
    onlyMainContent: false,
    timeout: 45000,
  })
  return {
    markdown: (d.markdown ?? '').slice(0, 14000),
    screenshot: d.screenshot ?? null,
    branding: d.branding ?? null,
    titel: d.metadata?.title ?? '',
    beschreibung: d.metadata?.description ?? '',
  }
}
