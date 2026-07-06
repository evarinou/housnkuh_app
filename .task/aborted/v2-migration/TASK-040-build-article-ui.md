# Task: TASK-040-build-article-ui
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] Vendor dashboard UI for article management implemented
- [ ] Create, edit, delete article functionality working
- [ ] Stock level display and management integrated
- [ ] Category selection with proper validation
- [ ] Image upload and management working
- [ ] All components properly tested

## Test Plan
### Unit Tests
- [ ] Test ArticleForm component rendering and validation
- [ ] Test ArticleList component with filtering and sorting
- [ ] Test StockManager component updates
- [ ] Test image upload functionality
- [ ] Co-located test files: ArticleForm.test.tsx, ArticleList.test.tsx

### Integration Tests  
- [ ] Test complete article creation workflow
- [ ] Test article editing saves correctly
- [ ] Test stock level updates reflect in UI

### Manual Testing
- [ ] Verify article creation form works end-to-end
- [ ] Test image upload and preview functionality
- [ ] Verify stock management updates correctly

## Implementation Details
Build comprehensive vendor dashboard for article management:

### Main Dashboard Component
```typescript
// client/src/components/vendor/ArticleDashboard.tsx
export const ArticleDashboard = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="article-dashboard">
      <DashboardHeader 
        onCreateNew={() => setShowCreateForm(true)}
        articlesCount={articles.length}
      />
      
      <div className="dashboard-content">
        <ArticleList 
          articles={articles}
          onEditArticle={setSelectedArticle}
          onDeleteArticle={handleDelete}
        />
        
        {showCreateForm && (
          <ArticleForm 
            onSubmit={handleCreateArticle}
            onCancel={() => setShowCreateForm(false)}
          />
        )}
        
        {selectedArticle && (
          <ArticleEditModal 
            article={selectedArticle}
            onSave={handleUpdateArticle}
            onClose={() => setSelectedArticle(null)}
          />
        )}
      </div>
    </div>
  );
};
```

### Article Form Component
```typescript
// client/src/components/vendor/ArticleForm.tsx
interface ArticleFormData {
  name: string;
  description: string;
  category: string;
  price: number;
  stockQuantity: number;
  minimumStock: number;
  images: File[];
  sku?: string;
}

export const ArticleForm = ({ article, onSubmit, onCancel }: ArticleFormProps) => {
  const { register, handleSubmit, formState: { errors } } = useForm<ArticleFormData>();
  const [images, setImages] = useState<File[]>([]);
  const [categories] = useCategories();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="article-form">
      <div className="form-section">
        <h3>Artikel Details</h3>
        
        <Input
          label="Produktname"
          {...register("name", { required: "Name ist erforderlich" })}
          error={errors.name?.message}
        />
        
        <Textarea
          label="Beschreibung"
          {...register("description")}
          rows={4}
        />
        
        <Select
          label="Kategorie"
          {...register("category", { required: "Kategorie ist erforderlich" })}
          options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
          error={errors.category?.message}
        />
      </div>

      <div className="form-section">
        <h3>Preise & Lager</h3>
        
        <Input
          label="Preis (€)"
          type="number"
          step="0.01"
          {...register("price", { 
            required: "Preis ist erforderlich",
            min: { value: 0.01, message: "Preis muss größer als 0 sein" }
          })}
          error={errors.price?.message}
        />
        
        <Input
          label="Lagerbestand"
          type="number"
          {...register("stockQuantity", { 
            required: "Lagerbestand ist erforderlich",
            min: { value: 0, message: "Lagerbestand kann nicht negativ sein" }
          })}
          error={errors.stockQuantity?.message}
        />
        
        <Input
          label="Mindestbestand"
          type="number"
          {...register("minimumStock", { 
            min: { value: 0, message: "Mindestbestand kann nicht negativ sein" }
          })}
          error={errors.minimumStock?.message}
        />
      </div>

      <div className="form-section">
        <h3>Bilder</h3>
        <ImageUpload
          images={images}
          onImagesChange={setImages}
          maxImages={5}
        />
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit" variant="primary">
          {article ? 'Artikel aktualisieren' : 'Artikel erstellen'}
        </Button>
      </div>
    </form>
  );
};
```

### Article List Component
```typescript
// client/src/components/vendor/ArticleList.tsx
export const ArticleList = ({ articles, onEditArticle, onDeleteArticle }: ArticleListProps) => {
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
  const [filterCategory, setFilterCategory] = useState<string>('');
  
  const filteredAndSorted = useMemo(() => {
    let filtered = articles;
    
    if (filterCategory) {
      filtered = articles.filter(article => article.category === filterCategory);
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'stock':
          return a.stockQuantity - b.stockQuantity;
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [articles, sortBy, filterCategory]);

  return (
    <div className="article-list">
      <div className="list-controls">
        <Select
          label="Sortieren nach"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          options={[
            { value: 'name', label: 'Name' },
            { value: 'price', label: 'Preis' },
            { value: 'stock', label: 'Lagerbestand' }
          ]}
        />
        
        <Select
          label="Kategorie"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          options={[
            { value: '', label: 'Alle Kategorien' },
            ...categories.map(cat => ({ value: cat.id, label: cat.name }))
          ]}
        />
      </div>
      
      <div className="articles-grid">
        {filteredAndSorted.map(article => (
          <ArticleCard
            key={article.id}
            article={article}
            onEdit={() => onEditArticle(article)}
            onDelete={() => onDeleteArticle(article.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

### Stock Management Component
```typescript
// client/src/components/vendor/StockManager.tsx
export const StockManager = ({ articleId, currentStock, onStockUpdate }: StockManagerProps) => {
  const [adjustment, setAdjustment] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  
  const handleStockAdjustment = async () => {
    try {
      await adjustStock(articleId, adjustment, reason);
      onStockUpdate(currentStock + adjustment);
      setAdjustment(0);
      setReason('');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Lagerbestands');
    }
  };

  return (
    <div className="stock-manager">
      <div className="current-stock">
        <h4>Aktueller Bestand: {currentStock}</h4>
      </div>
      
      <div className="stock-adjustment">
        <Input
          label="Bestandsänderung"
          type="number"
          value={adjustment}
          onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
          placeholder="z.B. +10 oder -5"
        />
        
        <Input
          label="Grund"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="z.B. Neue Lieferung, Inventur, etc."
        />
        
        <Button onClick={handleStockAdjustment} disabled={!adjustment || !reason}>
          Bestand aktualisieren
        </Button>
      </div>
    </div>
  );
};
```

## Dependencies
- TASK-039-create-article-service (API service must exist)
- TASK-041-implement-article-crud (API endpoints needed)

## Definition of Done
- [ ] Article dashboard UI fully implemented
- [ ] Article form with validation working
- [ ] Article list with filtering and sorting
- [ ] Stock management functionality integrated
- [ ] Image upload and management working
- [ ] All components properly tested
- [ ] Responsive design working on mobile
- [ ] TypeScript compilation successful
- [ ] Code review completed (if applicable)