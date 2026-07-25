# Recht — was dieser Agent tut und was er bewusst nicht tut

Kurz und ehrlich, weil das hier der Punkt ist, an dem so ein Werkzeug schnell
gefährlich wird.

## Der Agent verschickt nichts

Er schreibt Mails, aber er versendet sie nicht. Es gibt in diesem Repo keine
Versandfunktion, kein SMTP, keine Mail-API — auch nicht auskommentiert für später.

Der Grund steht in § 7 Abs. 2 Nr. 2 UWG: Werbung per E-Mail ohne **vorherige
ausdrückliche Einwilligung** des Empfängers ist unzulässig. Das gilt gegenüber
Unternehmen genauso wie gegenüber Privatleuten — der oft zitierte B2B-Unterschied
existiert nur bei Telefonwerbung (§ 7 Abs. 2 Nr. 1: mutmaßliche Einwilligung).
Die Adresse aus dem Impressum ist keine Einwilligung. Die Bestandskunden-Ausnahme
in § 7 Abs. 3 greift hier nicht, denn sie setzt eine bestehende Geschäftsbeziehung
voraus. Eine einzige Mail genügt für einen Unterlassungsanspruch; die
Abmahnkosten beginnen bei einigen hundert Euro und werden bei Serienversand
schnell vierstellig.

Was der Agent liefert, ist ein **Entwurf**. Über welchen Weg du Kontakt aufnimmst
— Telefon (im B2B nach § 7 Abs. 2 Nr. 1 zulässig), das Kontaktformular des
Unternehmens, Post, oder ein persönliches Gespräch — entscheidest du.

## Die Entwurfsseiten

Jede erzeugte Seite ist öffentlich erreichbar, damit du sie verlinken kannst.
Deshalb gelten dort feste Regeln, die im Code erzwungen werden und nicht nur im
Prompt stehen:

- **Keine fremden Bilder, keine Logos.** Fotos sind nach § 72 UrhG geschützt,
  auch ohne künstlerischen Anspruch, und Logos zusätzlich als Marke. Die Seiten
  enthalten ausschließlich Farbflächen und selbst gezeichnete Icons. Der
  Firmenname erscheint als Schriftzug, nicht als Logo.
- **Keine wörtlich übernommenen Texte.** Fakten wie Leistungen, Adresse oder
  Telefonnummer sind frei und werden übernommen. Fließtexte werden neu
  geschrieben.
- **Nichts Erfundenes.** Keine Kundenstimmen, Bewertungen, Zertifikate,
  Auszeichnungen, Jahreszahlen oder Preise — weder ausgedacht noch kopiert.
  Fehlt eine Information, entfällt der Abschnitt.
- **Als Entwurf gekennzeichnet.** Oben auf jeder Seite steht unübersehbar, dass
  es ein unverbindlicher Gestaltungsentwurf ist und keine offizielle Seite des
  Unternehmens.
- **Nicht auffindbar.** `noindex, nofollow` als Meta-Tag, dazu `robots.txt` und
  ein `X-Robots-Tag`-Header. Die Seiten sollen niemandem im Suchergebnis
  begegnen und der echten Firma nicht in die Quere kommen.
- **Impressum.** Anbieter der Entwurfsseite bin ich, nicht das Unternehmen.
  Deshalb liegt dort mein Impressum nach § 5 DDG.
- **Auf Zuruf weg.** `pitch --loeschen <lauf-id>` entfernt die Seiten wieder.
  Wer eine Entfernung möchte, bekommt sie sofort, ohne Rückfragen.

## Die Screenshots

Der Screenshot der bestehenden Website bleibt **lokal** im Cockpit auf deinem
Rechner. Er wird nicht mitveröffentlicht, weil auch ein Screenshot die
geschützten Inhalte der fremden Seite enthält.

## Der Ton

Die Analyse beschreibt, was auf einer Seite fehlt oder schwer zu finden ist —
sie bewertet den Betrieb nicht und redet ihn nicht schlecht. Das ist nicht nur
Höflichkeit: Herabsetzende Äußerungen über Mitbewerber oder fremde Unternehmen
sind nach § 4 Nr. 1 UWG angreifbar.

---

Das hier ist kein Rechtsrat und ersetzt keinen Anwalt. Es ist die Begründung
dafür, warum dieses Werkzeug so gebaut ist, wie es gebaut ist.
