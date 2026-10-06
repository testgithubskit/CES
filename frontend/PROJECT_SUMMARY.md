# CES Frontend - Project Summary

## Overview
Complete React + Vite + JavaScript frontend for Cost Estimation Software (CES) with professional industrial/manufacturing UI.

## Tech Stack

### Core Libraries
- **React 19.2.8** - UI library
- **Vite 8.3.0** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client for API calls

### UI Framework
- **Tailwind CSS v4** - Utility-first CSS with @theme
- **Radix UI** - Headless UI components
- **shadcn/ui style** - New York style with slate base
- **class-variance-authority** - Component variants
- **clsx** - Conditional class names
- **tailwind-merge** - Tailwind class merging
- **lucide-react** - Icon library
- **sonner** - Toast notifications

### Brand Color
- **Primary Brand Color**: HEX `#004883` (Blue)
- Theme variants for hover, active, focus, and dark mode states

## Project Structure

```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── DocumentViewer.jsx      # 2D document preview dialog
│   │   │   ├── ModelViewer3D.jsx       # 3D model viewer (OpenCascade ready)
│   │   │   └── ProtectedRoute.jsx     # Route protection wrapper
│   │   ├── layout/
│   │   │   ├── Header.jsx             # App header with user menu
│   │   │   ├── Sidebar.jsx            # Navigation sidebar
│   │   │   └── ThemeSwitcher.jsx      # Light/dark mode toggle
│   │   └── ui/                        # shadcn/ui components
│   │       ├── alert-dialog.jsx
│   │       ├── avatar.jsx
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── dialog.jsx
│   │       ├── dropdown-menu.jsx
│   │       ├── input.jsx
│   │       ├── label.jsx
│   │       ├── select.jsx
│   │       ├── separator.jsx
│   │       ├── switch.jsx
│   │       ├── table.jsx
│   │       ├── tabs.jsx
│   │       ├── toast.jsx
│   │       ├── toaster.jsx
│   │       ├── tooltip.jsx
│   │       └── use-toast.js
│   ├── hooks/
│   │   ├── use-auth.js                # Authentication context
│   │   └── use-theme.js               # Theme management
│   ├── layouts/
│   │   ├── AuthenticatedLayout.jsx    # Main app layout (sidebar + header)
│   │   └── PublicLayout.jsx           # Auth pages layout
│   ├── pages/
│   │   ├── SignIn.jsx                 # Login page
│   │   ├── SignUp.jsx                 # Registration page
│   │   ├── Dashboard.jsx              # Main dashboard
│   │   ├── Products.jsx               # Products list with CRUD
│   │   ├── ProductDetail.jsx          # Product BOM view
│   │   ├── PartDetail.jsx             # Part details, docs, process plan
│   │   ├── BOM.jsx                    # BOM quick access
│   │   ├── ProcessPlan.jsx            # Process plan quick access
│   │   ├── WorkCenters.jsx            # Work centers management
│   │   ├── Machines.jsx               # Machines management
│   │   ├── Customers.jsx              # Customers management
│   │   ├── MHRConfiguration.jsx       # MHR calculation/config
│   │   ├── CostEstimation.jsx         # Cost calculation
│   │   ├── CostBreakdown.jsx          # Detailed cost breakdown
│   │   └── NotFound.jsx               # 404 page
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.js              # Centralized Axios client
│   │   │   ├── auth.js                # Auth endpoints
│   │   │   ├── products.js            # Product endpoints
│   │   │   ├── bom.js                 # BOM hierarchy endpoints
│   │   │   ├── processPlan.js         # Process plan endpoints
│   │   │   ├── machines.js            # Machine endpoints
│   │   │   ├── workCenters.js         # Work center endpoints
│   │   │   ├── customers.js           # Customer endpoints
│   │   │   ├── mhr.js                 # MHR calculation endpoints
│   │   │   ├── costEstimation.js      # Cost estimation endpoints
│   │   │   └── documents.js           # Document endpoints
│   │   └── models.js                  # Frontend model structures
│   ├── utils/
│   │   └── download.js                # File download utilities
│   ├── styles/
│   │   └── globals.css                # Global styles with Tailwind theme
│   ├── lib/
│   │   └── utils.js                   # cn() utility function
│   ├── mock-data/
│   │   └── index.js                  # Isolated mock data (remove when backend ready)
│   ├── App.jsx                        # Main app with routing
│   └── main.jsx                       # Entry point
├── index.html                         # HTML entry (CES branded)
├── vite.config.js                     # Vite config with Tailwind
├── package.json                       # Dependencies
└── API_CONFIG.txt                     # .env configuration guide
```

## Routes

### Public Routes
- `/signin` - Sign In page
- `/signup` - Sign Up page

### Protected Routes (Authenticated)
- `/dashboard` - Main dashboard
- `/products` - Products list
- `/products/:id` - Product detail with BOM
- `/parts/:id` - Part detail with documents and process plan
- `/bom` - BOM quick access
- `/process-plan` - Process plan quick access
- `/configuration/work-centers` - Work centers management
- `/configuration/machines` - Machines management
- `/configuration/customers` - Customers management
- `/configuration/mhr` - MHR configuration
- `/cost-estimation` - Cost estimation
- `/cost-estimation/:productId/:calculationId` - Cost breakdown

