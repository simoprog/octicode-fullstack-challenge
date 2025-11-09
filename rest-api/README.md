# Notes & Summaries REST API (SQLite + Prisma)

A clean REST API for managing patients, voice note metadata, and AI-generated summaries. Built with Node.js, TypeScript, Express, Prisma ORM, and SQLite database.

## Features

✅ **Required**
- TypeScript + Express
- Zod validation
- SQLite database with Prisma ORM
- Comprehensive tests (Vitest)
- Clean, modular architecture

✅ **Bonus Features**
- ESLint + Prettier configuration
- Pino logger with request IDs
- Health check endpoints (with DB connection check)
- Rate limiting per API key
- Full CRUD operations
- Cascade deletion support
- Database migrations
- Seed data script

## Database Schema

```prisma
model Patient {
  id          String      @id @default(uuid())
  firstName   String
  lastName    String
  dateOfBirth String
  email       String?
  phone       String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  voiceNotes  VoiceNote[]
}

model VoiceNote {
  id         String    @id @default(uuid())
  patientId  String
  doctorId   String
  duration   Int
  recordedAt DateTime
  status     String
  fileSize   Int?
  format     String?
  location   String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  patient    Patient   @relation(fields: [patientId], references: [id], onDelete: Cascade)
  summaries  Summary[]
}

model Summary {
  id              String   @id @default(uuid())
  voiceNoteId     String
  content         String
  keyPoints       String?  // JSON array
  recommendations String?  // JSON array
  generatedAt     DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  voiceNote       VoiceNote @relation(fields: [voiceNoteId], references: [id], onDelete: Cascade)
}
```
## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Database Setup

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

### 3. Development

```bash
npm run dev
```

Server runs on `http://localhost:3000`

### 4. Database Management

```bash
# Open Prisma Studio (GUI for database)
npm run db:studio

# Push schema changes without migration
npm run db:push
```

### 5. Build & Production

```bash
npm run build
npm start
```

### 6. Testing

```bash
npm test
```

### 7. Linting & Formatting

```bash
npm run lint
npm run format
```

## Prisma Commands

- `npx prisma migrate dev` - Create and apply migrations
- `npx prisma migrate reset` - Reset database and reapply migrations
- `npx prisma studio` - Open Prisma Studio GUI
- `npx prisma db push` - Push schema changes without migrations
- `npx prisma generate` - Generate Prisma Client

## API Documentation

### Authentication

All API routes (except health endpoints) require an API key in the header:

```
x-api-key: demo-key-12345
```

Valid API keys:
- `demo-key-12345`
- `test-key-67890`

### Rate Limiting

- 100 requests per 15-minute window per API key
- Returns 429 with retry-after header when exceeded

### Health Endpoints

#### GET /health
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 123.45
}
```

#### GET /health/ready
Includes database connection check
```json
{
  "status": "ready",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "database": "connected"
}
```

### Patients

#### GET /api/patients
Get all patients (ordered by creation date)

Response includes related voice notes count

#### GET /api/patients/:id
Get a single patient with all voice notes

#### POST /api/patients
Create a patient
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "email": "john@example.com",
  "phone": "+1234567890"
}
```

#### PATCH /api/patients/:id
Update a patient (partial updates allowed)

#### DELETE /api/patients/:id
Delete a patient (cascades to voice notes and summaries)

### Voice Notes

#### GET /api/voice-notes
Get all voice notes (optional: `?patientId=uuid`)

Includes patient details

#### GET /api/voice-notes/:id
Get a single voice note with patient and summaries

#### POST /api/voice-notes
Create a voice note
```json
{
  "patientId": "uuid",
  "doctorId": "uuid",
  "duration": 180,
  "recordedAt": "2025-01-15T10:30:00.000Z",
  "status": "pending",
  "fileSize": 2048,
  "format": "wav",
  "location": "storage/path"
}
```

Status values: `pending`, `transcribed`, `summarized`, `failed`

#### PATCH /api/voice-notes/:id
Update a voice note

### Summaries

#### GET /api/summaries
Get all summaries (optional: `?voiceNoteId=uuid`)

Includes voice note and patient details

#### GET /api/summaries/:id
Get a single summary with nested relations

#### POST /api/summaries
Create a summary
```json
{
  "voiceNoteId": "uuid",
  "content": "Patient consultation summary...",
  "keyPoints": ["Symptom 1", "Symptom 2"],
  "recommendations": ["Treatment 1", "Follow-up"],
  "generatedAt": "2025-01-15T10:30:00.000Z"
}
```

## Architecture

### Project Structure

```
prisma/
├── schema.prisma         # Database schema
├── seed.ts              # Sample data seeding
└── dev.db               # SQLite database (generated)

src/
├── index.ts             # App entry point
├── types.ts             # Zod schemas & TypeScript types
├── db.ts                # Prisma Client singleton
├── middleware/
│   ├── auth.ts          # API key authentication
│   ├── rateLimiter.ts   # Rate limiting
│   └── logger.ts        # Pino logger setup
├── routes/
│   ├── patients.ts      # Patient endpoints
│   ├── voiceNotes.ts    # Voice note endpoints
│   ├── summaries.ts     # Summary endpoints
│   └── health.ts        # Health check endpoints
└── __tests__/
    └── api.test.ts      # Integration tests
```

### Prisma Benefits

✅ **Type Safety** - Auto-generated TypeScript types  
✅ **Relations** - Easy to query nested data  
✅ **Migrations** - Version-controlled schema changes  
✅ **Query Builder** - Intuitive, type-safe queries  
✅ **Cascade Deletes** - Automatic cleanup of related records  
✅ **Prisma Studio** - Built-in database GUI  

### Key Features

- **Referential Integrity** - Foreign key constraints
- **Cascade Deletion** - Delete patient → deletes voice notes → deletes summaries
- **Eager Loading** - Includes related data in responses
- **Indexes** - Optimized queries on foreign keys
- **Auto Timestamps** - Automatic createdAt/updatedAt
- **UUID Primary Keys** - Globally unique identifiers
- **JSON Support** - Arrays stored as JSON strings

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message",
  "details": { /* Zod validation errors */ }
}
```

Status codes:
- `200` - Success
- `201` - Created
- `204` - No Content (delete)
- `400` - Validation Error
- `401` - Unauthorized
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `503` - Service Unavailable (DB down)

## Testing

Comprehensive test suite covering:
- Health endpoints with DB connection
- Authentication
- CRUD operations for all entities
- Validation logic
- Referential integrity
- Query filtering
- Nested relations
- Cascade deletion

Run tests with coverage:
```bash
npm test -- --coverage
```