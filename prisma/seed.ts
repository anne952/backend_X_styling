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

  // Ajout de catégories
  await prisma.categorie.createMany({
    data: [
      { type: 'Homme' },
      { type: 'Femme' },
      { type: 'Enfant' }
    ],
    skipDuplicates: true
  });

  // Création d'un vendeur exemple
  const vendeurPassword = await bcrypt.hash('vendeur123', 10);
  const vendeur = await prisma.users.upsert({
    where: { email: 'vendeur@example.com' },
    update: { password: vendeurPassword, role: 'vendeur', nom: 'Vendeur Exemple', telephone: '+1234567890' },
    create: { nom: 'Vendeur Exemple', email: 'vendeur@example.com', password: vendeurPassword, role: 'vendeur', telephone: '+1234567890', typeCouture: ['HOMME', 'FEMME'], specialite: ['PretAPorter'] }
  });

  // Création d'un produit exemple
  const categorie = await prisma.categorie.findFirst({ where: { type: 'Homme' } });
  const couleur = await prisma.couleur.findFirst({ where: { nom: 'Noir' } });
  if (categorie && couleur) {
    await prisma.produit.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nom: 'Chemise noire',
        description: 'Une belle chemise noire pour homme',
        prix: 25.00,
        taille: 'M',
        categorieId: categorie.id,
        vendeurId: vendeur.id,
        couleurs: { create: [{ couleurId: couleur.id }] },
        tailles: { create: [{ taille: 'M' }, { taille: 'L' }, { taille: 'XL' }] },
        productImages: { create: [{ url: 'https://example.com/image1.jpg' }] }
      }
    });
  }
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
