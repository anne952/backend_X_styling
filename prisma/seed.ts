import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  await prisma.users.upsert({
    where: { email: 'admin@example.com' },
    update: { password, role: 'admin', nom: 'Admin' },
    create: { nom: 'Admin', email: 'admin@example.com', password, role: 'admin' }
  });

  // Ajout de couleurs d'exemple
  await prisma.couleur.createMany({
    data: [
      { nom: 'Rouge', hex: '#FF0000' },
      { nom: 'Bleu', hex: '#0000FF' },
      { nom: 'Vert', hex: '#00FF00' },
      { nom: 'Jaune', hex: '#FFFF00' },
      { nom: 'Noir', hex: '#000000' },
      { nom: 'Blanc', hex: '#FFFFFF' }
    ],
    skipDuplicates: true
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
