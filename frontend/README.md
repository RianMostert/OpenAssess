# Frontend - WHK6

Next.js + React frontend for the WHK6 application providing a modern, accessible web interface for course management, assessment marking, and student feedback workflows.

## Architecture

The frontend follows Next.js 15 App Router architecture with clear separation of concerns:

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/              # Authentication pages (login, register)
│   │   ├── dashboard/         # Role-based dashboards
│   │   │   ├── lecturer/      # Lecturer interface
│   │   │   └── student/       # Student interface
│   │   ├── components/        # Page-specific components
│   │   ├── layout.tsx         # Root layout with providers
│   │   └── page.tsx          # Landing page
│   │
│   ├── components/            # Reusable UI components
│   │   └── ui/               # shadcn/ui components (Button, Dialog, etc.)
│   │
│   ├── services/              # API service layer
│   │   ├── courseService.ts   # Course CRUD operations
│   │   ├── assessmentService.ts  # Assessment management
│   │   ├── markingService.ts     # Marking interface operations
│   │   ├── queryService.ts       # Mark query system
│   │   ├── studentService.ts     # Student operations
│   │   ├── questionService.ts    # Question management
│   │   ├── fileService.ts        # File upload/download
│   │   └── exportService.ts      # PDF export
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.ts        # Authentication state
│   │   ├── useApi.ts         # API fetching with error handling
│   │   └── use-mobile.tsx    # Responsive breakpoint detection
│   │
│   ├── lib/                   # Utilities and helpers
│   │   ├── fetchWithAuth.ts  # Authenticated fetch wrapper
│   │   ├── coordinateUtils.ts # PDF annotation coordinate conversion
│   │   ├── utils.ts          # General utilities (cn, etc.)
│   │   └── constants/        # Application constants
│   │
│   └── types/                 # TypeScript type definitions
│
├── tests/                     # Test suites
│   ├── unit/                 # Component and utility tests (Vitest)
│   ├── e2e/                  # End-to-end tests (Playwright)
│   ├── accessibility/        # WCAG 2.1 AA tests (pa11y)
│   └── setup/                # Test configuration
│
├── public/                    # Static assets
└── package.json              # Dependencies and scripts
```

## Design Principles

### 1. Service Layer Pattern

All API interactions are centralized in service modules:

```typescript
// Services handle API communication
import { courseService } from '@/services';

const courses = await courseService.getAllCourses();
```

**Benefits**:
- Consistent error handling
- Reusable API logic
- Easy to mock for testing
- Single source of truth for endpoints

### 2. Custom Hooks for State

React hooks encapsulate complex state logic:

```typescript
// useAuth hook manages authentication state
const { user, isAuthenticated, login, logout } = useAuth();

// useApi hook handles data fetching with loading/error states
const { data, loading, error, refetch } = useApi(fetchFunction);
```

### 3. Component Composition

UI built with shadcn/ui components for consistency:

```typescript
import { Button, Dialog, Card } from '@/components/ui';

// Composable, accessible, themeable components
<Dialog>
  <Card>
    <Button variant="outline">Action</Button>
  </Card>
</Dialog>
```

### 4. Type Safety

Full TypeScript coverage with strict mode:

```typescript
// Type definitions ensure correctness
interface Assessment {
  id: string;
  title: string;
  course_id: string;
  published: boolean;
}
```

## Quick Start

### Using Docker Compose (Recommended)

From the project root:

```bash
docker-compose up
```

Frontend available at `http://localhost:3000`

### Manual Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.local.example .env.local

# Start development server
pnpm run dev
```

Application available at `http://localhost:3000`

## Environment Variables

Create a `.env.local` file:

```bash
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Environment
NODE_ENV=development
```

## Key Features

### Authentication
- JWT-based authentication
- Role-based access control (Administrator, Staff, Student)
- Persistent sessions with localStorage
- Protected routes with middleware

### PDF Annotation System
- Canvas-based annotation interface using Konva
- Multiple tools: Pencil, eraser, fine-eraser, text, sticky notes
- Percentage-based coordinates for device independence
- Real-time annotation saving to backend
- PDF.js for document rendering

