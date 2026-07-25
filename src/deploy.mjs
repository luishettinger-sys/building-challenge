// Stellt den fertigen Lauf live ins Netz — über die eingeloggte Netlify-CLI.

import { execFile } from 'node:child_process'

const TIMEOUT_MS = 4 * 60 * 1000

function netlify(args) {
  return new Promise((resolve, reject) => {
    execFile('netlify', args, { timeout: TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024 }, (fehler, stdout, stderr) => {
      if (fehler) {
        const grund = (stderr || stdout || fehler.message).trim().slice(0, 400)
        return reject(new Error(`Netlify (${args[0]}) fehlgeschlagen: ${grund}`))
      }
      resolve(stdout)
    })
  })
}

/** Holt den Team-Slug des angemeldeten Kontos — der Anzeigename taugt dafür nicht. */
export async function ermittleTeam() {
  try {
    const out = await netlify(['api', 'listAccountsForUser', '--data', '{}'])
    const start = out.indexOf('[')
    if (start === -1) return ''
    const konten = JSON.parse(out.slice(start))
    return konten[0]?.slug ?? ''
  } catch {
    return '' // ohne Team-Angabe nimmt Netlify das Standardkonto
  }
}

/**
 * Legt eine frische Netlify-Site an und veröffentlicht den Ordner darin.
 * Bewusst eine Site pro Lauf: verschickte Mail-Links bleiben so dauerhaft gültig,
 * auch wenn du morgen den nächsten Lauf startest.
 */
export async function veroeffentliche(ordner, siteName, team) {
  const args = ['deploy', '--dir', ordner, '--prod', '--no-build', '--site-name', siteName, '--json']
  if (team) args.push('--team', team)

  const stdout = await netlify(args)
  const start = stdout.indexOf('{')
  if (start === -1) throw new Error(`Netlify-Antwort unlesbar: ${stdout.slice(0, 300)}`)

  const info = JSON.parse(stdout.slice(start))
  const url = info.url ?? info.deploy_url ?? info.ssl_url
  if (!url) throw new Error('Netlify hat keine URL zurückgegeben.')
  return { url: url.replace(/\/$/, ''), siteId: info.site_id ?? '', siteName }
}

/** Sucht die Projekt-Kennung zu einem Sitenamen — Notnagel für ältere Läufe. */
export async function findeSiteId(siteName) {
  try {
    const out = await netlify(['api', 'listSites', '--data', '{}'])
    const start = out.indexOf('[')
    if (start === -1) return ''
    const sites = JSON.parse(out.slice(start))
    return sites.find((s) => s.name === siteName)?.id ?? ''
  } catch {
    return ''
  }
}

/**
 * Löscht die Netlify-Site eines Laufs. Ein Entwurf, der nicht mehr gewünscht
 * ist, muss in Sekunden verschwinden können — das ist die Zusage aus dem
 * Impressum und aus jeder Mail.
 */
export async function loescheSite(siteId) {
  if (!siteId) throw new Error('Keine Projekt-Kennung übergeben.')
  await netlify(['sites:delete', siteId, '--force'])
  return true
}

/** Prüft vorab, ob die CLI da und eingeloggt ist — besser jetzt scheitern als nach 3 Minuten Arbeit. */
export async function pruefeNetlify() {
  // "status" endet mit Fehlercode, wenn der Ordner nicht mit einem Projekt verlinkt ist.
  // Das ist hier normal — uns interessiert nur, ob jemand angemeldet ist.
  const ausgabe = await new Promise((fertig) => {
    execFile('netlify', ['status'], { timeout: 60000 }, (fehler, stdout, stderr) => {
      if (fehler && /ENOENT/.test(fehler.code ?? fehler.message)) return fertig({ fehlt: true })
      fertig({ text: `${stdout}${stderr}` })
    })
  })

  if (ausgabe.fehlt) {
    throw new Error('Netlify-CLI fehlt. Installiere sie mit "npm i -g netlify-cli" und melde dich an.')
  }
  if (/Not logged in|You are not logged in|netlify login/i.test(ausgabe.text)) {
    throw new Error('Netlify ist nicht eingeloggt. Führe "netlify login" aus.')
  }
  return true
}
