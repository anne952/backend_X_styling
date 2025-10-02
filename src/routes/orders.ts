import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';
import { buildMessage, sendExpoNotificationsAsync } from '../services/notifications';
import { Prisma } from '@prisma/client';

const router = Router();

/**
 * 📌 Create order (client ou vendeur)
 */
router.post('/', authenticate, requireRoles('client', 'vendeur'), async (req, res) => {
  try {
    const { items, localisation, payement } = req.body as {
      items: { produitId: number; quantite: number; prixUnitaire: string }[];
      localisation?: string;
      payement?: { montant: string; moyenDePayement: 'Tmoney' | 'Flooz' };
    };

    // ✅ Vérif de base
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: '❌ Le champ items est requis et doit être un tableau non vide.' });
    }
    if (!payement || !payement.montant || !payement.moyenDePayement) {
      return res.status(400).json({ message: '❌ Le paiement est requis pour valider la commande.' });
    }

    // ✅ Calcul du montant total à partir des items
    const montantNum = items.reduce(
      (sum: number, i) => sum + Number(i.prixUnitaire) * i.quantite,
      0
    );

    // ✅ Vérification cohérence montant
    if (Number(payement.montant) !== montantNum) {
      return res.status(400).json({
        message: `❌ Le montant du paiement (${payement.montant}) ne correspond pas au total calculé (${montantNum}).`
      });
    }

    // ✅ Création de la commande en cascade
    const order = await prisma.commande.create({
      data: {
        usersId: req.user!.id,
        localisation,
        montant: new Prisma.Decimal(montantNum),
        ligneCommande: {
          create: items.map(i => ({
            produitId: i.produitId,
            quantite: i.quantite,
            prixUnitaire: new Prisma.Decimal(i.prixUnitaire),
            total: new Prisma.Decimal(Number(i.prixUnitaire) * i.quantite),
          }))
        },
        payement: {
          create: {
            montant: new Prisma.Decimal(payement.montant),
            moyenDePayement: payement.moyenDePayement
          }
        }
      },
      include: { ligneCommande: true, payement: true }
    });

    return res.status(201).json({ message: '✅ Commande créée avec succès.', order });

  } catch (error) {
    console.error('❌ Erreur création commande :', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la création de la commande.' });
  }
});

/**
 * 📌 Vendeur : voir commandes de ses produits
 */
router.get('/mine', authenticate, requireRoles('vendeur'), async (req, res) => {
  const produits = await prisma.produit.findMany({ where: { vendeurId: req.user!.id } });
  const produitIds = produits.map(p => p.id);
  const commandes = await prisma.commande.findMany({
    where: { ligneCommande: { some: { produitId: { in: produitIds } } } },
    include: { ligneCommande: true }
  });
  res.json(commandes);
});

/**
 * 📌 Validation commande (admin ou vendeur)
 */
router.post('/:id/validate', authenticate, requireRoles('admin', 'vendeur'), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.commande.update({
    where: { id },
    data: { status: 'en_cours_pour_la_livraison' },
    include: { users: true }
  });

  if (updated.users.expoPushToken) {
    await sendExpoNotificationsAsync([
      buildMessage(updated.users.expoPushToken, 'Commande validée', `Votre commande #${updated.id} est validée.`)
    ]);
  }

  res.json(updated);
});

/**
 * 📌 Mes commandes (client)
 */
router.get('/me', authenticate, requireRoles('client'), async (req, res) => {
  const orders = await prisma.commande.findMany({
    where: { usersId: req.user!.id },
    include: { ligneCommande: true, payement: true }
  });
  res.json(orders);
});

/**
 * 📌 Admin : toutes les commandes
 */
router.get('/', authenticate, requireRoles('admin'), async (_req, res) => {
  const orders = await prisma.commande.findMany({
    include: {
      ligneCommande: true,
      users: { select: { id: true, email: true } },
      payement: true
    }
  });
  res.json(orders);
});

/**
 * 📌 Annuler commande (admin ou vendeur)
 */
router.post('/:id/cancel', authenticate, requireRoles('admin', 'vendeur'), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.commande.update({
    where: { id },
    data: { status: 'annulee' },
    include: { users: true }
  });

  if (updated.users.expoPushToken) {
    await sendExpoNotificationsAsync([
      buildMessage(updated.users.expoPushToken, 'Commande annulée', `Votre commande #${updated.id} a été annulée.`)
    ]);
  }

  res.json(updated);
});

/**
 * 📌 Livraison commande (admin ou vendeur)
 */
router.post('/:id/deliver', authenticate, requireRoles('admin', 'vendeur'), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.commande.update({
    where: { id },
    data: { status: 'livree' },
    include: { users: true }
  });

  if (updated.users.expoPushToken) {
    await sendExpoNotificationsAsync([
      buildMessage(updated.users.expoPushToken, 'Commande livrée', `Votre commande #${updated.id} a été livrée.`)
    ]);
  }

  res.json(updated);
});

export default router;
