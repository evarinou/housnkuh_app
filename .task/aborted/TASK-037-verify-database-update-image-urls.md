# Task: TASK-037-verify-database-update-image-urls
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] Bild-URLs werden korrekt in der Datenbank gespeichert
- [ ] `vendorProfile.profilBild` wird aktualisiert
- [ ] `vendorProfile.bannerBild` wird aktualisiert
- [ ] Alle Tests bestehen (client & server)

## Test Plan
### Unit Tests
- [ ] Keine Unit-Tests erforderlich (Validierungs-Task)

### Integration Tests  
- [ ] DB-Update nach Upload prüfen
- [ ] Profile-Reload-Test durchführen

### Manual Testing
- [ ] Upload durchführen → DB-Eintrag prüfen
- [ ] Seite neu laden → Bilder sind noch da
- [ ] API-Response enthält korrekte URLs

## Implementation Details
**Voraussetzung**: TASK-034, TASK-035, TASK-036 müssen abgeschlossen sein

### Test-Methoden:

#### 1. MongoDB-Direkt-Check:
```javascript
// In MongoDB Shell oder Compass:
db.users.findOne(
  {_id: ObjectId("USER_ID")}, 
  {"vendorProfile.profilBild": 1, "vendorProfile.bannerBild": 1}
)
```

#### 2. API-Response-Check:
```bash
# GET Profile nach Upload
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:4000/api/vendor-auth/profile/USER_ID
```

#### 3. Browser-Reload-Test:
- Upload durchführen
- Seite komplett neu laden (F5)
- Prüfen ob Bilder noch angezeigt werden

### Debugging-Ergänzung:
Falls URLs nicht gespeichert werden, in `updateVendorProfile` hinzufügen:

```javascript
// Nach user.save() (ca. Zeile 1089):
logger.info('💾 User saved, final vendorProfile:', {
  profilBild: user.vendorProfile?.profilBild,
  bannerBild: user.vendorProfile?.bannerBild
});
```

## Definition of Done
- [ ] URLs sind in MongoDB-Dokument gespeichert
- [ ] GET /profile API gibt korrekte URLs zurück  
- [ ] Browser-Reload zeigt Bilder korrekt an
- [ ] Upload + Reload Workflow funktioniert komplett
- [ ] Problem-Root-Cause identifiziert (falls URLs nicht gespeichert werden)