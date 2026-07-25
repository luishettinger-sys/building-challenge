// Stellt den fertigen Lauf live ins Netz — über die eingeloggte Netlify-CLI.

import { execFile } from 'node:child_process'

const TIMEOUT_MS = 4 * 60 * 1000

function netlify(args) {
  return new Promise((resolve, reject) => {
    execFile('netlify', args, { timeout: TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024 }, (fehler, stdout, stderr) => {
      if (fehler) {
        const grund = (stderr || stdout || fehler.message).trim().slice(0, 400)
        return reject(new Error(`Netlify-Deploy fehlgeschlagen: ${grund}`))
      }
      resolve(stdout)
    })
  })
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
  return url.replace(/\/$/, '')
}

/** Prüft vorab, ob die CLI da und eingeloggt ist — besser jetzt scheitern als nach 3 Minuten Arbeit. */
export async function pruefeNetlify() {
  try {
    const out = await netlify(['status'])
    if (/Not logged in|You are not logged in/i.test(out)) {
      throw new Error('Netlify ist nicht eingeloggt. Führe "netlify login" aus.')
    }
    return true
  } catch (e) {
    if (/ENOENT/.test(e.message)) {
      throw new Error('Netlify-CLI fehlt. Installiere sie mit "npm i -g netlify-cli" und melde dich an.')
    }
    throw e
  }
}
