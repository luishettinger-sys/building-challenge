// Baut das Pitch-Cockpit: eine Übersichtsseite über alle Leads eines Laufs.
// Bewusst ohne KI zusammengesetzt — was jedes Mal gleich aussehen soll,
// gehört in Code, nicht in einen Prompt.
//
// Das Cockpit bleibt lokal. Es zeigt Screenshots fremder Websites, und die sind
// als Lichtbilder geschützt: sie dürfen auf keinen öffentlichen Server.

const esc = (s) =>
  String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

export function baueCockpit(zielgruppe, leads, absender, basis = '') {
  const karten = leads.map(karte).join('\n')
  const gesamt = leads.length

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Pitch-Cockpit — ${esc(zielgruppe)}</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  :root{
    --bg:#0b0d10; --karte:#14181d; --rand:#232a32; --text:#e8ecf1;
    --leise:#9aa6b2; --akzent:#5eead4; --warn:#fbbf24;
  }
  body{margin:0;background:var(--bg);color:var(--text);
    font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    -webkit-font-smoothing:antialiased}
  .huelle{max-width:1180px;margin:0 auto;padding:clamp(24px,5vw,56px) clamp(16px,4vw,32px)}
  header{border-bottom:1px solid var(--rand);padding-bottom:28px;margin-bottom:40px}
  .marke{display:inline-flex;align-items:center;gap:9px;font-size:13px;
    letter-spacing:.14em;text-transform:uppercase;color:var(--akzent);font-weight:600}
  .punkt{width:7px;height:7px;border-radius:50%;background:var(--akzent);
    box-shadow:0 0 12px var(--akzent)}
  h1{font-size:clamp(28px,4.4vw,42px);line-height:1.15;margin:16px 0 10px;letter-spacing:-.02em}
  h1 span{color:var(--leise)}
  .zeile{color:var(--leise);font-size:15px}
  .gitter{display:grid;gap:26px}
  .lead{background:var(--karte);border:1px solid var(--rand);border-radius:16px;overflow:hidden}
  .kopf{display:flex;flex-wrap:wrap;gap:14px;align-items:baseline;
    justify-content:space-between;padding:22px 24px 0}
  .kopf h2{margin:0;font-size:21px;letter-spacing:-.01em}
  .meta{color:var(--leise);font-size:13.5px;margin-top:4px}
  .score{flex:none;font-size:12px;font-weight:700;letter-spacing:.06em;
    color:var(--warn);border:1px solid var(--warn);border-radius:999px;padding:5px 12px}
  .split{display:grid;grid-template-columns:1fr;gap:22px;padding:22px 24px 26px}
  @media(min-width:900px){.split{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
  .block h3{font-size:11.5px;letter-spacing:.13em;text-transform:uppercase;
    color:var(--leise);margin:0 0 12px;font-weight:600}
  .bild{display:block;width:100%;border:1px solid var(--rand);border-radius:10px;
    background:#000;aspect-ratio:16/10;object-fit:cover;object-position:top}
  .fehlt{display:grid;place-items:center;color:var(--leise);font-size:13px}
  .maengel{list-style:none;margin:0;padding:0;display:grid;gap:12px}
  .maengel li{border-left:2px solid var(--warn);padding-left:13px}
  .maengel b{display:block;font-size:14.5px;font-weight:600}
  .maengel p{margin:3px 0 0;font-size:13.5px;color:var(--leise)}
  .knoepfe{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
  .btn{display:inline-flex;align-items:center;gap:7px;font:inherit;font-size:14px;
    font-weight:600;padding:11px 17px;border-radius:9px;cursor:pointer;
    text-decoration:none;border:1px solid var(--rand);background:transparent;color:var(--text)}
  .btn:hover{border-color:var(--akzent);color:var(--akzent)}
  .btn.voll{background:var(--akzent);color:#06251f;border-color:var(--akzent)}
  .btn.voll:hover{filter:brightness(1.08);color:#06251f}
  .pruefung{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:14px;
    padding:11px 14px;border-radius:9px;background:#0f1a17;border:1px solid #1e3b34;
    font-size:13px;color:#a7e8d7}
  .pruefung.beanstandet{background:#1d1607;border-color:#4a3a12;color:var(--warn)}
  .pruefung b{font-weight:600}
  .pruefung span{color:var(--leise)}
  .mail{margin-top:16px;background:#0e1216;border:1px solid var(--rand);
    border-radius:11px;padding:16px 18px}
  .betreff{font-size:14px;font-weight:600;padding-bottom:10px;margin-bottom:11px;
    border-bottom:1px solid var(--rand)}
  .betreff span{color:var(--leise);font-weight:400}
  .koerper{margin:0;font:inherit;font-size:13.5px;line-height:1.68;color:#cfd8e3;
    white-space:pre-wrap;word-wrap:break-word}
  footer{margin-top:48px;padding-top:22px;border-top:1px solid var(--rand);
    color:var(--leise);font-size:13px;display:flex;flex-wrap:wrap;gap:8px;
    justify-content:space-between}
  footer a{color:var(--akzent)}
</style>
</head>
<body>
<div class="huelle">
  <header>
    <div class="marke"><span class="punkt"></span> Pitch-Maschine</div>
    <h1>${esc(zielgruppe)} <span>· ${gesamt} ${gesamt === 1 ? 'Lead' : 'Leads'} versandfertig</span></h1>
    <p class="zeile">Jeder Lead: analysiert, neue Startseite gebaut und live gestellt, Mail geschrieben.
      Du musst nur noch auf Senden drücken.</p>
    <p class="zeile" style="margin-top:10px">Diese Übersicht liegt nur auf deiner Platte. Live steht
      ausschließlich der Ordner mit den Entwürfen${basis ? ` (${esc(basis)})` : ''}.
      Die Screenshots der fremden Seiten bleiben hier.</p>
  </header>
  <div class="gitter">
${karten}
  </div>
  <footer>
    <span>Erstellt für ${esc(absender.name)}</span>
    <span>Pitch-Maschine · SKAILE Building Challenge</span>
  </footer>
</div>
<script>
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-kopieren]')
    if (!b) return
    var text = document.getElementById(b.getAttribute('data-kopieren')).innerText
    navigator.clipboard.writeText(text).then(function () {
      var alt = b.textContent
      b.textContent = 'Kopiert'
      setTimeout(function () { b.textContent = alt }, 1600)
    })
  })
</script>
</body>
</html>`
}

/** Macht das Ergebnis der Prüfung sichtbar — bestanden oder Fundstelle im Klartext. */
function pruefzeile(befund) {
  if (!befund) return ''
  if (befund.bestanden) {
    return `<div class="pruefung"><b>✓ ${esc(befund.meldung)}</b>
            <span>keine fremden Bilder · keine externen Ressourcen · noindex · Impressum verlinkt</span></div>`
  }
  const funde = [...(befund.hart ?? []), ...(befund.weich ?? [])]
  return `<div class="pruefung beanstandet"><b>Beanstandet:</b> <span>${esc(funde.join(' · '))}</span></div>`
}

function karte(lead) {
  const a = lead.analyse
  const maengel = (a.schwachstellen ?? [])
    .map((s) => `<li><b>${esc(s.titel)}</b><p>${esc(s.beobachtung)} ${esc(s.kostet)}</p></li>`)
    .join('')

  const vorher = lead.screenshotDatei
    ? `<img class="bild" src="${esc(lead.screenshotDatei)}" alt="Jetzige Startseite von ${esc(a.firma)}" loading="lazy">`
    : `<div class="bild fehlt">Kein Screenshot verfügbar</div>`

  const mailId = `mail-${esc(lead.slug)}`

  return `    <article class="lead">
      <div class="kopf">
        <div>
          <h2>${esc(a.firma)}</h2>
          <div class="meta">${esc(a.branche)}${a.ort ? ' · ' + esc(a.ort) : ''} · <a href="${esc(lead.url)}" target="_blank" rel="noopener" style="color:inherit">${esc(lead.host)}</a></div>
        </div>
        <div class="score">Potenzial ${esc(a.potenzial ?? '–')}/10</div>
      </div>
      <div class="split">
        <div class="block">
          <h3>Heute</h3>
          ${vorher}
          <div class="knoepfe">
            <a class="btn" href="${esc(lead.url)}" target="_blank" rel="noopener">Alte Seite öffnen</a>
          </div>
        </div>
        <div class="block">
          <h3>Was fehlt</h3>
          <ul class="maengel">${maengel}</ul>
          <div class="knoepfe">
            <a class="btn voll" href="${esc(lead.neueSeite)}" target="_blank" rel="noopener">Neue Seite ansehen</a>
            <button class="btn" data-kopieren="${mailId}">Mail kopieren</button>
          </div>
          ${pruefzeile(lead.befund)}
        </div>
      </div>
      <div class="split" style="padding-top:0">
        <div class="block" style="grid-column:1/-1">
          <div class="mail">
            <div class="betreff"><span>Betreff:</span> ${esc(lead.mail.betreff)}</div>
            <pre class="koerper" id="${mailId}">${esc(lead.mail.koerper)}</pre>
          </div>
        </div>
      </div>
    </article>`
}
