# Database Selection Analysis: Firestore vs PostgreSQL

## Entity-by-Entity Recommendations

### 🟢 Recording - **PostgreSQL**
**Justification:**
- Requires strict ACID transactions for consent validation before recording starts
- Complex state transitions (RECORDING → UPLOADED → TRANSCRIBED → ARCHIVED → DELETED) benefit from transactional integrity
- Foreign key constraints ensure referential integrity with Patient and Doctor
- Retention policies require precise date-based queries and scheduled deletion jobs
- RGPD compliance demands reliable cascading deletes and audit trails

**PostgreSQL Advantages:**
- Strong consistency for consent checks
- Built-in support for scheduled jobs (pg_cron)
- Efficient date-range queries for retention enforcement

---

### 🟡 Transcription - **PostgreSQL (preferred) or Firestore**
**Justification:**
- **PostgreSQL preferred** for transactional consistency with Recording entity
- Transcription is tightly coupled to Recording lifecycle (1:1 relationship)
- PostgreSQL's JSONB handles flexible segment data while maintaining relational integrity
- Complex queries across transcriptions (search, analytics) benefit from SQL

**Firestore consideration:**
- Could work if transcriptions are treated as immutable documents post-generation
- Real-time sync to mobile apps is not critical here

**Recommendation: PostgreSQL** for consistency with Recording aggregate

---

### 🟢 SummarizationOutput - **PostgreSQL**
**Justification:**
- Critical approval workflow requires transactional state management
- Status transitions (PENDING_REVIEW → APPROVED/REJECTED → SYNCED) must be atomic
- Foreign key relationships with Transcription, Doctor (approver), and EHR sync records
- Complex queries for review queues, analytics, and reporting
- Audit requirements demand strong consistency

**PostgreSQL Advantages:**
- Row-level locking for concurrent review scenarios
- Transactional updates with audit trail insertion
- Efficient joins for dashboard queries (pending reviews by doctor/clinic)

---

### 🔵 Patient - **Firestore**
**Justification:**
- Patient data needs real-time sync to mobile apps for consent management
- Read-heavy workload (doctors frequently access patient info during consultations)
- Flexible schema accommodates evolving patient attributes without migrations
- ConsentRecords array fits naturally in document model
- Global distribution for multi-region clinics

**Firestore Advantages:**
- Offline support for mobile consultation apps
- Real-time listeners for consent status changes
- Subcollections for organizing patient history
- Automatic scaling for read-heavy access patterns

**Trade-off:** Consent validation queries require client-side filtering or denormalization

---

### 🔵 Doctor - **Firestore**
**Justification:**
- User profile data accessed frequently across the application
- Real-time presence/availability status for clinic dashboards
- Flexible schema for specialty-specific attributes
- Low write frequency (profile updates are rare)
- Natural fit for authentication integration (Firebase Auth)

**Firestore Advantages:**
- Seamless integration with Firebase Authentication
- Real-time updates for doctor availability/status
- Efficient reads for doctor lookups during recording creation
- Easy replication across regions for global access

---

### 🔵 PersonalNote - **Firestore**
**Justification:**
- Non-critical data (not part of patient medical record)
- Highly personalized, doctor-specific content
- Benefits from real-time sync for mobile note-taking
- Tag-based querying works well with Firestore's array-contains queries
- No complex relationships or transactional requirements

**Firestore Advantages:**
- Offline-first for mobile doctors taking notes on-the-go
- Real-time collaboration if multiple devices are used
- Simple tag-based search without complex joins
- Flexible content structure (notes can vary in format)

---

### 🟡 MedicalSource - **Firestore (preferred)**
**Justification:**
- Content delivery use case (serving PDFs to mobile apps)
- Tag-based search and filtering aligns with Firestore queries
- Low write frequency (guidelines updated quarterly/annually)
- Integration with Firebase Storage for PDF hosting
- No transactional requirements

**Firestore Advantages:**
- Efficient full-text search with Algolia/Typesense integration
- Tag-based and specialty-based queries
- Easy CDN integration for PDF delivery
- Version history via Firestore's timestamp tracking

**PostgreSQL consideration:** If complex relational queries across sources are needed

---

### 🟢 Recommendation - **PostgreSQL**
**Justification:**
- Tightly coupled to SummarizationOutput (part of same aggregate)
- Many-to-many relationships with MedicalSource require join tables
- Complex queries for recommendation analytics and pattern analysis
- Transactional integrity when generating recommendations batch

