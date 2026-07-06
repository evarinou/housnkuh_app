# housnkuh – Fahrplan zur Fertigstellung (Claude Code)

> **Zweck:** Diese Datei ist dein Ablaufplan. Leg sie im Repo-Root ab
> (z. B. als `docs/FAHRPLAN.md`). Sie funktioniert mit **jedem** Modell –
> Fable, Opus, Sonnet. Die vier Artefakte, die dabei entstehen
> (`ARCHITECTURE.md`, `CLAUDE.md`, `AUDIT.md`, `FEATURES.md`, `TODO.md`),
> sind dein modellunabhängiges Projektgedächtnis. Selbst wenn Fable für dich
> wegfällt, findet jede neue Session sofort Anschluss.

## So benutzt du diese Datei

Arbeite die Phasen **der Reihe nach** ab. Jede Phase produziert ein Artefakt,
das die nächste Phase als Kontext nutzt. Kopiere den jeweiligen Prompt-Block
in Claude Code. Nach jeder Phase kurz gegenlesen, bevor du weitergehst.

**Wichtige Regel für gewachsene Codebases:** Nie „prüf mal alles" oder „räum
auf" in einem Rutsch. Erst kartografieren → bewerten → mit dir abstimmen →
dann ändern. Das schützt dich davor, dass ein Modell etwas „aufräumt", das du
bewusst so gebaut hattest.

---

## Phase 0 – Grundlage & Projektgedächtnis

> Ziel: Claude Code versteht deine Architektur und legt die Dateien an, die
> jede zukünftige Session automatisch laden.

```
Erkunde das gesamte Repo gründlich, ohne eine einzige Zeile Code zu ändern.

Erstelle danach zwei Dateien:

1. ARCHITECTURE.md – beschreibe:
   - Ordnerstruktur und was wo liegt
   - Datenfluss: React/TS-Frontend ↔ Node/MongoDB-Backend
   - POS-Integration via flour.io (wie angebunden, welche Endpunkte)
   - Kiosk-Setup (Ubuntu-PCs, wie deployt, wie aktualisiert)
   - Verwendete Konventionen – und explizit, wo sie inkonsistent sind
   - Externe Abhängigkeiten und Umgebungsvariablen

2. CLAUDE.md (im Repo-Root) – kompakt:
   - Kern-Konventionen, an die du dich bei jeder Änderung hältst
   - Build-, Start- und Test-Befehle
   - No-Gos / Dinge, die absichtlich so sind und nicht "aufgeräumt" werden
     sollen (frag mich, falls du unsicher bist, was absichtlich so ist)

Ändere in dieser Phase nichts am eigentlichen Code.
```

---

## Phase 1 – Audit (Gesundheitscheck)

> Ziel: ehrliche Bestandsaufnahme, **ohne** sofort zu fixen. Führe die vier
> Durchläufe nacheinander aus – ein Fokus pro Durchlauf, sonst wird es
> oberflächlich.

**Durchlauf 1a – Struktur & toter Code**
```
Analysiere das Repo auf: ungenutzte Dateien, Dead Code, verwaiste
Komponenten, doppelte Logik (dieselbe Funktion in mehreren Varianten – bei
gewachsenem Code häufig). Ändere nichts. Schreibe die Befunde in AUDIT.md
unter der Überschrift "Struktur", jeweils mit Datei/Ort und Priorität
(kritisch / wichtig / kosmetisch).
```

**Durchlauf 1b – Sicherheit**
```
Prüfe: Auth-Flow, Input-Validierung, MongoDB-Injection-Risiken, Secrets im
Code, CORS-Konfiguration, Umgang mit Zahlungsdaten (flour.io). Ändere nichts.
Ergänze die Befunde in AUDIT.md unter "Sicherheit" mit Priorität.
```

**Durchlauf 1c – Konsistenz & TypeScript**
```
Prüfe: uneinheitliche Fehlerbehandlung, gemischte Muster (async/await vs.
Promises), TypeScript-Lücken (any-Wildwuchs, fehlende Typen), uneinheitliche
Namens- und Ordnerkonventionen. Ändere nichts. Ergänze AUDIT.md unter
"Konsistenz" mit Priorität.
```

**Durchlauf 1d – Betrieb & Robustheit**
```
Prüfe: Was passiert bei Ausfall von flour.io oder Netzverlust am Kiosk?
Fehlerzustände, Retry-Logik, Logging, Monitoring. Gibt es Tests? Ändere
nichts. Ergänze AUDIT.md unter "Betrieb" mit Priorität. Erstelle am Ende von
AUDIT.md eine priorisierte Gesamt-Reihenfolge zum Abarbeiten.
```

