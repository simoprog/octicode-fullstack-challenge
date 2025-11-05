# Voice Recording Lifecycle: Record → Stop → Save

## Simple Step-by-Step Flow

---

## 1. Doctor Taps "Record"

### What Happens:
1. **Check patient consent** from local cache
   - If missing/expired → Block recording, show "Consent required" message
2. **Show disclaimer popup:**
   - "AI will generate a summary that requires your review"
   - Doctor taps "I Understand"
3. **Start recording:**
   - Generate unique `recordingId`
   - Encrypt audio in real-time (AES-256)
   - Save encrypted chunks to local device storage
   - Show timer and waveform on screen
4. **Save metadata to local database:**
   ```json
   {
     "recordingId": "abc-123",
     "status": "RECORDING",
     "patientId": "patient-456",
     "doctorId": "doctor-789",
     "startTime": "2025-11-05T10:30:00Z"
   }
   ```

### Local File Encryption:
- Audio encrypted on device before saving
- Key stored in device secure keychain
- File: `/encrypted/recording_abc-123.m4a`

---

## 2. Doctor Taps "Stop"

### What Happens:
1. **Stop audio capture**
2. **Calculate final metadata:**
   - Duration: 15 minutes 23 seconds
   - File size: 12.3 MB
   - Audio quality score: HIGH
3. **Update local database:**
   ```json
   {
     "status": "RECORDED",
     "endTime": "2025-11-05T10:45:00Z",
     "duration": "00:15:23",
     "fileSizeMB": 12.3
   }
   ```
4. **Show confirmation screen:** "Recording complete. Tap 'Save' to process."

---

## 3. Doctor Taps "Save"

### What Happens Next Depends on Network:

---

## Path A: Good Network (WiFi/4G/5G)

### Step 3A.1: Prepare Upload
1. **Show disclaimer again:**
   - "AI-generated summary requires your review before use"
   - Doctor confirms
2. **Compress audio file** (reduce size by 30%)
3. **Split into 2MB chunks** for resumable upload

### Step 3A.2: Upload to Cloud
1. **Upload each chunk with retry:**
   - Upload chunk 1 → Success
   - Upload chunk 2 → Network error → Retry → Success
   - Upload chunk 3 → 429 Rate Limited → Wait 5 seconds → Retry → Success
   - Continue until complete
2. **Show progress bar:** 0% → 25% → 50% → 75% → 100%
3. **On success:**
   - Update status: `UPLOADED`
   - Cloud returns signed URL: `gs://bucket/recording_abc-123.m4a`

**Upload Retry Rules:**
- Network timeout → Retry 3 times (2s, 4s, 8s delays)
- Rate limited (429) → Wait + retry
- Server error (500) → Retry 3 times
- Failed after all retries → Move to offline queue

### Step 3A.3: Trigger Backend Processing
Backend receives upload notification:
1. **Validate file** (checksum, size, format)
2. **Save to PostgreSQL:**
   ```sql
   INSERT INTO recordings (id, patient_id, doctor_id, status, audio_url)
   VALUES ('abc-123', 'patient-456', 'doctor-789', 'UPLOADED', 'gs://...');
   ```
3. **Send to processing queue:** "New recording ready for AI"

---

## Path B: Poor Network (3G/Unstable)

### What's Different:
1. **More aggressive compression** (reduce size by 60%)
2. **Smaller chunks** (512KB instead of 2MB)
3. **More retry attempts** (5 instead of 3)
4. **Show message:** "Poor connection. Upload may take longer."
5. If upload stalls >2 minutes → Pause and show options:
   - "Retry Now"
   - "Continue in Background"
   - "Cancel"

---

## Path C: Offline (No Network)

### Step 3C.1: Save to Local Queue
1. **Detect offline status**
2. **Add to upload queue:**
   ```json
   {
     "queueId": "queue-001",
     "recordingId": "abc-123",
     "status": "QUEUED",
     "priority": "HIGH",
     "retryCount": 0
   }
   ```
