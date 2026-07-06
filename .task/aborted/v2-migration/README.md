# ⛔ V2 Tasks - BLOCKIERT

## Status: WARTEN AUF V3 MIGRATION

Alle Tasks in diesem Verzeichnis basieren auf der veralteten Flourio API v2 und sind blockiert bis die v3 Migration abgeschlossen ist.

## ⚠️ NICHT BEARBEITEN

Diese Tasks dürfen NICHT bearbeitet werden, bis:

1. ✅ TASK-051 abgeschlossen (Bearer Token erhalten)
2. ✅ TASK-052 abgeschlossen (Rate Limit Handler)
3. ✅ TASK-053 abgeschlossen (v3 Dokumentation)

## 📋 Enthaltene Tasks

- TASK-027 bis TASK-050 (24 Tasks)
- Alle basieren auf `api.flour.cloud/api/v2`
- Müssen auf `flour.host/api/v3` migriert werden

## 🔄 Migration Process

1. Warte auf Abschluss der Prerequisites (TASK-051, -052, -053)
2. Update jeden Task mit v3 Endpoints und Authentication
3. Verschiebe Task zurück nach `/current/` wenn bereit
4. Implementiere mit neuer v3 API

## 📊 Status

- **Blockiert seit:** 2025-09-25
- **Grund:** Flourio API v2 → v3 Migration
- **Geschätzte Freigabe:** Nach Abschluss der Prerequisites

---

**WICHTIG:** Bei Fragen zu v3 Migration siehe:
- `/docs/flourio-api-v3/MIGRATION_GUIDE.md`
- `/docs/flourio-api-v3/TASK_IMPACT_ANALYSIS.md`