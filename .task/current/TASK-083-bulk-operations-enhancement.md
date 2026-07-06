# TASK-083: Bulk Operations Enhancement

**Status**: PLANNING
**Created**: 2025-11-17
**Assignee**: Claude
**Priority**: MEDIUM
**Estimated**: 2-3h

## Goal
Add comprehensive bulk selection and bulk action capabilities to both Admin and Vendor product management UIs, enabling efficient management of multiple products simultaneously.

## Context
Currently, ArticleManagementPage has basic bulk sync and category assignment. This should be enhanced with better UX (bulk action bar, selection count, clear feedback) and extended to VendorProductsPage. Vendors need bulk operations for efficient product management.

## Acceptance Criteria
- [ ] Bulk selection UI working in both Admin and Vendor pages
- [ ] "Select All" checkbox functional (respects filters)
- [ ] Selected count badge displayed
- [ ] Bulk Actions Bar appears when items selected
- [ ] Bulk Sync to FlourIO working
- [ ] Bulk Category Assignment working (both Admin and Vendor)
- [ ] Bulk Availability Change working
- [ ] Bulk Delete working (Admin only, with confirmation)
- [ ] Progress feedback during bulk operations
- [ ] Success/error notifications
- [ ] All tests passing
- [ ] TypeScript compilation successful

## Technical Details

### UI Components

#### Bulk Actions Bar
**Component**: Inline in ArticleManagementPage and VendorProductsPage

**Appearance**:
```
┌──────────────────────────────────────────────────────┐
│ ✓ 5 Produkte ausgewählt                             │
│ [Sync zu FlourIO] [Kategorie zuweisen]              │
│ [Verfügbarkeit ändern] [Löschen]  [Auswahl aufheben]│
└──────────────────────────────────────────────────────┘
```

**Features**:
- Sticky position (stays visible when scrolling)
- Animated entrance (slide up from bottom)
- Clear action buttons with icons
- Selection count badge
- "Clear selection" button

#### Selection State Management
```typescript
const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
const [bulkAction, setBulkAction] = useState<{
  type: 'sync' | 'category' | 'availability' | 'delete';
  status: 'idle' | 'processing' | 'success' | 'error';
  progress: number;
}>({ type: 'sync', status: 'idle', progress: 0 });

const toggleSelection = (productId: string) => {
  setSelectedProducts(prev =>
    prev.includes(productId)
      ? prev.filter(id => id !== productId)
      : [...prev, productId]
  );
};

const toggleSelectAll = () => {
  const visibleIds = filteredProducts.map(p => p._id);
  const allSelected = visibleIds.every(id => selectedProducts.includes(id));

  if (allSelected) {
    setSelectedProducts(prev => prev.filter(id => !visibleIds.includes(id)));
  } else {
    setSelectedProducts(prev => [...new Set([...prev, ...visibleIds])]);
  }
};

const clearSelection = () => setSelectedProducts([]);
```

### Bulk Operations

#### 1. Bulk Sync to FlourIO
**Admin & Vendor**

**Endpoint**: `POST /api/admin/flourio/products/sync-bulk`
```typescript
{
  productIds: string[]
}
```

**Flow**:
1. User selects products
2. Click "Sync zu FlourIO"
3. Show progress bar
4. API call with selected IDs
5. Update each product status in real-time
6. Show summary: "8 von 10 Produkten erfolgreich synchronisiert"
7. Highlight errors, allow retry for failed items

**Progress Tracking**:
```typescript
const handleBulkSync = async () => {
  setBulkAction({ type: 'sync', status: 'processing', progress: 0 });

  const batchSize = 5;
  const batches = chunkArray(selectedProducts, batchSize);

  for (let i = 0; i < batches.length; i++) {
    await axios.post(`${apiUrl}/admin/flourio/products/sync-bulk`, {
      productIds: batches[i]
    });

    setBulkAction(prev => ({
      ...prev,
      progress: ((i + 1) / batches.length) * 100
    }));
  }

  setBulkAction({ type: 'sync', status: 'success', progress: 100 });
  await fetchProducts();
  clearSelection();
};
```

#### 2. Bulk Category Assignment
**Admin & Vendor**

**UI**: Reuse existing AssignCategoryModal
**Endpoint**: Assign tags to multiple products

**Flow**:
1. Select products
2. Click "Kategorie zuweisen"
3. Modal shows selected product names
4. Select category/tags
5. Confirm
6. Update all products
7. Refresh list
8. Clear selection