3. **Show notification:**
   ```
   ⚠️ Offline Mode
   Recording saved locally. Will upload automatically when online.
   ```

### Step 3C.2: Background Auto-Upload
1. **App checks network every 30 seconds**
2. **When online detected:**
   - Start uploading queued recordings (highest priority first)
   - Show notification: "Uploading 1 of 3 recordings..."
3. **Continue using app normally** (upload happens in background)

**Queue Rules:**
- Max 10 recordings in offline queue
- Recordings expire after 7 days → Delete with warning
- Clinical recordings have higher priority than personal notes

---

## 4. Backend AI Processing (Automatic)

### Step 4.1: Speech-to-Text (STT)
**When:** After successful upload

1. **Download encrypted audio** from cloud storage
2. **Decrypt using KMS key**
3. **Send to STT API** (Google Speech-to-Text):
   ```
   Audio → "Patient presents with persistent cough for two weeks..."
   Confidence: 94%
   ```
4. **Save to PostgreSQL:**
   ```sql
   INSERT INTO transcriptions (id, recording_id, raw_text, confidence)
   VALUES ('trans-123', 'abc-123', 'Patient presents with...', 0.94);
   ```
5. **Update recording status:** `TRANSCRIBED`

**STT Retry Logic:**
- Rate limited (429) → Wait 5s, 10s, 20s → Retry
- Server error (500) → Retry 3 times
- Audio quality too poor → Flag for manual transcription
- Max retries failed → Move to dead-letter queue, alert admin

### Step 4.2: AI Summarization
**When:** After transcription complete

1. **Get transcript from database**
2. **Send to AI model** (GPT-4 Medical):
   ```
   Input: Full transcript
   Output: Structured clinical summary
   ```
3. **AI generates:**
   ```json
   {
     "chiefComplaint": "Persistent cough for 2 weeks",
     "assessment": "Likely bronchitis",
     "plan": "Prescribe antibiotic, follow-up in 1 week",
     "confidenceScore": 0.89
   }
   ```
4. **Attach disclaimers automatically:**
   - "AI-generated - requires physician validation"
   - "Verify all medications before prescribing"
5. **Save to PostgreSQL:**
   ```sql
   INSERT INTO summarization_outputs 
   (id, transcription_id, summary, confidence_score, status)
   VALUES ('summ-123', 'trans-123', 'Chief complaint...', 0.89, 'PENDING_REVIEW');
   ```
6. **Update recording status:** `PENDING_REVIEW`

**AI Retry Logic:**
- Rate limited → Wait 10s, 30s, 60s → Retry
- Server error → Retry 5 times
- Low confidence (<0.70) → Flag for mandatory peer review
- Context too long → Summarize in chunks

### Step 4.3: Notify Doctor
1. **Send push notification:**
   ```
   📋 Summary Ready for Review
   Patient: John Doe
   [Review Now]
   ```
2. **Update Firestore** (real-time sync to mobile/web):
   ```javascript
   firestore.collection('doctors').doc('doctor-789').update({
     pendingReviews: ['abc-123']
   });
   ```

---

## 5. Sync to Web Dashboard

### Step 5.1: PostgreSQL → Firestore Sync
**How it works:**

1. **PostgreSQL trigger fires** when summary created
2. **Publishes message** to Cloud Pub/Sub: "New summary available"
3. **Cloud Function receives message:**
   - Fetches summary from PostgreSQL
   - Writes denormalized copy to Firestore:
     ```javascript
     firestore.collection('summaries').doc('summ-123').set({
       id: 'summ-123',
       patientName: 'John Doe',  // denormalized
       doctorName: 'Dr. Smith',  // denormalized
       summary: 'Chief complaint...',
       status: 'PENDING_REVIEW',
       confidenceScore: 0.89,
       disclaimers: [...]
     });
     ```

### Step 5.2: Web Dashboard Real-Time Update
**Dashboard listens to Firestore:**
```javascript
// Real-time listener
firestore.collection('summaries')
  .where('doctorId', '==', 'doctor-789')
  .where('status', '==', 'PENDING_REVIEW')
  .onSnapshot((snapshot) => {
    // Auto-update UI when new summary appears
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        addToPendingList(change.doc.data());
      }
    });
  });
```

