# Code Style and Conventions for housnkuh

## TypeScript Configuration
- **Strict Mode**: Enabled for both client and server
- **Target**: ES5 (client), ES2018 (server)  
- **Module System**: ESNext (client), CommonJS (server)
- **JSX**: react-jsx for client components

## Coding Conventions

### Language & Comments
- Mixed German and English codebase
- German used for:
  - User-facing strings and messages
  - Domain-specific terms (Direktvermarkter, Mietfach, Vertrag)
  - Comments in business logic
- English used for:
  - Technical variable/function names
  - Framework-specific code
  - Type definitions

### File Structure
- Component files: PascalCase (e.g., `VendorRegistrationModal.tsx`)
- Utility files: camelCase (e.g., `emailService.ts`)
- Test files: Same name with `.test.ts` or `.test.tsx` suffix
- Models: PascalCase with Mongoose schemas

### Component Patterns
```typescript
// Functional components with TypeScript
interface ComponentProps {
  prop1: string;
  prop2?: number;
}

const MyComponent: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Component logic
  return <div>{/* JSX */}</div>;
};
```

### API Response Pattern
```typescript
// Consistent API response structure
{
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}
```

### Error Handling
- Try-catch blocks in async functions
- Consistent error responses with status codes
- German error messages for user-facing errors

### Mongoose Schema Pattern
```typescript
const SchemaName = new Schema({
  field: {
    type: String,
    required: true,
    // Validation functions
  }
}, { timestamps: true });
```

### Testing Patterns
- Jest with describe/it blocks
- Mock external dependencies
- Test both success and error cases
- Use React Testing Library for component tests
- Use Supertest for API endpoint tests

### Import Order
1. External libraries
2. Internal modules
3. Types/interfaces
4. Styles

### No Linting Configuration
Currently no ESLint configuration is set up, though it's referenced in package.json.