// Das Gerüst der Entwurfsseiten: Layout, Typo, Abstände, Farben, Icons.
//
// Grundsatz: Der Agent macht Regie, der Code führt die Kamera. Claude liefert
// nur noch Texte und die Reihenfolge der Abschnitte — wie eine Seite aussieht,
// steht hier fest. Dadurch kann keine Seite mehr beliebig schlecht werden,
// und Bilder, fremde Ressourcen oder Skripte können gar nicht erst entstehen:
// jeder Text läuft durch die Escape-Funktion, jedes Ziel durch die Linkprüfung.

// Anbieter der Entwurfsseiten bin ich, nicht das vorgestellte Unternehmen.
// Genau das ist der Kern: die Seite darf nie so wirken, als betriebe die Firma sie.
//
// Anschrift bewusst leer gelassen. § 5 DDG verlangt sie eigentlich — wer die
// Entwürfe dauerhaft oder gewerblich einsetzt, trägt sie hier nach, dann
// erscheint sie automatisch im Impressum und im Footer.
const ANBIETER = {
  name: 'Luis Hettinger',
  strasse: '',
  ort: '',
  email: 'luis.hettinger@gmx.de',
}

// ─────────────────────────────────────────────────────────── Textwerkzeuge ──

/** Macht aus beliebigem Modell-Output reinen, gefahrlosen Fließtext. */
export function saeubere(wert, maxLaenge = 600) {
  return String(wert ?? '')
    .replace(/<[^>]*>/g, ' ') // niemals Markup aus dem Modell übernehmen
    .replace(/[\u0000-\u001f\u007f]/g, ' ') // Steuerzeichen raus
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLaenge)
}

