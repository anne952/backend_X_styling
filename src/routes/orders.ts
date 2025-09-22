import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';
import { buildMessage, sendExpoNotificationsAsync } from '../services/notifications';

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

  // Notifier les vendeurs concernés (produits avec vendeurId et token Expo)
  const produitIds = items.map(i => i.produitId);
  const produits = await prisma.produit.findMany({
    where: { id: { in: produitIds }, vendeurId: { not: null } },
    select: { vendeurId: true }
  });
  const vendeurIds = Array.from(new Set(produits.map(p => p.vendeurId!).filter(Boolean)));
  if (vendeurIds.length > 0) {
    const vendeurs = await prisma.users.findMany({
      where: { id: { in: vendeurIds }, expoPushToken: { not: null } },
      select: { expoPushToken: true }
    });
    const messages = vendeurs
      .map(v => v.expoPushToken!)
      .filter(Boolean)
      .map(t => buildMessage(t, 'Nouvelle commande', `Vous avez une nouvelle commande #${order.id}.`));
    if (messages.length) {
      await sendExpoNotificationsAsync(messages);
    }
  }

  res.status(201).json(order);
});

// Validate order (admin or vendeur)
router.post('/:id/validate', authenticate, requireRoles('admin', 'vendeur'), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.commande.update({ where: { id }, data: { status: 'en_cours_pour_la_livraison' } , include: { users: true }});
  // Notify client
  const token = updated.users.expoPushToken;
  if (token) {
    await sendExpoNotificationsAsync([buildMessage(token, 'Commande validée', `Votre commande #${updated.id} est validée.`)]);
  }
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

// Cancel order (admin or vendeur)
router.post('/:id/cancel', authenticate, requireRoles('admin', 'vendeur'), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.commande.update({ where: { id }, data: { status: 'annulee' }, include: { users: true } });
  const token = updated.users.expoPushToken;
  if (token) {
    await sendExpoNotificationsAsync([buildMessage(token, 'Commande annulée', `Votre commande #${updated.id} a été annulée.`)]);
  }
  res.json(updated);
});

// Deliver order (admin or vendeur)
router.post('/:id/deliver', authenticate, requireRoles('admin', 'vendeur'), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.commande.update({ where: { id }, data: { status: 'livree' }, include: { users: true } });
  const token = updated.users.expoPushToken;
  if (token) {
    await sendExpoNotificationsAsync([buildMessage(token, 'Commande livrée', `Votre commande #${updated.id} a été livrée.`)]);
  }
  res.json(updated);
});

export default router;