**PostgreSQL Advantages:**
- Efficient joins between Recommendation ↔ SummarizationOutput ↔ MedicalSource
- Support for computed fields (confidence thresholds, scoring)
- Better for machine learning analytics on recommendation effectiveness

---

### 🟢 AuditTrail - **PostgreSQL**
**Justification:**
- Immutable append-only log requires strong consistency
- Compliance mandates reliable, tamper-proof audit records
- Complex time-series queries for compliance reporting
- RGPD requires precise audit trail retention and export
- No eventual consistency acceptable for legal evidence

**PostgreSQL Advantages:**
- Write-once guarantees with constraints
- Efficient time-range queries with partitioning
- Reliable backup/archival for long-term retention (7+ years)
- Better for forensic analysis and complex audit queries

**Critical:** Never use Firestore for audit trails due to eventual consistency risks

---

### 🟢 DataRetentionPolicy - **PostgreSQL**
**Justification:**
- Low volume, configuration data
- Policies govern critical deletion logic (must be strongly consistent)
- Referenced by scheduled jobs for retention enforcement
- Changes require transactional updates with audit logging

**PostgreSQL Advantages:**
- Single source of truth for retention rules
- Easy integration with pg_cron for automated enforcement
- Transactional updates ensure policy changes are atomic

---

## Summary Table

| Entity | Database | Primary Reason |
|--------|----------|----------------|
| Recording | PostgreSQL | ACID transactions, retention enforcement |
| Transcription | PostgreSQL | Transactional integrity with Recording |
| SummarizationOutput | PostgreSQL | Approval workflow, strong consistency |
| Patient | Firestore | Real-time sync, mobile offline support |
| Doctor | Firestore | User profiles, Firebase Auth integration |
| PersonalNote | Firestore | Offline-first, real-time sync |
| MedicalSource | Firestore | Content delivery, tag-based search |
| Recommendation | PostgreSQL | Complex joins, analytics |
| AuditTrail | PostgreSQL | Compliance, immutability, legal evidence |
| DataRetentionPolicy | PostgreSQL | Configuration, scheduled jobs |

---

## Hybrid Architecture Recommendation

### PostgreSQL for:
- **Transactional workflows**: Recording → Transcription → Summarization → Approval
- **Compliance-critical data**: AuditTrail, DataRetentionPolicy
- **Complex analytics**: Recommendation patterns, usage reporting

### Firestore for:
- **User-facing data**: Patient profiles, Doctor profiles
- **Real-time features**: Consent status, doctor availability
- **Mobile-first content**: PersonalNotes, MedicalSources
- **Read-heavy workloads**: Patient lookups during consultations

### Integration Strategy:
1. **Write to PostgreSQL first** for transactional entities (Recording, SummarizationOutput)
2. **Denormalize to Firestore** for mobile app performance (Patient name, Doctor name)
3. **Use Cloud Functions** to sync critical changes bidirectionally
4. **Keep PostgreSQL as source of truth** for compliance and billing

---

## Key Trade-offs

### Choosing PostgreSQL means:
✅ Strong consistency and ACID guarantees  
✅ Complex SQL queries and joins  
✅ Mature tooling for backups and migrations  
❌ Requires connection pooling for mobile apps  
❌ More complex scaling for global distribution  

### Choosing Firestore means:
✅ Real-time sync and offline support  
✅ Automatic scaling and global distribution  
✅ Easy mobile integration  
❌ Eventual consistency challenges  
❌ Limited query capabilities (no joins)  
❌ Higher costs at scale for reads

---

## Implementation Notes

### For PostgreSQL entities:
- Use connection pooling (PgBouncer) for API server
- Implement read replicas for analytics queries
- Use partitioning for AuditTrail (by month/year)
- Enable point-in-time recovery for compliance

### For Firestore entities:
- Implement security rules for patient data access
- Use composite indexes for tag + specialty queries
- Denormalize doctor/patient names for display
- Set up Cloud Functions for cross-database sync
- Monitor read/write costs (Firestore charges per operation)

### Cross-Database Consistency:
- Use event-driven architecture (Cloud Pub/Sub) for sync
- Implement idempotent handlers for eventual consistency
- PostgreSQL triggers → Pub/Sub → Firestore Cloud Functions
- Accept eventual consistency for non-critical reads (e.g., doctor names)