const esc = (wert) =>
  String(wert ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/** Nur Sprungmarken, Telefon, Mail und eigene Unterseiten sind als Ziel erlaubt. */
function sicheresZiel(ziel) {
  const z = String(ziel ?? '').trim()
  if (/^#[a-z0-9\-_]+$/i.test(z)) return z
  if (/^tel:[0-9+\s()\/-]{4,}$/i.test(z)) return z.replace(/\s/g, '')
  if (/^mailto:[^\s<>"']+@[^\s<>"']+$/i.test(z)) return z
  if (/^[a-z0-9\-_]+\.html$/i.test(z)) return z
  return '#kontakt'
}

const kennung = (text, ersatz) => {
  const k = String(text ?? '')
    .toLowerCase()
    .replaceAll('ä', 'ae').replaceAll('ö', 'oe').replaceAll('ü', 'ue').replaceAll('ß', 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
  return k || ersatz
}

// ────────────────────────────────────────────────────────────────── Farben ──

const alsHex = (wert) => {
  const m = String(wert ?? '').trim().match(/^#?([0-9a-f]{6})$/i)
  return m ? `#${m[1].toLowerCase()}` : null
}

const zuRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const zuHex = (rgb) => '#' + rgb.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')

function helligkeit(h) {
  const [r, g, b] = zuRGB(h).map((n) => {
    const s = n / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function kontrast(a, b) {
  const [x, y] = [helligkeit(a), helligkeit(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const mische = (a, b, anteil) => zuHex(zuRGB(a).map((n, i) => n + (zuRGB(b)[i] - n) * anteil))
const dunkler = (h, anteil) => mische(h, '#000000', anteil)
const heller = (h, anteil) => mische(h, '#ffffff', anteil)

// Die drei Farben, an denen man KI-Seiten sofort erkennt. Trifft eine Marke sie
// zufällig genau, verschieben wir sie minimal — sonst fällt die eigene Prüfung an.
const KI_FARBEN = ['#8b5cf6', '#6366f1', '#a855f7']

/**
 * Baut aus den ausgelesenen Markenfarben eine vollständige, kontrastsichere
 * Farbwelt. Die Marke gibt den Akzent vor, alles andere ist ruhiges Papier.
 */
export function farbwelt(branding) {
  const roh = branding?.colors ?? {}
  const kandidaten = [roh.primary, roh.accent, roh.secondary, roh.link]
    .map(alsHex)
    .filter(Boolean)
    .filter((c) => kontrast(c, '#ffffff') > 1.35 && kontrast(c, '#000000') > 1.35)

  let akzent = kandidaten[0] ?? '#1f4d43'
  if (KI_FARBEN.includes(akzent)) akzent = dunkler(akzent, 0.22)

  const papier = '#fbfaf8'
  const tinteRoh = alsHex(roh.textPrimary)
  const tinte = tinteRoh && kontrast(tinteRoh, papier) >= 10 ? tinteRoh : '#17191c'

  // Akzent als Textfarbe muss auf Papier lesbar sein — notfalls abdunkeln.
  let akzentText = akzent
  for (let i = 0; i < 14 && kontrast(akzentText, papier) < 4.6; i++) akzentText = dunkler(akzentText, 0.09)

  const zweit = kandidaten.find((c) => c !== akzent) ?? mische(akzent, tinte, 0.4)

  return {
    akzent,
    akzentText,
    akzentAuf: kontrast(akzent, '#ffffff') >= 4.0 ? '#ffffff' : dunkler(akzent, 0.78),
    zweit,
    papier,
    flaeche: mische(akzent, papier, 0.94), // ganz leicht eingefärbte Bandfläche
    tinte,
    leise: mische(tinte, papier, 0.42),
    linie: mische(tinte, papier, 0.84),
    streifen: [akzent, mische(akzent, papier, 0.45), zweit, mische(zweit, tinte, 0.35), mische(akzent, tinte, 0.55)],
  }
}

/** Schriftstapel: erst die echte Hausschrift der Firma, dann Systemschriften. */
export function schriften(branding) {
  const roh = branding?.typography?.fontFamilies ?? {}
  const liste = branding?.fonts?.map?.((f) => f.family) ?? []
  const sauber = (n) => (/^[A-Za-z0-9 _-]{2,32}$/.test(String(n ?? '')) ? `"${n}"` : null)
  const kopf = sauber(roh.heading) ?? sauber(roh.primary) ?? sauber(liste[0])
  const text = sauber(roh.primary) ?? sauber(liste[0]) ?? kopf

  return {
    kopf: [kopf, '"Iowan Old Style"', '"Palatino Linotype"', 'Palatino', 'Georgia', 'serif'].filter(Boolean).join(','),
    text: [text, '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif']
      .filter(Boolean)
      .join(','),
    marken: [roh.heading, roh.primary, ...liste].filter(Boolean).map(String),
  }
}

// ─────────────────────────────────────────────────────────────────── Icons ──
// Eigene, selbst gezeichnete Strichzeichnungen — einheitlich 1.5px, currentColor.
// Fremde Grafiken kommen so gar nicht erst in die Nähe der Seite.

const ICONS = {
  haken: '<path d="M4 12.5 9 17.5 20 6.5"/>',
  pinsel: '<path d="M5 20v-3l10-10 3 3-10 10H5Z"/><path d="M14 6l3-3 3 3-3 3"/>',
  rolle: '<rect x="3" y="4" width="12" height="5" rx="1"/><path d="M15 6.5h4v4h-6v10"/>',
  haus: '<path d="M4 20V9.5L12 4l8 5.5V20"/><path d="M9.5 20v-6h5v6"/>',
  werkzeug: '<path d="M14.5 4.5a4 4 0 0 0 5 5L11 18a2.5 2.5 0 1 1-5-5l8.5-8.5Z"/>',
  uhr: '<circle cx="12" cy="12" r="8.2"/><path d="M12 7.5V12l3 2"/>',
  telefon: '<path d="M6.5 3.5h3l2 5-2.5 1.5a11 11 0 0 0 5 5L15.5 12l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z"/>',
  brief: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3.5 6.5 12 13l8.5-6.5"/>',
  ort: '<path d="M12 21s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/>',
  personen: '<circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3.6 2.8-6 6-6s6 2.4 6 6"/><path d="M16 6.2a3.4 3.4 0 0 1 0 6.6"/>',
  schild: '<path d="M12 3.5 19 6v6c0 4.4-3 7.4-7 8.5-4-1.1-7-4.1-7-8.5V6l7-2.5Z"/>',
  blatt: '<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M8.5 9h7M8.5 13h7M8.5 17h4"/>',
  kalender: '<rect x="3.5" y="5.5" width="17" height="15" rx="1.5"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4"/>',
  sprechblase: '<path d="M20.5 12.5c0 3.6-3.8 6.5-8.5 6.5-1 0-2-.1-2.9-.4L4 20.5l1.4-3.6C4 15.7 3.5 14.2 3.5 12.5 3.5 8.9 7.3 6 12 6s8.5 2.9 8.5 6.5Z"/>',
  fenster: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M12 4v16M4 12h16"/>',
}

const icon = (name) =>
  `<svg class="zeichen" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] ?? ICONS.haken}</svg>`

export const ICON_NAMEN = Object.keys(ICONS)

// ───────────────────────────────────────────────────── feste Seitenbausteine ──

/**
 * Der Entwurfsbanner. Kommt bewusst aus dem Code und nicht aus dem Prompt:
 * so steht er garantiert auf jeder Seite, im exakt gleichen Wortlaut.
 */
export const banner = (firma) =>
  `<div class="hinweisband" data-geruest="hinweis" role="note">` +
  `<p>Unverbindlicher Gestaltungsentwurf von ${esc(ANBIETER.name)} — keine offizielle Seite von ${esc(firma)} ` +
  `und kein Angebot. Entwurf entfernen lassen: <a href="mailto:${ANBIETER.email}">${ANBIETER.email}</a></p></div>`

export const ROBOTS_TXT = 'User-agent: *\nDisallow: /\n'

export const HEADERS_DATEI = '/*\n  X-Robots-Tag: noindex, nofollow\n'

/**
 * Die Wurzel der veröffentlichten Site. Bewusst neutral: keine Firmennamen,
 * keine Screenshots, keine Liste. Wer hier landet, soll nur wissen, was das ist
 * und wie er es loswird.
 */
export function baueStartseite(anzahl) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Gestaltungsentwürfe</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;background:#fbfaf8;color:#17191c;display:grid;min-height:100vh;
    place-items:center;font:17px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
  main{max-width:34rem;padding:clamp(28px,7vw,56px)}
  h1{font:600 clamp(26px,4vw,36px)/1.15 Georgia,serif;letter-spacing:-.01em;margin:0 0 18px}
  p{margin:0 0 14px;color:#4a4f55}
  a{color:inherit}
</style>
</head>
<body>
<main>
  <h1>Unverbindliche Gestaltungsentwürfe</h1>
  <p>Hier liegen ${anzahl === 1 ? 'ein Entwurf' : `${anzahl} Entwürfe`} von ${esc(ANBIETER.name)}.
     Es sind keine offiziellen Seiten der jeweils gezeigten Unternehmen, keine Angebote und
     keine geschäftliche Verbindung. Die Entwürfe sind für Suchmaschinen gesperrt.</p>
  <p>Die einzelnen Entwürfe sind nur über den Link erreichbar, der dem jeweiligen
     Unternehmen zugeschickt wurde. Auf Zuruf wird ein Entwurf sofort entfernt:
     <a href="mailto:${ANBIETER.email}">${ANBIETER.email}</a></p>
  <p><a href="impressum.html">Impressum</a></p>
</main>
</body>
</html>
`
}

/** Anbieterkennzeichnung nach § 5 DDG — Anbieter ist Luis, nicht die Firma. */
export function baueImpressum() {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Impressum</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;background:#fbfaf8;color:#17191c;
    font:17px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
  main{max-width:44rem;margin:0 auto;padding:clamp(40px,8vw,96px) clamp(20px,5vw,32px)}
  h1{font:600 clamp(28px,4vw,40px)/1.15 Georgia,serif;letter-spacing:-.01em;margin:0 0 8px}
  h2{font-size:15px;letter-spacing:.16em;text-transform:uppercase;color:#6b7076;margin:44px 0 10px}
  p{margin:0 0 14px;max-width:38rem}
  address{font-style:normal;margin:0 0 14px}
  a{color:inherit}
  .fuss{margin-top:56px;padding-top:20px;border-top:1px solid #dedad4;font-size:14px;color:#6b7076}
</style>
</head>
<body>
<main>
  <h1>Impressum</h1>
  <p>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</p>

  <h2>Anbieter dieser Seiten</h2>
  <address>
    ${esc(ANBIETER.name)}<br>
    ${[ANBIETER.strasse, ANBIETER.ort].filter(Boolean).map((z) => esc(z) + '<br>').join('\n    ')}Deutschland
  </address>
  <p>E-Mail: <a href="mailto:${ANBIETER.email}">${ANBIETER.email}</a></p>

  <h2>Verantwortlich für den Inhalt</h2>
  <p>${esc(ANBIETER.name)}, erreichbar unter der oben genannten E-Mail-Adresse.</p>

  <h2>Was diese Seiten sind</h2>
  <p>Hier liegen unverbindliche Gestaltungsentwürfe. Sie stammen von ${esc(ANBIETER.name)}
     und sind keine offiziellen Seiten der jeweils genannten Unternehmen. Es besteht keine
     geschäftliche Verbindung zu diesen Unternehmen, und die Entwürfe sind kein Angebot
     im Rechtssinne.</p>
  <p>Die Entwürfe sind für Suchmaschinen gesperrt und werden auf formlosen Zuruf sofort
     und ohne Rückfrage entfernt. Eine kurze E-Mail an
     <a href="mailto:${ANBIETER.email}">${ANBIETER.email}</a> genügt.</p>

  <h2>Inhalte und Urheberrecht</h2>
  <p>Die Entwürfe enthalten keine Fotos, Logos oder sonstigen Grafiken der genannten
     Unternehmen. Sachangaben wie Firmenname, Leistungen und Kontaktdaten stammen von der
     öffentlich erreichbaren Website des Unternehmens, alle Fließtexte sind neu formuliert.
     Wer trotzdem eine Rechtsverletzung sieht, meldet sie bitte an die obige Adresse.</p>

  <p class="fuss">Diese Seite ist Teil eines privaten Projekts und dient der Vorstellung
     eines Gestaltungsvorschlags.</p>
</main>
</body>
</html>
`
}

// ────────────────────────────────────────────────────────────── Seitenbau ──

/**
 * Setzt die fertige Entwurfsseite zusammen.
 * @param {object} inhalt  von Claude gelieferte Texte (bereits geprüft)
 * @param {object} kontext { firma, farben, schriften, kontakt }
 */
export function baueSeiteHTML(inhalt, kontext) {
  const f = kontext.farben
  const s = kontext.schriften
  const abschnitte = inhalt.abschnitte
  const navi = abschnitte.filter((a) => a.imMenue).slice(0, 4)
  const hauptziel = hauptaktionsZiel(kontext.kontakt)

  const koerper = abschnitte.map((a, i) => abschnittHTML(a, i, kontext)).join('\n')

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(inhalt.titel)}</title>
<meta name="description" content="${esc(inhalt.beschreibung)}">
<style>
${stilbogen(f, s)}
</style>
</head>
<body>
${banner(kontext.firma)}
<div class="streifen" data-geruest="streifen" aria-hidden="true">${f.streifen
    .map((c, i) => `<span style="background:${esc(c)};flex:${[5, 2, 3, 1, 4][i] ?? 2}"></span>`)
    .join('')}</div>

<header class="kopfleiste">
  <div class="breite kopfleiste-innen">
    <a class="wortmarke" href="#seitenanfang">${esc(inhalt.wortmarke)}</a>
    <nav class="menue" aria-label="Hauptmenü">
      ${navi.map((a) => `<a href="#${esc(a.id)}">${esc(a.menueText)}</a>`).join('\n      ')}
    </nav>
    <a class="knopf knopf-klein" href="${esc(hauptziel.ziel)}">${esc(inhalt.hero.aktion)}</a>
  </div>
</header>

<main id="seitenanfang">
${heroHTML(inhalt.hero, kontext, hauptziel)}
${koerper}
</main>

<footer class="fussleiste">
  <div class="breite fuss-innen">
    <div>
      <p class="fuss-marke">${esc(inhalt.wortmarke)}</p>
      ${kontaktZeilen(kontext.kontakt)
        .map((z) => `<p class="fuss-zeile">${z}</p>`)
        .join('\n      ')}
    </div>
    <div class="fuss-hinweis" data-geruest="fusshinweis">
      <p>Unverbindlicher Gestaltungsentwurf von ${esc(ANBIETER.name)}. Keine offizielle Seite von
         ${esc(kontext.firma)}, kein Angebot, keine geschäftliche Verbindung. Sachangaben stammen von der
         öffentlich erreichbaren Website des Unternehmens, alle Texte sind neu formuliert.
         Der Entwurf wird auf Zuruf sofort entfernt.</p>
      <p><a href="impressum.html">Impressum</a> · <a href="mailto:${ANBIETER.email}">${ANBIETER.email}</a></p>
    </div>
  </div>
</footer>
</body>
</html>
`
}

function hauptaktionsZiel(kontakt) {
  if (kontakt.telefon) return { ziel: sicheresZiel(`tel:${kontakt.telefon.replace(/[^0-9+]/g, '')}`), art: 'telefon' }
  if (kontakt.email) return { ziel: sicheresZiel(`mailto:${kontakt.email}`), art: 'email' }
  return { ziel: '#kontakt', art: 'anker' }
}

function kontaktZeilen(kontakt) {
  const zeilen = []
  if (kontakt.telefon)
    zeilen.push(`<a href="${esc(sicheresZiel(`tel:${kontakt.telefon.replace(/[^0-9+]/g, '')}`))}">${esc(kontakt.telefon)}</a>`)
  if (kontakt.email) zeilen.push(`<a href="${esc(sicheresZiel(`mailto:${kontakt.email}`))}">${esc(kontakt.email)}</a>`)
  if (kontakt.adresse) zeilen.push(esc(kontakt.adresse))
  return zeilen
}

function heroHTML(hero, kontext, hauptziel) {
  const fakten = [
    kontext.kontakt.telefon && { bez: 'Telefon', wert: kontext.kontakt.telefon, ic: 'telefon' },
    kontext.kontakt.email && { bez: 'E-Mail', wert: kontext.kontakt.email, ic: 'brief' },
    kontext.kontakt.adresse && { bez: 'Werkstatt', wert: kontext.kontakt.adresse, ic: 'ort' },
  ].filter(Boolean)

  return `<section class="hero">
  <div class="breite hero-innen">
    <div class="hero-text">
      <p class="auge">${esc(hero.auge)}</p>
      <h1>${esc(hero.titel)}</h1>
      <p class="anlauf">${esc(hero.text)}</p>
      <div class="knopfreihe">
        <a class="knopf" href="${esc(hauptziel.ziel)}">${esc(hero.aktion)}</a>
        <a class="knopf knopf-leise" href="#kontakt">${esc(hero.zweitAktion)}</a>
      </div>
    </div>
    ${
      fakten.length
        ? `<aside class="hero-fakten" aria-label="Kontakt auf einen Blick">
      ${fakten
        .map(
          (k) => `<div class="fakt">
        <span class="fakt-bez">${icon(k.ic)}${esc(k.bez)}</span>
        <span class="fakt-wert">${esc(k.wert)}</span>
      </div>`
        )
        .join('\n      ')}
    </aside>`
        : ''
    }
  </div>
</section>`
}

function abschnittHTML(a, index, kontext) {
  const kopf = `<div class="spalte-kopf">
        ${a.auge ? `<p class="auge">${esc(a.auge)}</p>` : ''}
        <h2>${esc(a.titel)}</h2>
        ${a.text ? `<p class="spalte-text">${esc(a.text)}</p>` : ''}
      </div>`

  if (a.typ === 'leistungen') {
    return `<section class="band" id="${esc(a.id)}">
  <div class="breite zweispalt">
      ${kopf}
      <div class="reihenliste">
        ${a.punkte
          .map(
            (p, i) => `<article class="reihe">
          <span class="reihe-nr">${String(i + 1).padStart(2, '0')}</span>
          <div>
            <h3>${esc(p.titel)}</h3>
            <p>${esc(p.text)}</p>
          </div>
        </article>`
          )
          .join('\n        ')}
      </div>
  </div>
</section>`
  }

  if (a.typ === 'ablauf') {
    return `<section id="${esc(a.id)}">
  <div class="breite">
      ${kopf}
      <ol class="schrittfolge">
        ${a.punkte
          .map(
            (p, i) => `<li>
          <span class="schritt-nr">Schritt ${i + 1}</span>
          <h3>${esc(p.titel)}</h3>
          <p>${esc(p.text)}</p>
        </li>`
          )
          .join('\n        ')}
      </ol>
  </div>
</section>`
  }

  if (a.typ === 'argumente') {
    return `<section class="flaeche" id="${esc(a.id)}">
  <div class="breite">
      ${kopf}
      <div class="saeulen">
        ${a.punkte
          .map(
            (p) => `<div class="saeule">
          ${icon(p.icon)}
          <h3>${esc(p.titel)}</h3>
          <p>${esc(p.text)}</p>
        </div>`
          )
          .join('\n        ')}
      </div>
  </div>
</section>`
  }

  if (a.typ === 'aussage') {
    return `<section class="aussage" id="${esc(a.id)}">
  <div class="breite aussage-innen">
      <p class="aussage-satz">${esc(a.titel)}</p>
      ${a.text ? `<p class="aussage-zusatz">${esc(a.text)}</p>` : ''}
  </div>
</section>`
  }

  // Kontakt — die Sachangaben kommen aus der Analyse, nicht aus dem Modelltext.
  const eintraege = [
    kontext.kontakt.telefon && {
      bez: 'Telefon',
      wert: kontext.kontakt.telefon,
      ziel: `tel:${kontext.kontakt.telefon.replace(/[^0-9+]/g, '')}`,
      ic: 'telefon',
    },
    kontext.kontakt.email && {
      bez: 'E-Mail',
      wert: kontext.kontakt.email,
      ziel: `mailto:${kontext.kontakt.email}`,
      ic: 'brief',
    },
    kontext.kontakt.adresse && { bez: 'Adresse', wert: kontext.kontakt.adresse, ziel: '', ic: 'ort' },
  ].filter(Boolean)

  return `<section class="band" id="${esc(a.id)}">
  <div class="breite zweispalt">
      ${kopf}
      <div class="kontaktliste">
        ${eintraege
          .map(
            (e) => `<div class="kontaktzeile">
          <span class="kontakt-bez">${icon(e.ic)}${esc(e.bez)}</span>
          ${
            e.ziel
              ? `<a class="kontakt-wert" href="${esc(sicheresZiel(e.ziel))}">${esc(e.wert)}</a>`
              : `<span class="kontakt-wert">${esc(e.wert)}</span>`
          }
        </div>`
          )
          .join('\n        ')}
      </div>
  </div>
</section>`
}

// ─────────────────────────────────────────────────────────────── Stilbogen ──
// Bewusst ohne Verläufe, ohne Schlagschatten-Karten und ohne die drei
// formgleichen Icon-Kacheln, an denen man KI-Seiten sofort erkennt.

function stilbogen(f, s) {
  return `  :root{
    --papier:${f.papier}; --flaeche:${f.flaeche}; --tinte:${f.tinte}; --leise:${f.leise};
    --linie:${f.linie}; --akzent:${f.akzent}; --akzent-text:${f.akzentText}; --akzent-auf:${f.akzentAuf};
    --schrift-kopf:${s.kopf}; --schrift-text:${s.text};
    --s1:.5rem; --s2:1rem; --s3:1.75rem; --s4:2.75rem; --s5:4.5rem; --s6:7rem;
    --rand:clamp(1.25rem,5vw,3rem); --max:71rem;
  }
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;background:var(--papier);color:var(--tinte);
    font:1.0625rem/1.72 var(--schrift-text);-webkit-font-smoothing:antialiased;
    text-rendering:optimizeLegibility}
  h1,h2,h3{font-family:var(--schrift-kopf);font-weight:600;letter-spacing:-.015em;margin:0}
  p{margin:0}
  a{color:inherit}
  :focus-visible{outline:2px solid var(--akzent-text);outline-offset:3px}
  .zeichen{width:1.15rem;height:1.15rem;flex:none;stroke:currentColor;stroke-width:1.5;
    fill:none;stroke-linecap:round;stroke-linejoin:round}
  .breite{max-width:var(--max);margin:0 auto;padding-inline:var(--rand)}

  /* Hinweisband — bleibt oben stehen und ist nicht wegklickbar. */
  .hinweisband{position:sticky;top:0;z-index:60;background:var(--tinte);color:var(--papier)}
  .hinweisband p{max-width:var(--max);margin:0 auto;padding:.6rem var(--rand);
    font-size:.8125rem;line-height:1.5;letter-spacing:.01em}
  .hinweisband a{color:inherit;text-underline-offset:3px}
  .streifen{display:flex;height:6px}
  .streifen span{display:block}

  .kopfleiste{border-bottom:1px solid var(--linie);background:var(--papier)}
  .kopfleiste-innen{display:flex;align-items:center;gap:var(--s3);
    padding-block:1.15rem;justify-content:space-between}
  .wortmarke{font-family:var(--schrift-kopf);font-size:1.2rem;font-weight:600;
    letter-spacing:-.01em;text-decoration:none}
  .menue{display:flex;gap:var(--s3);margin-left:auto}
  .menue a{font-size:.9375rem;text-decoration:none;color:var(--leise);
    padding-block:.25rem;border-bottom:1px solid transparent;transition:color .16s,border-color .16s}
  .menue a:hover{color:var(--tinte);border-color:var(--akzent)}

  .knopf{display:inline-block;background:var(--akzent);color:var(--akzent-auf);
    font:600 .9375rem/1 var(--schrift-text);padding:1.05rem 1.75rem;border-radius:2px;
    text-decoration:none;transition:background .16s}
  .knopf:hover{background:${dunkler(f.akzent, 0.16)}}
  .knopf-klein{padding:.8rem 1.25rem;font-size:.875rem}
  .knopf-leise{background:transparent;color:var(--tinte);
    box-shadow:inset 0 0 0 1px var(--linie)}
  .knopf-leise:hover{background:transparent;box-shadow:inset 0 0 0 1px var(--tinte)}

  section{padding-block:clamp(3.5rem,8vw,7rem)}
  .flaeche{background:var(--flaeche)}
  .band{border-top:1px solid var(--linie)}
  .auge{font-size:.75rem;font-weight:600;letter-spacing:.2em;text-transform:uppercase;
    color:var(--akzent-text);margin-bottom:1rem}
  h1{font-size:clamp(2.4rem,5.6vw,4.15rem);line-height:1.03}
  h2{font-size:clamp(1.75rem,3.4vw,2.6rem);line-height:1.12}
  h3{font-family:var(--schrift-text);font-size:1.0625rem;font-weight:600;letter-spacing:0}
  .anlauf{font-size:clamp(1.0625rem,1.5vw,1.25rem);line-height:1.62;color:var(--leise);
    max-width:34rem;margin-top:1.5rem}
  .spalte-text{color:var(--leise);margin-top:1rem;max-width:30rem}

  /* Hero: bewusst linksbündig und asymmetrisch statt mittig zentriert. */
  .hero{padding-block:clamp(3.5rem,9vw,8rem) clamp(3rem,7vw,6rem)}
  .hero-innen{display:grid;gap:clamp(2.5rem,5vw,4.5rem);align-items:start}
  @media(min-width:64rem){.hero-innen{grid-template-columns:minmax(0,1.55fr) minmax(15rem,.85fr)}}
  .knopfreihe{display:flex;flex-wrap:wrap;gap:.85rem;margin-top:var(--s4)}
  .hero-fakten{border-top:2px solid var(--tinte);padding-top:1.35rem}
  .fakt{padding-block:1.05rem;border-bottom:1px solid var(--linie)}
  .fakt:last-child{border-bottom:0}
  .fakt-bez{display:flex;align-items:center;gap:.5rem;font-size:.75rem;font-weight:600;
    letter-spacing:.14em;text-transform:uppercase;color:var(--leise)}
  .fakt-wert{display:block;margin-top:.4rem;font-size:1.0625rem}

  .zweispalt{display:grid;gap:clamp(2.25rem,5vw,4rem)}
  @media(min-width:60rem){
    .zweispalt{grid-template-columns:minmax(0,.72fr) minmax(0,1.28fr)}
    .zweispalt .spalte-kopf{position:sticky;top:5.5rem}
  }

  /* Leistungen als redaktionelle Zeilenliste statt als Kachelraster. */
  .reihenliste{display:grid}
  .reihe{display:grid;grid-template-columns:3.25rem minmax(0,1fr);gap:var(--s2);
    padding-block:1.6rem;border-top:1px solid var(--linie)}
  .reihe:last-child{border-bottom:1px solid var(--linie)}
  .reihe-nr{font-family:var(--schrift-kopf);font-size:1.05rem;color:var(--akzent-text);
    padding-top:.1rem;font-variant-numeric:tabular-nums}
  .reihe p{color:var(--leise);margin-top:.4rem;max-width:38rem}

  .schrittfolge{list-style:none;margin:var(--s4) 0 0;padding:0;display:grid;
    gap:var(--s3) var(--s4)}
  @media(min-width:56rem){.schrittfolge{grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))}}
  .schrittfolge li{border-top:2px solid var(--tinte);padding-top:1.15rem}
  .schritt-nr{display:block;font-size:.75rem;font-weight:600;letter-spacing:.14em;
    text-transform:uppercase;color:var(--akzent-text);margin-bottom:.55rem}
  .schrittfolge p{color:var(--leise);margin-top:.45rem}

  .saeulen{display:grid;gap:var(--s3);margin-top:var(--s4)}
  @media(min-width:56rem){
    .saeulen{grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:0}
    .saeule{padding-inline:var(--s3);border-left:1px solid var(--linie)}
    .saeule:first-child{padding-left:0;border-left:0}
  }
  .saeule .zeichen{width:1.5rem;height:1.5rem;color:var(--akzent-text);margin-bottom:.9rem}
  .saeule p{color:var(--leise);margin-top:.45rem}

  .aussage{background:var(--tinte);color:var(--papier);padding-block:clamp(3.5rem,7vw,6rem)}
  .aussage-satz{font-family:var(--schrift-kopf);font-size:clamp(1.5rem,3vw,2.3rem);
    line-height:1.28;max-width:44rem;letter-spacing:-.01em}
  .aussage-zusatz{margin-top:1.35rem;max-width:36rem;color:${heller(f.tinte, 0.62)}}

  .kontaktliste{display:grid}
  .kontaktzeile{display:grid;gap:.3rem;padding-block:1.35rem;border-top:1px solid var(--linie)}
  .kontaktzeile:last-child{border-bottom:1px solid var(--linie)}
  @media(min-width:40rem){.kontaktzeile{grid-template-columns:11rem minmax(0,1fr);align-items:baseline}}
  .kontakt-bez{display:flex;align-items:center;gap:.5rem;font-size:.75rem;font-weight:600;
    letter-spacing:.14em;text-transform:uppercase;color:var(--leise)}
  .kontakt-wert{font-size:1.15rem;text-decoration:none}
  a.kontakt-wert{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:4px;
    text-decoration-color:var(--linie)}
  a.kontakt-wert:hover{text-decoration-color:var(--akzent)}

  .fussleiste{border-top:1px solid var(--linie);padding-block:var(--s4) var(--s3)}
  .fuss-innen{display:grid;gap:var(--s3)}
  @media(min-width:56rem){.fuss-innen{grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)}}
  .fuss-marke{font-family:var(--schrift-kopf);font-size:1.05rem;font-weight:600;margin-bottom:.6rem}
  .fuss-zeile{font-size:.9375rem;color:var(--leise)}
  .fuss-zeile a{text-decoration:none}
  .fuss-hinweis p{font-size:.8125rem;line-height:1.65;color:var(--leise)}
  .fuss-hinweis p+p{margin-top:.6rem}

  @media(max-width:47.99rem){
    .menue{display:none}
  }
  @media(prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}`
}