---

## Phase 2 – Funktionen eruieren & festlegen (gemeinsam)

> Ziel: Bevor Features gebaut werden, gemeinsam klären, **was housnkuh
> überhaupt können soll**. Das ist ein Dialog, keine Einbahnstraße.

```
Bevor wir Features umsetzen, lass uns gemeinsam den Funktionsumfang klären.

Schritt 1: Erstelle aus dem Code eine Liste ALLER Funktionen, die housnkuh
aktuell schon hat (Frontend-Seiten, Backend-Endpunkte, POS-Funktionen,
Kiosk-Funktionen, Admin-Bereich). Markiere je Funktion: vollständig /
angefangen / kaputt.

Schritt 2: Stell mir dann gezielt Fragen, um herauszufinden, welche Funktionen
für einen "fertigen" Zustand noch fehlen. Denk dabei an die typischen Lücken
eines Self-Service-Regionalmarktplatzes: Anbieter-Onboarding, Produktpflege,
Bestand/Verfügbarkeit, Zahlung/Abrechnung, Kundenansicht, Kiosk-Bedienung,
Reporting für Anbieter. Frag mich pro Bereich, was mir wichtig ist und was
raus kann.

Schritt 3: Halte das Ergebnis in FEATURES.md fest:
- "Vorhanden & fertig"
- "Vorhanden, muss überarbeitet werden"
- "Fehlt noch – muss gebaut werden"
- "Bewusst NICHT im Scope"

Stell mir die Fragen einzeln nacheinander, nicht alle auf einmal.
```

---

## Phase 3 – Fixes abarbeiten

> Ziel: erst jetzt Änderungen. Reihenfolge: Sicherheit/Daten → Konsistenz →
> Kosmetik. Kleine, thematisch klare Commits.

```
Wir arbeiten jetzt AUDIT.md ab, in dieser Reihenfolge:
1. kritische Sicherheits- und Datenprobleme
2. Konsistenz-Angleichung (damit sauberes Feature-Bauen danach leichter geht)
3. Kosmetik

Nimm dir EINE Kategorie vor, erkläre kurz was du änderst, mach die Änderung
in einem thematisch abgegrenzten Commit. Falls Tests existieren, lass sie
danach laufen. Falls nicht und der Pfad kritisch ist, schreib vorher ein paar
Tests. Hake erledigte Punkte in AUDIT.md ab. Frag mich vor jeder Kategorie
kurz um Freigabe.
```

---

## Phase 4 – Features & Politur (Fertigstellung)

> Ziel: die in FEATURES.md festgelegten fehlenden Funktionen + Bug-Politur.

```
Erstelle aus FEATURES.md ("Fehlt noch" + "muss überarbeitet werden") eine
TODO.md mit einem Punkt pro Aufgabe, jeweils mit klaren Akzeptanzkriterien
(wann gilt es als fertig). Priorisiere: was blockiert den "fertig"-Zustand am
meisten?

Danach arbeite die TODO.md Punkt für Punkt ab. Ein Punkt = ein Commit. Nach
jedem Punkt: Akzeptanzkriterien gegenprüfen und in TODO.md abhaken. Frag mich
bei Unklarheiten, statt zu raten.
```

---

## Dein Projektgedächtnis (bleibt nach Fable erhalten)

| Datei | Inhalt | Entsteht in |
|---|---|---|
| `CLAUDE.md` | Konventionen, Befehle, No-Gos – lädt jede Session automatisch | Phase 0 |
| `ARCHITECTURE.md` | Wie das System aufgebaut ist | Phase 0 |
| `AUDIT.md` | Befunde + Prioritäten + Abhak-Status | Phase 1 |
| `FEATURES.md` | Was es kann, was fehlt, was bewusst draußen bleibt | Phase 2 |
| `TODO.md` | Konkrete Aufgaben mit Akzeptanzkriterien | Phase 4 |

Solange diese Dateien im Repo liegen, kann **jedes** Modell nahtlos
weitermachen – du bist nicht an Fable gebunden.

---

## Tipp zur Zeiteinteilung (falls Fable morgen endet)

Wenn die Zeit knapp ist, priorisiere **Phase 0 und Phase 2**. Diese beiden
erzeugen den meisten bleibenden Wert: die Architektur-Erfassung und die
gemeinsam festgelegte Feature-Landkarte. Audit und Umsetzung kannst du danach
mit jedem anderen Modell fortsetzen, weil die Grundlage dann geschrieben ist.
