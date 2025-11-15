# Resource API

## Prerequisites

Choose one of the following options:

**Option A: Docker (Recommended)**
- Docker and Docker Compose

**Option B: Local Setup**
- Node.js (v18 or higher)
- PostgreSQL (v15 or higher)
- npm or yarn

## Installation

### Option 1: Using Docker Compose (Recommended)

Start everything with one command:
```bash
docker-compose up --build
```

This will:
- Start PostgreSQL in a container
- Start the API with hot reloading
- Auto-create database tables

To stop:
```bash
docker-compose down
```

To stop and remove data:
```bash
docker-compose down -v
```

### Option 2: Running Locally (Without Docker)

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment** (optional):
Create a `.env` file:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=resource_db
```

3. **Start PostgreSQL** (make sure it's running)

4. **Start the development server:**
```bash
npm run dev
```

The server will start at `http://localhost:3000`

## API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs.json

## API Endpoints

### Health Check
- `GET /health` - Check server status

### Resources CRUD

#### Search & List Resources (with pagination)
```http
GET /api/v1/resources?name=test&status=true&page=1&limit=10
```

**Query Parameters:**
- `name` (optional) - Filter by resource name (partial match)
- `status` (optional) - Filter by status (true/false)
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "My Resource",
      "description": "Description",
      "status": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

#### Get Resource by ID
```http
GET /api/v1/resources/:id
```

#### Create Resource
```http
POST /api/v1/resources
Content-Type: application/json

{
  "name": "My Resource",
  "description": "This is a test resource",
  "status": true
}
```

**Validation Rules:**
- `name` - Required, max 255 characters
- `description` - Optional, string
- `status` - Optional, boolean (default: true)

#### Update Resource
```http
PUT /api/v1/resources/:id
Content-Type: application/json

{
  "name": "Updated Resource",
  "description": "Updated description",
  "status": false
}
```

#### Delete Resource
```http
DELETE /api/v1/resources/:id
```

## API Usage Examples

### Using cURL

**Create a Resource:**
```bash
curl -X POST http://localhost:3000/api/v1/resources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Resource",
    "description": "This is a test resource",
    "status": true
  }'
```

**Search Resources:**
```bash
# Search all resources
curl http://localhost:3000/api/v1/resources

# Search by name
curl "http://localhost:3000/api/v1/resources?name=test"

# Filter by status
curl "http://localhost:3000/api/v1/resources?status=true"

# With pagination
curl "http://localhost:3000/api/v1/resources?page=2&limit=20"
```

**Get a Resource by ID:**
```bash
curl http://localhost:3000/api/v1/resources/1
```

**Update a Resource:**
```bash
curl -X PUT http://localhost:3000/api/v1/resources/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Resource",
    "description": "Updated description"
  }'
```

**Delete a Resource:**
```bash
curl -X DELETE http://localhost:3000/api/v1/resources/1
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Test Structure
- **Unit Tests**: `tests/unit/` - DTO validation, exceptions
- **Integration Tests**: `tests/integration/` - API endpoints with in-memory database

## Code Formatting

### Format All Files
```bash
npm run format
```

### Check Formatting
```bash
npm run format:check
```

Prettier is configured to format TypeScript, JavaScript, and JSON files automatically.

## Database Schema

### Resource Entity

```typescript
@Entity('resources')
export class Resource extends AbstractEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
```

### Abstract Entity (Base Class)

```typescript
export abstract class AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'boolean', default: true })
  status: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

**Note:** The API responses use `ResourceResponseDto` which excludes internal metadata fields (`created_at`, `updated_at`) for cleaner client responses.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 5432 |
| DB_USER | Database user | postgres |
| DB_PASSWORD | Database password | postgres |
| DB_NAME | Database name | resource_db |

**Note:** When using Docker, set `DB_HOST=postgres` to connect to the containerized database.

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reloading
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start compiled server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### TypeORM Commands

- `npm run migration:generate -- src/repository/migrations/MigrationName` - Generate a migration
- `npm run migration:run` - Run pending migrations
- `npm run migration:revert` - Revert the last migration
- `npm run schema:sync` - Sync schema with database
- `npm run schema:drop` - Drop all tables (destructive!)

## Docker Commands

```bash
# Start containers
docker-compose up

# Start with rebuild
docker-compose up --build

# Stop containers
docker-compose down

# Stop and remove all data
docker-compose down -v

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
docker-compose logs -f postgres
```

## Error Handling

The API uses a global exception handler that returns consistent error responses:

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "constraints": { "isNotEmpty": "Resource name is required" },
      "message": "Resource name is required"
    }
  ]
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### Bad Request Error (400)
```json
{
  "success": false,
  "message": "Invalid resource ID"
}
```

### Internal Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```
