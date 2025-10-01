import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';
import { buildMessage, sendExpoNotificationsAsync } from '../services/notifications';

const router = Router();

// Create order (client ou vendeur)
router.post('/', authenticate, requireRoles('client', 'vendeur'), async (req, res) => {
  const { items, localisation, payement } = req.body as {
    items: { produitId: number; quantite: number; prixUnitaire: string }[];
    localisation?: string;
    payement?: { montant: string; moyenDePayement: 'Tmoney' | 'Flooz' };
  };

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Le champ items est requis et doit être un tableau non vide' });
  }
  if (!payement || !payement.montant || !payement.moyenDePayement) {
    return res.status(400).json({ message: 'Le paiement est requis pour valider la commande' });
  }

  const montantNum = items.reduce((sum: number, i: any) => sum + Number(i.prixUnitaire) * i.quantite, 0);
  const order = await prisma.commande.create({
    data: {
      usersId: req.user!.id,
      localisation,
      montant: montantNum.toString(),
      ligneCommande: {
        create: items.map((i: any) => ({
          produitId: i.produitId,
          quantite: i.quantite,
          prixUnitaire: i.prixUnitaire,
          total: (Number(i.prixUnitaire) * i.quantite).toString()
        }))
      },
      payement: {
        create: {
          montant: payement.montant,
          moyenDePayement: payement.moyenDePayement as any
        }
      }
    },
    include: { ligneCommande: true, payement: true }
  });

  // ...notifications et réponse...
});



 // Vendeur can see orders for their products
      router.get('/mine', authenticate, requireRoles('vendeur'), async (req, res) => {
      const produits = await prisma.produit.findMany({ where: { vendeurId: req.user!.id } });
      const produitIds = produits.map(p => p.id);
      const commandes = await prisma.commande.findMany({
        where: {
          ligneCommande: {
            some: { produitId: { in: produitIds } }
          }
        },
        include: { ligneCommande: true }
      });
      res.json(commandes);
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

