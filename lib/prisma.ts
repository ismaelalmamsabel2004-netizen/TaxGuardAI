import { PrismaClient } from '@prisma/client';

// Prevenimos que Next.js abra múltiples conexiones a la base de datos 
// cada vez que guardas un archivo durante el desarrollo.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;