#### 3. Bulk Availability Change
**Admin & Vendor**

**UI**: Dropdown modal
**Options**: available, limited, unavailable

**Flow**:
1. Select products
2. Click "Verfügbarkeit ändern"
3. Modal with dropdown
4. Select new availability
5. Confirm
6. Update all products
7. Refresh list

#### 4. Bulk Delete
**Admin only**

**UI**: Confirmation modal with warning
**Security**: Double confirmation for destructive action

**Flow**:
1. Select products
2. Click "Löschen" (red button)
3. Modal: "Wirklich 5 Produkte löschen? Dies kann nicht rückgängig gemacht werden."
4. Type "LÖSCHEN" to confirm
5. Delete all products
6. Show success notification
7. Refresh list

### Vendor Differences

**Admin Actions**:
- Sync zu FlourIO ✅
- Kategorie zuweisen ✅
- Verfügbarkeit ändern ✅
- Löschen ✅

**Vendor Actions**:
- Sync zu FlourIO ✅
- Kategorie zuweisen ✅
- Verfügbarkeit ändern ✅
- Löschen ❌ (hidden)

### Error Handling

**Partial Success**:
```
✓ 8 von 10 Produkten erfolgreich synchronisiert
✗ 2 Produkte fehlgeschlagen:
  - Bio-Äpfel: Keine FlourIO-Kategorie
  - Kartoffeln: API-Fehler

[Fehlgeschlagene erneut versuchen]
```

**Complete Failure**:
```
✗ Bulk-Operation fehlgeschlagen
Fehler: API nicht erreichbar

[Erneut versuchen] [Abbrechen]
```

## Files to Modify
- [ ] `client/src/pages/admin/ArticleManagementPage.tsx` (enhance existing)
- [ ] `client/src/pages/vendor/VendorProductsPage.tsx` (add bulk operations)
- [ ] `client/src/components/admin/BulkActionsBar.tsx` (NEW shared component)
- [ ] `client/src/components/admin/BulkActionsBar.test.tsx`

## Test Plan

### Unit Tests

#### BulkActionsBar.test.tsx
- [ ] Renders with selection count
- [ ] Action buttons trigger callbacks
- [ ] Clear selection works
- [ ] Admin-only actions hidden for vendors

#### ArticleManagementPage.test.tsx (additions)
- [ ] Bulk selection works
- [ ] Select all respects filters
- [ ] Bulk sync updates all selected
- [ ] Bulk delete confirmation required
- [ ] Progress tracking works
- [ ] Error handling for partial failures

#### VendorProductsPage.test.tsx (additions)
- [ ] Bulk selection works
- [ ] Bulk actions available (except delete)
- [ ] Progress feedback clear
- [ ] Selection cleared after action

### Integration Tests
- [ ] Select 5 products → Bulk sync → All synced
- [ ] Select all (with filters) → Only filtered items selected
- [ ] Bulk category assign → All products updated
- [ ] Bulk delete (admin) → Products removed
- [ ] Partial failure → Failed items highlighted, retry works

### Manual Testing
- [ ] Select/deselect individual items
- [ ] Select all across multiple pages (if paginated)
- [ ] Bulk sync shows progress bar
- [ ] Errors clearly displayed
- [ ] Success notifications informative
- [ ] Mobile-friendly (responsive bulk bar)

## Related Tasks
- Depends on: TASK-059 (Admin UI), TASK-081 (Vendor UI)
- Enhances: Existing bulk operations in ArticleManagementPage

## Performance Considerations
- **Batch Processing**: Process large selections in batches (5-10 at a time)
- **Progress Feedback**: Real-time updates via polling or WebSocket
- **Debouncing**: Debounce selection changes to avoid excessive re-renders
- **Optimistic Updates**: Update UI optimistically, rollback on failure

## UX Considerations
- **Clear Feedback**: Always show what's happening (loading, progress, success, errors)
- **Undo Option**: Consider "Undo" for non-destructive actions
- **Confirmation**: Require confirmation for destructive actions
- **Keyboard Shortcuts**: Shift+Click for range selection, Ctrl+A for select all
- **Accessibility**: Screen reader announcements for selection changes

## Notes
- Consider adding "Select by filter" (e.g., "Select all with status 'error'")
- Consider export to CSV for selected products
- Consider bulk import from CSV (future)
- Progress bar animation should be smooth and informative

---

## Progress Log

### 2025-11-17
- Status: PLANNING
- Task file created
- Bulk operations and UX flow documented
