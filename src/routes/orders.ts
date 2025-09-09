import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';

const router = Router();

// Create order (client)
router.post('/', authenticate, requireRoles('client'), async (req, res) => {
  const { items, localisation } = req.body as { items: { produitId: number; quantite: number; prixUnitaire: string }[]; localisation?: string };
  
  // Validation des données requises
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Le champ items est requis et doit être un tableau non vide' });
  }
  
  const montantNum = items.reduce((sum, i) => sum + Number(i.prixUnitaire) * i.quantite, 0);
  const order = await prisma.commande.create({
    data: {
      usersId: req.user!.id,
      localisation,
      montant: montantNum.toString(),
      ligneCommande: {
        create: items.map(i => ({ produitId: i.produitId, quantite: i.quantite, prixUnitaire: i.prixUnitaire, total: (Number(i.prixUnitaire) * i.quantite).toString() }))
      }
    },
    include: { ligneCommande: true }
  });
  res.status(201).json(order);
});

// Validate order (admin or vendeur)
router.post('/:id/validate', authenticate, requireRoles('admin', 'vendeur'), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.commande.update({ where: { id }, data: { status: 'en_cours_pour_la_livraison' } });
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

