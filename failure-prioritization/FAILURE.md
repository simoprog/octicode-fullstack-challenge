# Production Failure Rank – “Which fire do we put out first?”

## Ranking

1. **D) Personal recordings linked to patients**  
   *Impact*: GDPR breach, medical-liability, regulator fine.  
   *Root*: logic error in `patient_id` FK assignment.  
   *Fix*: hot-patch + data-clean-up script within 24 h.

2. **A) 1 % uploads fail and never retry**  
   *Impact*: silent data loss; doctors think consult is saved when it is not.  
   *Root*: missing exponential-backoff retry queue.  
   *Fix*: deploy SQS / pg-queue + worker immediately after #1.

3. **C) Web dashboard shows duplicate recordings (3 % users)**  
   *Impact*: UX annoyance, support tickets, mild distrust.  
   *Root*: idempotency bug in sync API (same `recording.id` inserted twice).  
   *Fix*: add unique constraint + upsert logic; can wait a few days.

4. **B) Summaries miss an occasional symptom**  
   *Impact*: clinical quality issue, but doctor is required to review text before signing.  
   *Root*: LLM hallucination / prompt tuning.  
   *Fix*: improve prompt, add retrieval-augmented generation; lowest urgency.

## One-sentence report to the CEO
“We have a privacy breach (personal notes leaking into patient charts) and silent data loss on uploads—both need hot-fixes today; duplicates and AI quality can follow next week.”