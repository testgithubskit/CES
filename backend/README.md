# CES - Cost Estimation System Backend

A manufacturing cost estimation application built with Python, FastAPI, PostgreSQL, and MinIO.

## Purpose

CES maintains manufacturing master data, defines Products and their complete BOM structure, defines Assemblies and unlimited nested Sub-assemblies, defines Parts and their Part Types, defines manufacturing Operations for Parts, configures Work Centers and Machines, calculates Machine Hour Rate (MHR) using MHR Particulars and Machine-specific MHR values, maintains technical documents such as PDF/STL/STEP files using MinIO object storage, maintains Customers, and creates Cost Estimations by selecting a Customer, Product, and Quantity.

## Architecture

### Technology Stack
- **Python 3.10+**
- **FastAPI** - Web framework
- **SQLAlchemy 2.x** - ORM with typed declarative models
- **PostgreSQL** - Database
- **Alembic** - Database migrations
- **Pydantic v2** - Data validation
- **JWT Authentication** - Token-based auth
- **bcrypt** - Password hashing
- **MinIO** - Object storage for documents
- **Uvicorn** - ASGI server

### Project Structure
```
backend/
├── app/
│   ├── api/
│   │   └── routes/          # API routers
│   ├── core/                # Configuration, security, RBAC
│   ├── database/            # Database session, base classes
│   ├── models/              # SQLAlchemy models (15 tables)
│   ├── schemas/             # Pydantic schemas
│   ├── services/            # Business logic (MHR, costing)
│   ├── storage/             # MinIO service
│   └── main.py              # FastAPI application
├── alembic/                  # Database migrations
├── .env.example             # Environment template
├── requirements.txt          # Python dependencies
└── README.md                # This file
```

## Database Models (15 Tables)

1. **User** - Authentication and audit fields
2. **WorkCenter** - Manufacturing work centers
3. **Machine** - Machines with MHR tracking
4. **MHRParticular** - MHR calculation particulars
5. **MachineMHRValue** - Machine-specific MHR values
6. **Customer** - Customer master data
7. **PartType** - Part type classifications
8. **Product** - Top-level BOM entity
9. **Assembly** - Nested assemblies with parent_assembly_id
10. **Part** - Parts (direct or under assembly)
11. **Document** - MinIO-stored documents
12. **Operation** - Manufacturing operations
13. **CostEstimation** - Cost estimations
14. **EstimationAdditionalCost** - Additional costs
15. **EstimationOperationCost** - Historical operation cost snapshots

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user (admin only)
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/auth/me` - Get current user info

### Master Data (Admin only for CRUD, both roles for read)
- **Customers**: `/api/v1/customers`
- **Work Centers**: `/api/v1/work-centers`
- **Machines**: `/api/v1/machines`
- **Part Types**: `/api/v1/part-types`
- **MHR Particulars**: `/api/v1/mhr-particulars`

### Product BOM
- **Products**: `/api/v1/products`
  - `GET /{product_id}/hierarchy` - Complete recursive BOM with operations
- **Assemblies**: `/api/v1/assemblies`
  - Recursive hierarchy support with circular reference prevention
- **Parts**: `/api/v1/parts`
  - Can be direct under Product or under Assembly
- **Operations**: `/api/v1/operations`
  - Linked to Parts, Work Centers, and Machines

### Machine MHR
- `/api/v1/machines/{machine_id}/mhr`
  - `GET /` - Get MHR configuration
  - `PUT /values` - Update input values and recalculate
  - `POST /particulars/{id}/toggle` - Toggle particular applicability
  - `PUT /recommended-mhr` - Update recommended MHR

### Documents (MinIO)
- `/api/v1/documents`
  - `POST /upload` - Upload PDF/STL/STEP files
  - `GET /{id}/download` - Download file
  - `GET /{id}/url` - Get presigned URL
  - `DELETE /{id}` - Delete file and MinIO object

### Cost Estimation
- `/api/v1/cost-estimation`
  - `POST /calculate` - Calculate cost without saving
  - `POST /save` - Calculate and save to database
  - `GET /` - List all estimations
  - `GET /{id}` - Get estimation details
  - `GET /{id}/detail` - Get full cost breakdown
  - `DELETE /{id}` - Delete estimation (admin only)
- `/api/v1/cost-estimation/download`
  - `POST /download` - Generate Excel cost sheet

## Cost Calculation Methodology

Based on CMF implementation:

1. **Operation Cost**: `(setup_time + cycle_time * quantity) * MHR`
2. **Part Cost**: Sum of all operation costs for the part
3. **Assembly Cost**: Sum of direct parts + sub-assembly costs (recursive)
4. **Product Cost**: Sum of direct parts + assembly costs
5. **Final Cost**: Product manufacturing cost + additional costs

### MHR Calculation
- Load applicable MHR particulars in sequence order
- Resolve input values
- Evaluate formulas in sequence (each formula can reference previous values)
- Calculate final MHR
- Update machine.mhr and machine.recommended_mhr

### Historical Cost Snapshots
- EstimationOperationCost stores MHR rate snapshot at calculation time
- Historical estimations never change when Machine MHR is updated later

## Role-Based Access Control (RBAC)

- **Admin**: Can manage all master/configuration data (CRUD)
- **User**: Can read master data and perform cost estimations
- Both roles can access costing features

## Setup Instructions

### 1. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# - DATABASE_URL
# - SECRET_KEY
# - MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Database Setup
```bash
# Run Alembic migrations
alembic upgrade head
```

### 4. Start Server
```bash
python -m uvicorn app.main:app --reload
```

### 5. Access API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/api/v1/health

## Features

- ✅ JWT authentication with secure password hashing
- ✅ RBAC with admin and user roles
- ✅ Complete CRUD for all master data
- ✅ Recursive BOM hierarchy with circular reference prevention
- ✅ MHR calculation with safe formula evaluation
- ✅ Document upload/download with MinIO integration
- ✅ Detailed cost calculation with breakdown
- ✅ Excel cost sheet download
- ✅ Historical cost snapshots (MHR preserved at calculation time)
- ✅ No Order concept - pure cost estimation system

## Notes

- All foreign-key relationships validated before writes
- Transaction management with proper rollback on errors
- N+1 query prevention using SQLAlchemy eager loading
- Decimal precision for all financial calculations
- Timezone-aware DateTime fields
- CORS configured for all origins (update for production)

## Seed Data

A development seed script can be created to initialize:
- Admin user
- Sample WorkCenters, Machines, MHRParticulars
- Sample PartTypes, Customers, Products
- Sample Assemblies, Parts, Operations

Seed credentials should be loaded from environment variables, never hardcoded.
