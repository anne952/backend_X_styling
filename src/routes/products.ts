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
  const { nom, description, prix, image, taille, categorieId } = req.body;
  const created = await prisma.produit.create({ data: { nom, description, prix, image, taille, categorieId } });
  res.status(201).json(created);
});

// Delete product (admin or vendeur)
router.delete('/:id', authenticate, requireRoles('admin', 'vendeur'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.produit.delete({ where: { id } });
  res.status(204).send();
});

export default router;

