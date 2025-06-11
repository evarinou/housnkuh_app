# T04_S09B: Dashboard Management Placeholders

## Task Overview
**Sprint**: S09B - Dashboard Core Enhancement  
**Story Points**: 6 SP (Combined: Product Management, Reports, Customer Invoices, Vendor Invoices)  
**Priority**: High  
**Type**: Feature Enhancement  

## User Story
**As a** vendor using the dashboard  
**I want** to see placeholders for key management functions  
**So that** I understand what features will be available and can prepare for future functionality

## Acceptance Criteria

### AC1: Product Management Placeholder
- **Given** I am on the vendor dashboard
- **When** I view the dashboard cards
- **Then** I should see a "Produkte verwalten" card with appropriate icon and description

### AC2: Reports Placeholder
- **Given** I am on the vendor dashboard  
- **When** I view the dashboard cards
- **Then** I should see a "Berichte einsehen" card explaining future reporting features

### AC3: Customer Invoices Placeholder
- **Given** I am on the vendor dashboard
- **When** I view the dashboard cards  
- **Then** I should see an "Ausgangsrechnungen (Endkunde)" card for customer billing management

### AC4: Vendor Invoices Placeholder
- **Given** I am on the vendor dashboard
- **When** I view the dashboard cards
- **Then** I should see an "Eingangsrechnungen (Housnkuh)" card for housnkuh billing

### AC5: Responsive Layout
- **Given** I am viewing the dashboard on different screen sizes
- **When** the new cards are displayed
- **Then** they should maintain a clean, organized grid layout

## Technical Implementation

### Files to Modify
- `client/src/pages/VendorDashboardPage.tsx`

### Implementation Details

#### Add Required Icons
```typescript
// Update imports at top of file
import { 
  User, Package, Calendar, CreditCard, AlertTriangle, Clock, XCircle, CheckCircle,
  ShoppingCart, BarChart3, FileText, Receipt 
} from 'lucide-react';
```

#### Update Dashboard Grid Layout
```typescript
// Replace the existing grid around line 240
// Change from 2-column to 3-column grid for better layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
  
  {/* Existing Buchungen card */}
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <div className="bg-blue-50 p-4 border-b border-blue-100">
      <div className="flex items-center">
        <Package className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-lg font-semibold text-secondary">Meine Buchungen</h2>
      </div>
    </div>
    <div className="p-6">
      {/* existing content */}
    </div>
  </div>

  {/* NEW: Produkte verwalten */}
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <div className="bg-emerald-50 p-4 border-b border-emerald-100">
      <div className="flex items-center">
        <ShoppingCart className="w-6 h-6 text-emerald-600 mr-2" />
        <h2 className="text-lg font-semibold text-secondary">Produkte verwalten</h2>
      </div>
    </div>
    <div className="p-6">
      <p className="text-gray-600 mb-4">Verwalten Sie Ihr Produktsortiment und Preise.</p>
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500 italic mb-2">Kommende Funktionen:</p>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>• Produkte hinzufügen und bearbeiten</li>
          <li>• Preise und Verfügbarkeit verwalten</li>
          <li>• Produktkategorien organisieren</li>
          <li>• Bilder und Beschreibungen pflegen</li>
        </ul>
      </div>
    </div>
  </div>

  {/* NEW: Berichte einsehen */}
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <div className="bg-purple-50 p-4 border-b border-purple-100">
      <div className="flex items-center">
        <BarChart3 className="w-6 h-6 text-purple-600 mr-2" />
        <h2 className="text-lg font-semibold text-secondary">Berichte einsehen</h2>
      </div>
    </div>
    <div className="p-6">
      <p className="text-gray-600 mb-4">Analysieren Sie Ihre Verkaufsperformance.</p>
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500 italic mb-2">Kommende Funktionen:</p>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>• Tägliche Verkaufsübersichten</li>
          <li>• Produktperformance-Analysen</li>
          <li>• Umsatztrends und Statistiken</li>
          <li>• Exportierbare Reports</li>
        </ul>
      </div>
    </div>
  </div>

  {/* Existing Kalender card */}
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <div className="bg-green-50 p-4 border-b border-green-100">
      <div className="flex items-center">
        <Calendar className="w-6 h-6 text-green-600 mr-2" />
        <h2 className="text-lg font-semibold text-secondary">Termine & Events</h2>
      </div>
    </div>
    <div className="p-6">
      {/* existing content */}
    </div>
  </div>

  {/* NEW: Ausgangsrechnungen (Endkunde) */}
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <div className="bg-orange-50 p-4 border-b border-orange-100">
      <div className="flex items-center">
        <FileText className="w-6 h-6 text-orange-600 mr-2" />
        <h2 className="text-lg font-semibold text-secondary">Ausgangsrechnungen</h2>
        <span className="ml-2 text-sm text-gray-500">(Endkunde)</span>
      </div>
    </div>
    <div className="p-6">
      <p className="text-gray-600 mb-4">Rechnungen an Ihre Kunden verwalten.</p>
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500 italic mb-2">Kommende Funktionen:</p>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>• Kundenrechnungen erstellen</li>
          <li>• Rechnungsverlauf einsehen</li>
          <li>• Zahlungsstatus verfolgen</li>
          <li>• PDF-Export und Versand</li>
        </ul>
      </div>
    </div>
  </div>

  {/* NEW: Eingangsrechnungen (Housnkuh) */}
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <div className="bg-indigo-50 p-4 border-b border-indigo-100">
      <div className="flex items-center">
        <Receipt className="w-6 h-6 text-indigo-600 mr-2" />
        <h2 className="text-lg font-semibold text-secondary">Eingangsrechnungen</h2>
        <span className="ml-2 text-sm text-gray-500">(Housnkuh)</span>
      </div>
    </div>
    <div className="p-6">
      <p className="text-gray-600 mb-4">Rechnungen von housnkuh einsehen.</p>
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500 italic mb-2">Kommende Funktionen:</p>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>• Monatsabrechnungen einsehen</li>
          <li>• Provisionsübersichten</li>
          <li>• Mietkosten-Aufstellungen</li>
          <li>• Zahlungshistorie</li>
        </ul>
      </div>
    </div>
  </div>

  {/* Existing Zahlungen card - keep as is but adjust if needed */}
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <div className="bg-violet-50 p-4 border-b border-violet-100">
      <div className="flex items-center">
        <CreditCard className="w-6 h-6 text-violet-600 mr-2" />
        <h2 className="text-lg font-semibold text-secondary">Zahlungen & Abrechnungen</h2>
      </div>
    </div>
    <div className="p-6">
      {/* existing content */}
    </div>
  </div>

  {/* Existing Profil card */}
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <div className="bg-rose-50 p-4 border-b border-rose-100">
      <div className="flex items-center">
        <User className="w-6 h-6 text-rose-600 mr-2" />
        <h2 className="text-lg font-semibold text-secondary">Mein Profil</h2>
      </div>
    </div>
    <div className="p-6">
      {/* existing content */}
    </div>
  </div>
</div>
```

