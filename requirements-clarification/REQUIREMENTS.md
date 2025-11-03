# Clinical Voice Notes – Requirements Clarification

&gt; Rewritten key requirements in plain language, followed by 9 clarifying questions we would ask Product / Medical-compliance before we write a single line of code.

--------------------------------------------------
Rewritten Key Requirements (TL;DR)
--------------------------------------------------
1. Doctors can hit “Record” on a mobile app, speak, and upload the audio.  
2. Platform turns speech into text (STT), then runs an AI model to produce a concise medical summary.  
3. Summary can be copied into the clinic’s EHR; the original audio & text are kept for audit.  
4. Personal (non-patient) memos must be stored separately and never mixed with patient data.  
5. Everything must be RGPD (GDPR) compliant: consent, minimisation, encryption, retention, deletion.  
6. Web dashboard shows recordings, transcripts, summaries, and audit trails in real time.  
7. New release wants **review workflows** (doctor approves AI text before it lands in EHR), **data-governance** (rules per clinic), and **better AI guardrails** (no hallucinations, no prompt injection).

--------------------------------------------------
Clarifying Questions for Product & Compliance
--------------------------------------------------
1. **Voice Consent**  
   Must the app play an audible “This call is being recorded” prompt, or is a one-time checkbox on first login enough?

2. **Multi-clinic Access**  
   Can a doctor working in two independent clinics see both datasets inside the same mobile session, or must the data be logically isolated per clinic?

3. **Data-retention Edge Cases**  
   If a patient changes doctor, dies, or requests erasure, how long may we keep the encrypted audio? Is the AI-derived summary considered “derived personal data” and therefore also deletable?

4. **Review Workflow**  
   Is the AI summary blocked from EHR export until the doctor taps “Approve”, or is approval optional with a visual “unreviewed” badge?

5. **Audit Granularity**  
   Do we need to log every **play-back** of a recording (doctor re-listens), or only creation, edit, and export events?

6. **Disclaimers & Liability**  
   Must every summary be prefixed with a fixed disclaimer such as “AI-generated, verify before treatment”, and does the clinic allow editing that disclaimer?

7. **Offline Mode & Sync Conflicts**  
   If a doctor records 5 minutes while offline, then a different doctor deletes the patient file before sync, what wins? Is the offline recording rejected, orphaned, or merged?

8. **Role Matrix**  
   Besides “Doctor” and “Admin”, are there roles like “Transcription-reviewer”, “Compliance-officer”, or “AI-trainer” that need different CRUD permissions?

9. **Cross-border Processing**  
   Audio may be processed by STT or LLM services in the US. Do we need explicit SCC (Standard Contractual Clauses) or will EU-based processors be mandated?

