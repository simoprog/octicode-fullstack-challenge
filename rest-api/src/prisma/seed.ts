import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.summary.deleteMany();
  await prisma.voiceNote.deleteMany();
  await prisma.patient.deleteMany();
  const patient1 = await prisma.patient.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-15',
      email: 'john.doe@example.com',
      phone: '+1234567890',
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '1985-05-20',
      email: 'jane.smith@example.com',
      phone: '+0987654321',
    },
  });

  // Create sample voice notes
  const voiceNote1 = await prisma.voiceNote.create({
    data: {
      patientId: patient1.id,
      doctorId: '123e4567-e89b-12d3-a456-426614174000',
      duration: 180,
      recordedAt: new Date('2025-01-10T10:30:00Z'),
      status: 'summarized',
      fileSize: 2048,
      format: 'wav',
      location: 'storage/2025/01/recording1.wav',
    },
  });

  const voiceNote2 = await prisma.voiceNote.create({
    data: {
      patientId: patient2.id,
      doctorId: '123e4567-e89b-12d3-a456-426614174000',
      duration: 240,
      recordedAt: new Date('2025-01-11T14:15:00Z'),
      status: 'transcribed',
      fileSize: 3072,
      format: 'mp3',
      location: 'storage/2025/01/recording2.mp3',
    },
  });

  // Create sample summaries
  await prisma.summary.create({
    data: {
      voiceNoteId: voiceNote1.id,
      content:
        'Patient reports recurring headaches and fatigue over the past week. No fever or other symptoms. Prescribed rest, hydration, and over-the-counter pain relief.',
      keyPoints: JSON.stringify(['Headache', 'Fatigue', 'No fever']),
      recommendations: JSON.stringify([
        'Rest',
        'Hydration',
        'OTC pain relief',
        'Follow-up in 1 week',
      ]),
      generatedAt: new Date('2025-01-10T10:35:00Z'),
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`Created ${2} patients, ${2} voice notes, and ${1} summary`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
