import { z } from 'zod';

export const PatientSchema = z.object({
  id: z.uuid(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.date(),
  email: z.email('Invalid email address').optional(),
  phone: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const VoiceNoteSchema = z.object({
  id: z.uuid(),
  patientId: z.uuid(),
  doctorId: z.uuid(),
  duration: z.number().positive('Duration must be positive'),
  recordedAt: z.date(),
  status: z.enum(['pending', 'transcribed', 'summarized', 'failed']),
  metadata: z
    .object({
      fileSize: z.number().optional(),
      format: z.string().optional(),
      location: z.string().optional(),
    })
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SummarySchema = z.object({
  id: z.uuid(),
  voiceNoteId: z.uuid(),
  content: z.string().min(10, 'Summary must be at least 10 characters'),
  keyPoints: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  generatedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Patient = z.infer<typeof PatientSchema>;
export type VoiceNote = z.infer<typeof VoiceNoteSchema>;
export type Summary = z.infer<typeof SummarySchema>;

export const CreatePatientSchema = PatientSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdatePatientSchema = CreatePatientSchema.partial();

export const CreateVoiceNoteSchema = VoiceNoteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateSummarySchema = SummarySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