### Special Routes
- `/` - Redirects to `/dashboard`
- `*` - 404 Not Found page

## API Configuration

### Environment Variable
Create a `.env` file in the frontend directory:
```
VITE_API_BASE_URL=http://localhost:8000
```

### Centralized API Client
- **Location**: `src/services/api/client.js`
- **Features**:
  - Automatic JWT token injection from localStorage
  - Response interceptor for 401 handling (auto-logout)
  - Base URL from environment variable
  - Default JSON headers

### API Service Modules
All API calls go through centralized service modules:
- `auth.js` - Login, register, logout, current user
- `products.js` - CRUD operations for products
- `bom.js` - Assembly, subassembly, part hierarchy management
- `processPlan.js` - Process plans and operations
- `machines.js` - Machine management
- `workCenters.js` - Work center management
- `customers.js` - Customer management
- `mhr.js` - MHR calculation and configuration
- `costEstimation.js` - Cost calculation and export
- `documents.js` - Document upload, download, preview

## Authentication Structure

### JWT Integration
- Token stored in `localStorage` as `token`
- Token automatically added to request headers via Axios interceptor
- 401 responses trigger automatic logout and redirect to `/signin`
- Protected routes use `ProtectedRoute` wrapper component

### Auth Context
- **Location**: `src/hooks/use-auth.js`
- **Provider**: `AuthProvider` wraps entire app
- **Available**: `user`, `loading`, `isAuthenticated`, `login`, `register`, `logout`, `checkAuth`

## BOM Structure

### Hierarchy
Product → Assembly → SubAssembly → Part

### BOM UI Features
- Expandable tree view with chevron controls
- Create/edit/delete at each level
- Click part to view part detail page
- Nested "Add" buttons for quick creation

## Process Plan Structure

### Features
- Operation sequence with sequence numbers
- Machine assignment per operation
- Setup time and cycle time tracking
- Reordering-ready UI (backend endpoint ready)
- Accessed from Part detail page

## 3D/OpenCascade Integration Point

### Current State
- **Component**: `src/components/common/ModelViewer3D.jsx`
- **Features**:
  - Viewer UI with controls (rotate, zoom, fit, reset)
  - Loading state
  - Error state with integration pending message
  - Supported formats: .stl, .step, .stp
  - Isolated for easy OpenCascade.js integration

### Integration Steps
1. Install OpenCascade.js
2. Replace placeholder with actual 3D rendering
3. Load files from backend document endpoints
4. Connect viewer controls to OpenCascade API

## Document/MinIO Integration Point

### Frontend Architecture
- Document service handles all document operations
- Upload: `documentsService.uploadDocument(partId, file, metadata)`
- Download: `documentsService.downloadDocument(documentId)` returns blob
- Preview: `documentsService.getDocumentPreviewUrl(documentId)` for 2D files
- Delete: `documentsService.deleteDocument(documentId)`

### 2D Document Viewer
- **Component**: `src/components/common/DocumentViewer.jsx`
- Currently shows placeholder preview
- Can be extended with PDF.js or similar library

### MinIO Integration
- Frontend does NOT directly manage MinIO buckets
- All MinIO operations handled by backend
- Frontend only consumes backend document endpoints

## Cost Estimation Flow

### Backend-Driven Calculation
1. User selects product
2. User enters quantity and additional costs
3. Frontend sends parameters to backend
4. Backend calculates using MHR values and formulas
5. Frontend displays results

### No Client-Side Calculation
- All formulas in backend
- Frontend only displays values
- MHR values retrieved from backend
- Cost breakdown from backend

### Export Features
- PDF export: `costEstimationService.exportToPDF()`
- Excel export: `costEstimationService.exportToExcel()`
- Download utility: `downloadFile(blob, filename)` in `src/utils/download.js`

## MHR Configuration

### Backend-Driven
- Parameters: labor cost, overhead rate, energy cost, maintenance cost, depreciation
- Calculation: Send parameters to backend, receive MHR value
- No formulas hardcoded in frontend
- Machine selection → parameter input → calculate → result flow

## Theme System

### Light/Dark Mode
- **Provider**: `src/hooks/use-theme.js`
- **Component**: `ThemeSwitcher.jsx` in header
- **Storage**: localStorage with key `theme`
- **System Preference**: Respects system preference by default
- **CSS**: Tailwind v4 with @theme for both modes

### Brand Color
- **Primary**: `#004883` (brand-500)
- **Variants**: brand-50 to brand-900 for different use cases
- **Consistent usage**: All primary actions use brand color

## Remaining Backend Integration Points

### 1. Authentication Endpoints
- POST `/api/auth/login` - Login with credentials
- POST `/api/auth/register` - Register new user
- POST `/api/auth/logout` - Logout
- GET `/api/auth/me` - Get current user

