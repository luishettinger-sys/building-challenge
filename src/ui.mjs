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
  console.log(`    ${gelb('!')} ${host} ${grau('übersprungen:')} ${fehler.message.split('\n')[0]}`)
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
  console.log(`    ${fehler.message}`)
  console.log('')
}

export function hilfe() {
  console.log(`
  ${fett('Pitch-Maschine')} — Zielgruppe rein, versandfertige Akquise-Pakete raus.

  ${fett('Aufruf')}
    pitch "Zahnarztpraxen in Wiesbaden"
    pitch "Steuerberater München" --anzahl 5

  ${fett('Optionen')}
    -n, --anzahl <zahl>   Wie viele Leads (1-8, Standard 3)
        --ort <ort>       Region für die Suche (Standard "Germany")
        --land <code>     Ländercode (Standard "de")
        --team <slug>     Netlify-Team für den Deploy
        --kein-browser    Cockpit am Ende nicht öffnen

  ${fett('Was passiert')}
    Firmen suchen · Websites lesen · Schwachstellen finden · neue Startseite
    bauen · live stellen · Mail schreiben · Cockpit öffnen.
`)
}
