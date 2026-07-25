// Claude Code im Headless-Modus: das Gehirn der Pitch-Maschine.
// Läuft über die lokal installierte Claude-Code-CLI — kein extra API-Key nötig.

import { spawn } from 'node:child_process'

const TIMEOUT_MS = 5 * 60 * 1000

/**
 * Schickt einen Prompt an Claude und gibt die Antwort als Text zurück.
 * Der Prompt geht über stdin, damit auch lange Website-Inhalte durchpassen.
 */
export function frageClaude(prompt, { model = 'sonnet', system } = {}) {
  const args = ['-p', '--output-format', 'json', '--allowed-tools', '', '--model', model]
  if (system) args.push('--append-system-prompt', system)

  return new Promise((resolve, reject) => {
    const kind = spawn('claude', args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      kind.kill('SIGKILL')
      reject(new Error('Claude hat nicht rechtzeitig geantwortet (5 Min Zeitlimit).'))
    }, TIMEOUT_MS)

    kind.stdout.on('data', (d) => (out += d))
    kind.stderr.on('data', (d) => (err += d))
    kind.on('error', (e) => {
      clearTimeout(timer)
      reject(new Error(`Claude-CLI nicht startbar: ${e.message}`))
    })
    kind.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) return reject(new Error(`Claude beendet mit Code ${code}: ${err.slice(0, 300)}`))
      try {
        const json = JSON.parse(out)
        if (json.is_error) return reject(new Error(`Claude meldet Fehler: ${String(json.result).slice(0, 300)}`))
        resolve(String(json.result ?? '').trim())
      } catch {
        reject(new Error(`Antwort von Claude nicht lesbar: ${out.slice(0, 300)}`))
      }
    })

    kind.stdin.write(prompt)
    kind.stdin.end()
  })
}

/** Wie frageClaude, aber die Antwort wird als JSON-Objekt zurückgegeben. */
export async function frageClaudeJSON(prompt, opts = {}) {
  const roh = await frageClaude(
    prompt + '\n\nAntworte ausschließlich mit dem JSON-Objekt. Kein Vorwort, keine Erklärung.',
    opts
  )
  return parseJSON(roh)
}

/** Wie frageClaude, aber die Antwort wird als reines HTML-Dokument zurückgegeben. */
export async function frageClaudeHTML(prompt, opts = {}) {
  const roh = await frageClaude(prompt, opts)
  return schaeleCodeblock(roh, 'html')
}

function parseJSON(text) {
  const kandidaten = [text, schaeleCodeblock(text, 'json')]
  const start = text.indexOf('{')
  const ende = text.lastIndexOf('}')
  if (start !== -1 && ende > start) kandidaten.push(text.slice(start, ende + 1))
  for (const k of kandidaten) {
    try {
      return JSON.parse(k)
    } catch {}
  }
  throw new Error(`Kein gültiges JSON in Claudes Antwort: ${text.slice(0, 200)}`)
}

function schaeleCodeblock(text, sprache) {
  const fence = new RegExp('```(?:' + sprache + ')?\\s*\\n([\\s\\S]*?)```', 'i')
  const treffer = text.match(fence)
  return treffer ? treffer[1].trim() : text.trim()
}