### Color Scheme for New Cards
- **Produkte verwalten**: Emerald (green-focused)
- **Berichte einsehen**: Purple  
- **Ausgangsrechnungen**: Orange
- **Eingangsrechnungen**: Indigo

### Responsive Considerations
- **Mobile (sm)**: 1 column
- **Tablet (md)**: 2 columns  
- **Desktop (lg+)**: 3 columns
- Ensure cards maintain consistent height and spacing

## Testing Requirements

### Visual Testing
- [ ] All 4 new cards display with correct icons and colors
- [ ] Grid layout works on mobile, tablet, and desktop
- [ ] Cards have consistent styling with existing cards
- [ ] Icons are properly sized and aligned

### Content Testing  
- [ ] Each card has appropriate title and description
- [ ] Future functionality lists are helpful and accurate
- [ ] German text is correct and professional
- [ ] Card content fits well within card bounds

### Responsive Testing
- [ ] Test on mobile devices (iPhone, Android)
- [ ] Test on tablets (iPad, Android tablets)
- [ ] Test on desktop screens (various sizes)
- [ ] Verify grid layout adjusts properly
- [ ] Check card spacing and alignment

### Integration Testing
- [ ] New cards integrate well with existing dashboard
- [ ] Navigation to/from dashboard works correctly
- [ ] Cards don't interfere with existing functionality
- [ ] Dashboard loading performance remains good

## Dependencies
- Existing `VendorDashboardPage` component structure
- Lucide React icons library
- Current Tailwind CSS configuration
- Existing dashboard grid system

## Definition of Done
- [ ] All 4 management placeholder cards implemented
- [ ] Cards use appropriate icons and color schemes
- [ ] Responsive layout works across all screen sizes
- [ ] Content is clear and professionally written
- [ ] Cards integrate seamlessly with existing dashboard
- [ ] Code reviewed and approved
- [ ] Visual design approved
- [ ] Manual testing completed on multiple devices
- [ ] No performance regression

## Future Considerations
- These placeholders will be replaced with functional components in future sprints
- Consider adding "Coming Soon" badges or dates if timeline is known
- Plan for hover states and interactive elements in future implementations
- Keep placeholder structure simple to facilitate future replacement

## Notes
- Focus on consistent visual design with existing cards
- Ensure placeholder content sets appropriate expectations
- Maintain professional German language throughout
- Consider card order and logical grouping of related functionality