### 2. Product Endpoints
- GET `/api/products` - List products
- GET `/api/products/:id` - Get product details
- POST `/api/products` - Create product
- PUT `/api/products/:id` - Update product
- DELETE `/api/products/:id` - Delete product

### 3. BOM Endpoints
- GET `/api/products/:id/assemblies` - Get assemblies
- POST `/api/products/:id/assemblies` - Create assembly
- PUT `/api/assemblies/:id` - Update assembly
- DELETE `/api/assemblies/:id` - Delete assembly
- GET `/api/assemblies/:id/subassemblies` - Get subassemblies
- POST `/api/assemblies/:id/subassemblies` - Create subassembly
- PUT `/api/subassemblies/:id` - Update subassembly
- DELETE `/api/subassemblies/:id` - Delete subassembly
- GET `/api/subassemblies/:id/parts` - Get parts
- POST `/api/subassemblies/:id/parts` - Create part
- PUT `/api/parts/:id` - Update part
- DELETE `/api/parts/:id` - Delete part

### 4. Process Plan Endpoints
- GET `/api/parts/:id/process-plan` - Get process plan
- POST `/api/parts/:id/process-plan` - Create process plan
- PUT `/api/process-plans/:id` - Update process plan
- DELETE `/api/process-plans/:id` - Delete process plan
- GET `/api/process-plans/:id/operations` - Get operations
- POST `/api/process-plans/:id/operations` - Create operation
- PUT `/api/operations/:id` - Update operation
- DELETE `/api/operations/:id` - Delete operation
- PUT `/api/process-plans/:id/operations/reorder` - Reorder operations

### 5. Machine Endpoints
- GET `/api/machines` - List machines
- GET `/api/machines/:id` - Get machine details
- POST `/api/machines` - Create machine
- PUT `/api/machines/:id` - Update machine
- DELETE `/api/machines/:id` - Delete machine

### 6. Work Center Endpoints
- GET `/api/work-centers` - List work centers
- GET `/api/work-centers/:id` - Get work center details
- POST `/api/work-centers` - Create work center
- PUT `/api/work-centers/:id` - Update work center
- DELETE `/api/work-centers/:id` - Delete work center

### 7. Customer Endpoints
- GET `/api/customers` - List customers
- GET `/api/customers/:id` - Get customer details
- POST `/api/customers` - Create customer
- PUT `/api/customers/:id` - Update customer
- DELETE `/api/customers/:id` - Delete customer

### 8. MHR Endpoints
- GET `/api/machines/:id/mhr` - Get machine MHR
- POST `/api/machines/:id/mhr/calculate` - Calculate MHR
- GET `/api/machines/:id/mhr/config` - Get MHR config
- PUT `/api/machines/:id/mhr/config` - Update MHR config

### 9. Cost Estimation Endpoints
- POST `/api/products/:id/cost-calculation` - Calculate cost
- GET `/api/products/:id/cost-calculation/:calculationId` - Get breakdown
- GET `/api/products/:id/cost-calculation/:calculationId/export/pdf` - Export PDF
- GET `/api/products/:id/cost-calculation/:calculationId/export/excel` - Export Excel

### 10. Document Endpoints
- POST `/api/parts/:id/documents` - Upload document
- GET `/api/parts/:id/documents` - List documents
- GET `/api/documents/:id` - Get document details
- GET `/api/documents/:id/download` - Download document
- DELETE `/api/documents/:id` - Delete document
- GET `/api/documents/:id/preview` - Get preview URL

## Mock Data

### Location
`src/mock-data/index.js`

### Purpose
Isolated mock data for UI testing during frontend development.

### Removal
Delete entire `src/mock-data` folder when backend APIs are connected.

## Installation & Setup

### Install Dependencies
```bash
cd frontend
npm install
```

### Environment Configuration
Create `.env` file:
```
VITE_API_BASE_URL=http://localhost:8000
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Design System

### Typography
- Font: System UI (ui-sans-serif)
- Headings: Bold, tracking-tight
- Body: Regular with muted variants

### Spacing
- Cards: p-6
- Sections: space-y-6
- Tables: p-4 cells

### Components
- Buttons: brand-500 with hover states
- Cards: border, shadow-sm
- Tables: striped, hover effects
- Dialogs: max-w-lg default, max-w-2xl for complex forms

### Accessibility
- Radix UI components for keyboard navigation
- ARIA labels on interactive elements
- Focus states on all interactive elements
- Color contrast meets WCAG standards

## Notes

### No Order Entity
As requested, there is NO Order concept anywhere in the application. No pages, components, routes, variables, or API services related to orders.

### TypeScript Not Used
All files use JavaScript (.js, .jsx) as requested. No TypeScript conversion.

### Vite Starter Cleaned
All default Vite/React demo content removed:
- Default counter code removed
- Vite/React logos removed
- Default images/assets removed
- Demo CSS removed
- Demo components removed
- Default metadata replaced with CES branding

### Brand Consistency
- Brand color #004883 used consistently
- Light and dark mode variants available
- Professional industrial/manufacturing aesthetic
- Not a generic Vite/shadcn demo appearance
