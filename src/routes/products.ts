import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';

const router = Router();

// Public list products
router.get('/', async (_req, res) => {
  const produits = await prisma.produit.findMany({ include: { categorie: true } });
  res.json(produits);
});

// Create product (admin or vendeur)
router.post('/', authenticate, requireRoles('admin', 'vendeur'), async (req, res) => {
  const { nom, description, prix, image, taille } = req.body as { nom: string; description: string; prix: string; image?: string | null; taille: 'L'|'S'|'M'|'XL'|'XXL'|'XXXL'; };
  const categorieId = Number((req.body as any).categorieId);
  if (!categorieId || Number.isNaN(categorieId)) {
    return res.status(400).json({ message: 'categorieId invalide' });
  }
  const cat = await prisma.categorie.findUnique({ where: { id: categorieId } });
  if (!cat) {
    return res.status(400).json({ message: `Categorie introuvable: ${categorieId}` });
  }

  // Déterminer le vendeurId
  let vendeurId: number | undefined;
  if (req.user!.role === 'vendeur') {
    vendeurId = req.user!.id;
  } else {
    const bodyVendeurId = (req.body as any).vendeurId;
    if (bodyVendeurId !== undefined && bodyVendeurId !== null) {
      const vid = Number(bodyVendeurId);
      if (Number.isNaN(vid)) {
        return res.status(400).json({ message: 'vendeurId invalide' });
      }
      const vendeur = await prisma.users.findUnique({ where: { id: vid } });
      if (!vendeur || vendeur.role !== 'vendeur') {
        return res.status(400).json({ message: `vendeurId ${vid} invalide (utilisateur introuvable ou rôle ≠ vendeur)` });
      }
      vendeurId = vid;
    }
  }

  const created = await prisma.produit.create({ data: { nom, description, prix, image: image ?? null, taille, categorieId, vendeurId } });
  res.status(201).json(created);
});

// Delete product (admin or vendeur)
router.delete('/:id', authenticate, requireRoles('admin', 'vendeur'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.produit.delete({ where: { id } });
  res.status(204).send();
});

export default router;