### Responsive Design
- Mobile-first approach
- Tailwind CSS utility classes
- Responsive breakpoints with custom hooks
- Touch-optimized annotation interface

### Accessibility
- WCAG 2.1 AA compliance target
- Keyboard navigation support
- Screen reader compatible
- ARIA labels and landmarks
- Automated accessibility testing with pa11y

## Available Scripts

### Development
```bash
pnpm run dev              # Start development server
pnpm run dev:local        # Start on localhost only
pnpm run build            # Build for production
pnpm run start            # Start production server
pnpm run lint             # Run ESLint
```

### Testing
```bash
pnpm run test             # Run unit tests
pnpm run test:watch       # Run tests in watch mode
pnpm run test:e2e         # Run E2E tests
pnpm run test:e2e:ui      # Run E2E tests with UI
pnpm run test:e2e:debug   # Debug E2E tests
pnpm run test:a11y        # Run accessibility tests
```

## Testing

### Unit Tests (Vitest)
```bash
pnpm run test
```

Tests located in `tests/unit/`:
- Component rendering
- Hook behavior
- Utility functions
- Service layer logic

### End-to-End Tests (Playwright)
```bash
pnpm run test:e2e
```

Tests located in `tests/e2e/`:
- User authentication flows
- Course management
- Assessment creation
- Marking workflows
- PDF annotation

### Accessibility Tests (pa11y)
```bash
pnpm run test:a11y
```

Tests validate:
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Form labels

See [A11Y.md](./A11Y.md) for accessibility testing details.

## Project Structure

### App Router Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Landing page | Public homepage |
| `/auth/login` | Login page | User authentication |
| `/auth/register` | Register page | New user signup |
| `/dashboard` | Dashboard router | Role-based dashboard redirect |
| `/dashboard/lecturer/*` | Lecturer interface | Course and assessment management |
| `/dashboard/student/*` | Student interface | View results, submit queries |

### Services

| Service | Purpose |
|---------|---------|
| `courseService` | Course CRUD, enrollment, statistics |
| `assessmentService` | Assessment management, publishing |
| `markingService` | Marking interface, save marks |
| `queryService` | Mark query submission and management |
| `questionService` | Question CRUD operations |
| `studentService` | Student results, submissions |
| `fileService` | File upload/download |
| `exportService` | PDF export with annotations |

### Key Components

**Authentication**:
- `LoginForm` - Email/password authentication
- `RegisterForm` - User registration with validation

**Lecturer Interface**:
- `CourseList` - Display and manage courses
- `AssessmentList` - View course assessments
- `MarkingInterface` - PDF annotation and marking
- `QueryManagement` - Triage mark queries

**Student Interface**:
- `ResultsView` - View assessment results
- `QuerySubmission` - Submit mark queries
- `AnnotatedPDFViewer` - View marked submissions

**Shared**:
- `PDFViewer` - PDF.js document viewer
- `AnnotationCanvas` - Konva-based annotation layer
- `DataTable` - Sortable, filterable tables
- `FileUpload` - Drag-and-drop file uploads

## PDF Annotation System

The annotation system is a key technical feature:

### Architecture

```
PDFViewer (PDF.js)
    └── AnnotationCanvas (Konva)
        ├── Drawing Layer (pencil, eraser)
        ├── Text Layer (text boxes)
        └── Note Layer (sticky notes)
```

### Coordinate System

Annotations use percentage-based coordinates:

```typescript
// Frontend stores coordinates as percentages
const annotation = {
  x: 50.5,  // 50.5% from left
  y: 30.2,  // 30.2% from top
  tool: 'pencil',
  points: [10.1, 20.3, 15.2, 25.8]  // All percentages
};

// Backend converts to absolute PDF coordinates
// See backend/app/services/pdf_annotation_service.py
```

### Annotation Tools

- **Pencil**: Freehand drawing with configurable color and width
- **Eraser**: Remove entire strokes (immediate)
- **Fine Eraser**: Partial stroke removal (geometric computation on export)
- **Text**: Add text boxes with custom content
- **Sticky Notes**: Add yellow sticky notes for comments

### Data Flow

```
1. User draws → Konva captures strokes
2. Coordinates converted to percentages
3. JSON saved to backend per page
4. Export: Backend reconstructs geometry
5. PDF generated with burned-in annotations
```

