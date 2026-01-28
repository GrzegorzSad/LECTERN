import { PrismaClient } from '@prisma/client/extension';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, 
    },
  },
});