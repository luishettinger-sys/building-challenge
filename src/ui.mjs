// Alles, was im Terminal zu sehen ist. Ein Agent, dem man beim Denken zusehen kann,
// wirkt verlässlicher als einer, der drei Minuten schweigt.

const farbe = process.stdout.isTTY && !process.env.NO_COLOR
const c = (code, s) => (farbe ? `\x1b[${code}m${s}\x1b[0m` : String(s))
const grau = (s) => c('90', s)
const gruen = (s) => c('92', s)
const tuerkis = (s) => c('96', s)
const gelb = (s) => c('93', s)
const rot = (s) => c('91', s)
const fett = (s) => c('1', s)

const RAHMEN = { spinner: null, start: 0 }
const ZEICHEN = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

const dauer = (ms) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`)

// Fehlermeldungen fremder Werkzeuge können Schlüssel und Tokens enthalten.
// Was hier durchläuft, landet im Terminal und womöglich in einem Screencast.
// Absichtlich eng gefasst: eine zu gierige Regel schwärzt Hostnamen und URLs
// mit, und dann sieht man im Terminal nicht mehr, was der Lauf gebaut hat.
const SCHLUESSEL = [
  /\bfc-[A-Za-z0-9]{12,}/g, // Firecrawl
  /\bnfp_[A-Za-z0-9]{12,}/g, // Netlify
  /\bsk-[A-Za-z0-9_-]{16,}/g, // OpenAI-Stil
  /\b[A-Fa-f0-9]{32,}\b/g, // Hex-Token
  /\b[A-Za-z0-9+]{40,}={0,2}\b/g, // Base64-Token
  /((?:Bearer|authorization|token|api[_-]?key)["'\s:=]+)\S{12,}/gi,
]

/** Entfernt alles, was nach Schlüssel aussieht, aus einer Ausgabe. */
export function redigiere(text) {
  return SCHLUESSEL.reduce((t, muster) => t.replace(muster, '«Schlüssel entfernt»'), String(text ?? ''))
}

export function kopf(zielgruppe, anzahl) {
  console.log('')
  console.log(`  ${tuerkis('◆')} ${fett('Pitch-Maschine')}`)
  console.log(`  ${grau('Zielgruppe:')} ${zielgruppe}`)
  console.log(`  ${grau('Leads:')}      ${anzahl}`)
  console.log('')
}

export function abschnitt(titel) {
  console.log(`  ${tuerkis('▸')} ${titel}`)
}

/** Ein Arbeitsschritt mit Spinner, Dauer und Ergebniszeile. */
export async function schritt(titel, arbeit, ergebnisText = () => '') {
  const start = Date.now()
  let i = 0
  const zeichnen = () => {
    if (!farbe) return
    process.stdout.write(`\r  ${tuerkis(ZEICHEN[i++ % ZEICHEN.length])} ${titel}${grau(' …')}   `)
  }
  if (!farbe) console.log(`  · ${titel} …`)
  zeichnen()
  RAHMEN.spinner = setInterval(zeichnen, 80)

  try {
    const wert = await arbeit()
    stoppe()
    const info = ergebnisText(wert)
    console.log(`  ${gruen('✓')} ${titel} ${grau(dauer(Date.now() - start))}`)
    if (info) console.log(`    ${grau('→')} ${info}`)
    return wert
  } catch (e) {
    stoppe()
    console.log(`  ${rot('✗')} ${titel}`)
    throw e
  }
}

function stoppe() {
  if (RAHMEN.spinner) clearInterval(RAHMEN.spinner)
  RAHMEN.spinner = null
  if (farbe) process.stdout.write('\r' + ' '.repeat(70) + '\r')
}

export const leadStart = (host) => console.log(`    ${grau('·')} ${host} ${grau('gestartet')}`)
export const leadSchritt = (host, was) => console.log(`    ${grau('·')} ${host} ${grau('—')} ${was}`)
export const leadFertig = (host, firma) => console.log(`    ${gruen('✓')} ${host} ${grau('—')} ${fett(firma)} ${grau('fertig')}`)

export function fehlerZuLead(host, fehler) {
  console.log(`    ${gelb('!')} ${host} ${grau('übersprungen:')} ${redigiere(fehler.message.split('\n')[0])}`)
}

export function hinweis(text) {
  console.log(`  ${grau('·')} ${redigiere(text)}`)
}

export function erledigt(text) {
  console.log(`  ${gruen('✓')} ${redigiere(text)}`)
  console.log('')
}

export function fazit(leads, cockpit, ordner, uebersprungen) {
  console.log('')
  console.log(`  ${gruen('●')} ${fett(`${leads.length} Akquise-Pakete fertig`)}${uebersprungen ? grau(`  (${uebersprungen} übersprungen)`) : ''}`)
  console.log('')
  for (const l of leads) {
    console.log(`    ${fett(l.analyse.firma)} ${grau('· Potenzial ' + (l.analyse.potenzial ?? '–') + '/10')}`)
    console.log(`    ${grau('Neue Seite:')} ${tuerkis(l.neueSeite)}`)
    console.log(`    ${grau('Betreff:')}    ${l.mail.betreff}`)
    console.log('')
  }
  console.log(`  ${fett('Cockpit:')} ${tuerkis(cockpit)}`)
  console.log(`  ${grau('Dateien:')} ${grau(ordner)}`)
  console.log('')
}

export function abbruch(fehler) {
  stoppe()
  console.log('')
  console.log(`  ${rot('✗ Abgebrochen')}`)
  console.log(`    ${redigiere(fehler.message)}`)
  console.log('')
}

export function hilfe() {
  console.log(`
  ${fett('Pitch-Maschine')} — Zielgruppe rein, versandfertige Akquise-Pakete raus.

  ${fett('Aufruf')}
    pitch "Zahnarztpraxen in Wiesbaden"
    pitch "Steuerberater München" --anzahl 5
    pitch --loeschen 20260725-1930-malerbetrieb-wiesbaden

  ${fett('Optionen')}
    -n, --anzahl <zahl>   Wie viele Leads (1-8, Standard 3)
        --ort <ort>       Region für die Suche (Standard "Germany")
        --land <code>     Ländercode (Standard "de")
        --team <slug>     Netlify-Team für den Deploy
        --kein-browser    Cockpit am Ende nicht öffnen
        --loeschen <id>   Nimmt die Entwürfe eines Laufs wieder vom Netz

  ${fett('Was passiert')}
    Firmen suchen · Websites lesen · Schwachstellen finden · neue Startseite
    bauen · prüfen · live stellen · Mail schreiben · Cockpit öffnen.

  ${fett('Was live geht')}
    Nur der Ordner out/<lauf>/site — die eigenen Entwürfe, mit Impressum und
    noindex. Screenshots fremder Seiten, Mails und Cockpit bleiben lokal.
`)
}