See backend `EXPORT_SYSTEM.md` for export algorithm details.

## State Management

### Authentication State
```typescript
// useAuth hook provides global auth state
const { user, isAuthenticated, login, logout } = useAuth();

// Stored in localStorage, synced across tabs
// JWT token included in all API requests
```

### API Data Fetching
```typescript
// useApi hook handles loading/error states
const { data, loading, error, refetch } = useApi(
  () => courseService.getCourse(id)
);

if (loading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
return <CourseView course={data} />;
```

### Form State
```typescript
// react-hook-form for complex forms
const { register, handleSubmit, errors } = useForm();

<input {...register('email', { required: true })} />
```

## Styling

### Tailwind CSS
Utility-first CSS framework:

```typescript
<div className="flex items-center gap-4 p-6 rounded-lg bg-white shadow-md">
  <Button className="w-full">Submit</Button>
</div>
```

### shadcn/ui Components
Pre-built accessible components:

```typescript
import { Button, Card, Dialog } from '@/components/ui';

// Consistent, themeable, accessible
<Card>
  <Dialog>
    <Button variant="destructive">Delete</Button>
  </Dialog>
</Card>
```

### Custom Utilities
```typescript
import { cn } from '@/lib/utils';

// Merge Tailwind classes
className={cn('base-class', condition && 'conditional-class')}
```

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **React**: 19.0 (Server Components, Suspense)
- **TypeScript**: 5.x (Strict mode)
- **Styling**: Tailwind CSS 3.4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **PDF Rendering**: PDF.js 4.8
- **Canvas**: Konva 9.3 + React Konva
- **Forms**: React Hook Form 7.x
- **HTTP Client**: Fetch API with custom wrapper
- **Testing**: Vitest, Playwright, pa11y
- **Package Manager**: pnpm 10.x

## Performance Optimizations

### Code Splitting
- Next.js automatic route-based code splitting
- Dynamic imports for heavy components
- Lazy loading for PDF viewer

### Caching
- API response caching in useApi hook
- Service Worker for offline support (future)
- Static asset optimization

### Bundle Size
- Tree-shaking unused code
- Optimized production builds
- Lazy-loaded dependencies

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Development Guidelines

### Adding a New Page

1. Create route in `src/app/` directory
2. Define page component
3. Add to navigation if needed
4. Write E2E test in `tests/e2e/`

### Adding a New Service

1. Create service file in `src/services/`
2. Export from `src/services/index.ts`
3. Add TypeScript types
4. Write unit tests

### Adding a New Component

1. Create component in `src/components/`
2. Use TypeScript for props
3. Add accessibility attributes
4. Test with screen reader

## Accessibility Compliance

The application targets WCAG 2.1 AA compliance:

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation
- Color contrast ratios
- Focus indicators
- Screen reader support

Run accessibility tests:
```bash
pnpm run test:a11y
```

See [A11Y.md](./A11Y.md) for current status and issues.

## Security

### Authentication
- JWT tokens with expiration
- Secure token storage (httpOnly cookies recommended for production)
- Protected routes with middleware

### XSS Prevention
- React auto-escapes content
- Content Security Policy headers
- Sanitized user inputs

### CSRF Protection
- SameSite cookie attribute
- CSRF tokens for sensitive operations

## Deployment

### Production Build
```bash
pnpm run build
pnpm run start
```

### Docker Deployment
```bash
docker build -t whk6-frontend .
docker run -p 3000:3000 whk6-frontend
```

### Environment Variables
Set production environment variables:
- `NEXT_PUBLIC_API_URL`: Production API endpoint
- `NODE_ENV=production`

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Module Not Found
```bash
# Clear cache and reinstall
rm -rf .next node_modules
pnpm install
```

### PDF Rendering Issues
```bash
# Ensure PDF.js worker is properly configured
# Check public/pdf.worker.min.js exists
```

## Additional Documentation

- [A11Y.md](./A11Y.md) - Accessibility testing guide
- [Project Wiki](https://git.cs.sun.ac.za/Computer-Science/rw771/2025/24138096-WHK6-doc/-/wikis/Frontend) - Comprehensive frontend documentation
