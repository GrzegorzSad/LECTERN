import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.source.createMany({
    data: [
      { name: 'local' },
      { name: 'onedrive' },
      { name: 'googledrive' },
    ],
    skipDuplicates: true,
  });

  console.log('Seeded sources');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());