**Result:** Dashboard shows new summary within 1-2 seconds, no refresh needed

---

## 6. Failed AI Calls - Retry Strategy

### When STT Fails:
| Error | What We Do | User Sees |
|-------|-----------|----------|
| Network timeout | Retry 3 times (5s, 10s, 20s) | "Processing..." |
| Rate limited (429) | Wait + retry (up to 5 times) | "Server busy, retrying..." |
| Audio quality poor | Stop, flag for manual | "⚠️ Audio quality insufficient" |
| Max retries exceeded | Move to admin queue | "Processing delayed - support notified" |

### When Summarization Fails:
| Error | What We Do | User Sees |
|-------|-----------|----------|
| Network timeout | Retry 5 times | "Generating summary..." |
| Low confidence (<0.60) | Complete but flag for peer review | "⚠️ Low confidence - peer review required" |
| Hallucination detected | Block summary, alert admin | "AI output flagged - manual review needed" |
| Max retries exceeded | Offer manual summary option | "Automatic summary unavailable. Create manually?" |

---

## 7. How Disclaimers Are Attached

### Timing:
- **Before recording starts:** User acknowledges disclaimer popup
- **Before upload:** User confirms disclaimer again
- **After AI summary:** Disclaimers automatically attached to summary data

### Example Disclaimer Data:
```json
{
  "summaryId": "summ-123",
  "disclaimers": [
    {
      "type": "AI_GENERATED",
      "text": "This summary is AI-generated and requires physician validation",
      "acknowledgedBy": "doctor-789",
      "acknowledgedAt": "2025-11-05T10:46:00Z"
    },
    {
      "type": "CLINICAL_RESPONSIBILITY",
      "text": "You are responsible for verifying all medical information",
      "acknowledgedBy": "doctor-789",
      "acknowledgedAt": "2025-11-05T10:46:00Z"
    }
  ]
}
```

### Where Shown:
- **Mobile app:** Banner at top of summary screen
- **Web dashboard:** Warning icon + tooltip on summary card
- **EHR export:** Included in exported notes as header text

---

## Summary: Complete Flow

```
1. Tap Record
   ↓
2. Recording (encrypted locally)
   ↓
3. Tap Stop (save metadata)
   ↓
4. Tap Save (show disclaimer)
   ↓
5. Upload to cloud
   ├─ Good network: Direct upload
   ├─ Poor network: Aggressive retry
   └─ Offline: Queue for later
   ↓
6. Backend: STT (speech-to-text)
   ├─ Success → Continue
   └─ Failed → Retry 3x → Manual queue
   ↓
7. Backend: AI Summarization
   ├─ Success → Continue
   └─ Failed → Retry 5x → Manual option
   ↓
8. Attach disclaimers automatically
   ↓
9. Sync to Firestore
   ↓
10. Push notification to doctor
    ↓
11. Real-time update on web dashboard
    ↓
12. Doctor reviews summary
```

---

## Key Points

### Encryption:
- **Audio encrypted on device** before saving (AES-256)
- **Encrypted during upload** (TLS 1.3)
- **Encrypted at rest** in cloud storage

### Offline Mode:
- **Full recording capability** without internet
- **Auto-upload when online** (background service)
- **Max 10 queued recordings** (prevent storage issues)

### When STT Triggered:
- **Immediately after upload completes**
- **Automatic** (no manual trigger needed)
- **Processed in order** (FIFO queue)

### Retry Strategy:
- **Upload:** 3 retries, exponential backoff
- **STT:** 3 retries, then manual queue
- **Summarization:** 5 retries, then manual option
- **All failures logged** for admin review

### Sync Strategy:
- **PostgreSQL = source of truth**
- **Firestore = real-time cache** for mobile/web
- **Cloud Functions** sync data between them
- **Web dashboard gets updates within 1-2 seconds**