import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';

const router = Router();

// Create order (client)
router.post('/', authenticate, requireRoles('client'), async (req, res) => {
  const { items, localisation } = req.body as { items: { produitId: number; quantité: number; prixUnitaire: string }[]; localisation?: string };
  const montant = items.reduce((sum, i) => sum + Number(i.prixUnitaire) * i.quantité, 0);
  const order = await prisma.commande.create({
    data: {
      usersId: req.user!.id,
      localisation,
      montant,
      ligneCommande: {
        create: items.map(i => ({ produitId: i.produitId, quantité: i.quantité, prixUnitaire: i.prixUnitaire, total: (Number(i.prixUnitaire) * i.quantité).toString() }))
      }
    },
    include: { ligneCommande: true }
  });
  res.status(201).json(order);
});

// Validate order (admin or vendeur)
router.post('/:id/validate', authenticate, requireRoles('admin', 'vendeur'), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.commande.update({ where: { id }, data: { status: 'enStoke' } });
  res.json(updated);
});

// Get my orders (client)
router.get('/me', authenticate, requireRoles('client'), async (req, res) => {
  const orders = await prisma.commande.findMany({ where: { usersId: req.user!.id }, include: { ligneCommande: true } });
  res.json(orders);
});

// Admin: list all orders
router.get('/', authenticate, requireRoles('admin'), async (_req, res) => {
  const orders = await prisma.commande.findMany({ include: { ligneCommande: true, users: { select: { id: true, email: true } } } });
  res.json(orders);
});

export default router;

