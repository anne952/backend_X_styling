"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const notifications_1 = require("../services/notifications");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
/**
 * 📌 Create order (client ou vendeur)
 */
router.post('/', auth_1.authenticate, (0, auth_1.requireRoles)('client', 'vendeur'), async (req, res) => {
    try {
        const { items, localisation, payement } = req.body;
        // ✅ Vérif de base
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: '❌ Le champ items est requis et doit être un tableau non vide.' });
        }
        if (!payement || !payement.montant || !payement.moyenDePayement) {
            return res.status(400).json({ message: '❌ Le paiement est requis pour valider la commande.' });
        }
        // ✅ Calcul du montant total à partir des items
        const montantNum = items.reduce((sum, i) => sum + Number(i.prixUnitaire) * i.quantite, 0);
        // ✅ Vérification cohérence montant
        if (Number(payement.montant) !== montantNum) {
            return res.status(400).json({
                message: `❌ Le montant du paiement (${payement.montant}) ne correspond pas au total calculé (${montantNum}).`
            });
        }
        // ✅ Création de la commande en cascade
        const order = await prisma_1.default.commande.create({
            data: {
                usersId: req.user.id,
                localisation,
                montant: new client_1.Prisma.Decimal(montantNum),
                ligneCommande: {
                    create: items.map(i => ({
                        produitId: i.produitId,
                        quantite: i.quantite,
                        prixUnitaire: new client_1.Prisma.Decimal(i.prixUnitaire),
                        total: new client_1.Prisma.Decimal(Number(i.prixUnitaire) * i.quantite),
                    }))
                },
                payement: {
                    create: {
                        montant: new client_1.Prisma.Decimal(payement.montant),
                        moyenDePayement: payement.moyenDePayement
                    }
                }
            },
            include: { ligneCommande: true, payement: true, users: true }
        });
        // Envoyer notification push au client
        if (order.users.expoPushToken) {
            await (0, notifications_1.sendExpoNotificationsAsync)([
                (0, notifications_1.buildMessage)(order.users.expoPushToken, 'Commande reçue', `Votre commande #${order.id} a été enregistrée avec succès et sera traitée bientôt.`)
            ]);
        }
        return res.status(201).json({ message: '✅ Commande créée avec succès.', order });
    }
    catch (error) {
        console.error('❌ Erreur création commande :', error);
        return res.status(500).json({ message: 'Erreur serveur lors de la création de la commande.' });
    }
});
/**
 * 📌 Vendeur : voir commandes de ses produits
 */
router.get('/mine', auth_1.authenticate, (0, auth_1.requireRoles)('vendeur'), async (req, res) => {
    const produits = await prisma_1.default.produit.findMany({ where: { vendeurId: req.user.id } });
    const produitIds = produits.map(p => p.id);
    const commandes = await prisma_1.default.commande.findMany({
        where: { ligneCommande: { some: { produitId: { in: produitIds } } } },
        include: { ligneCommande: true }
    });
    res.json(commandes);
});
/**
 * 📌 Validation commande (admin ou vendeur)
 */
router.post('/:id/validate', auth_1.authenticate, (0, auth_1.requireRoles)('admin', 'vendeur'), async (req, res) => {
    const id = Number(req.params.id);
    const updated = await prisma_1.default.commande.update({
        where: { id },
        data: { status: 'en_cours_pour_la_livraison' },
        include: { users: true }
    });
    if (updated.users.expoPushToken) {
        await (0, notifications_1.sendExpoNotificationsAsync)([
            (0, notifications_1.buildMessage)(updated.users.expoPushToken, 'Commande validée', `Votre commande #${updated.id} est validée.`)
        ]);
    }
    res.json(updated);
});
/**
 * 📌 Mes commandes (client)
 */
router.get('/me', auth_1.authenticate, (0, auth_1.requireRoles)('client'), async (req, res) => {
    const orders = await prisma_1.default.commande.findMany({
        where: { usersId: req.user.id },
        include: { ligneCommande: true, payement: true }
    });
    res.json(orders);
});
/**
 * 📌 Admin : toutes les commandes
 */
router.get('/', auth_1.authenticate, (0, auth_1.requireRoles)('admin'), async (_req, res) => {
    const orders = await prisma_1.default.commande.findMany({
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
router.post('/:id/cancel', auth_1.authenticate, (0, auth_1.requireRoles)('admin', 'vendeur'), async (req, res) => {
    const id = Number(req.params.id);
    const updated = await prisma_1.default.commande.update({
        where: { id },
        data: { status: 'annulee' },
        include: { users: true }
    });
    if (updated.users.expoPushToken) {
        await (0, notifications_1.sendExpoNotificationsAsync)([
            (0, notifications_1.buildMessage)(updated.users.expoPushToken, 'Commande annulée', `Votre commande #${updated.id} a été annulée.`)
        ]);
    }
    res.json(updated);
});
/**
 * 📌 Livraison commande (admin ou vendeur)
 */
router.post('/:id/deliver', auth_1.authenticate, (0, auth_1.requireRoles)('admin', 'vendeur'), async (req, res) => {
    const id = Number(req.params.id);
    const updated = await prisma_1.default.commande.update({
        where: { id },
        data: { status: 'livree' },
        include: { users: true }
    });
    if (updated.users.expoPushToken) {
        await (0, notifications_1.sendExpoNotificationsAsync)([
            (0, notifications_1.buildMessage)(updated.users.expoPushToken, 'Commande livrée', `Votre commande #${updated.id} a été livrée.`)
        ]);
    }
    res.json(updated);
});
exports.default = router;
