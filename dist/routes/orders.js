"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const notifications_1 = require("../services/notifications");
const router = (0, express_1.Router)();
// Create order (client ou vendeur)
router.post('/', auth_1.authenticate, (0, auth_1.requireRoles)('client', 'vendeur'), async (req, res) => {
    const { items, localisation, payement } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Le champ items est requis et doit être un tableau non vide' });
    }
    if (!payement || !payement.montant || !payement.moyenDePayement) {
        return res.status(400).json({ message: 'Le paiement est requis pour valider la commande' });
    }
    const montantNum = items.reduce((sum, i) => sum + Number(i.prixUnitaire) * i.quantite, 0);
    const order = await prisma_1.default.commande.create({
        data: {
            usersId: req.user.id,
            localisation,
            montant: montantNum.toString(),
            ligneCommande: {
                create: items.map((i) => ({
                    produitId: i.produitId,
                    quantite: i.quantite,
                    prixUnitaire: i.prixUnitaire,
                    total: (Number(i.prixUnitaire) * i.quantite).toString()
                }))
            },
            payement: {
                create: {
                    montant: payement.montant,
                    moyenDePayement: payement.moyenDePayement
                }
            }
        },
        include: { ligneCommande: true, payement: true }
    });
    // ...notifications et réponse...
});
// Vendeur can see orders for their products
router.get('/mine', auth_1.authenticate, (0, auth_1.requireRoles)('vendeur'), async (req, res) => {
    const produits = await prisma_1.default.produit.findMany({ where: { vendeurId: req.user.id } });
    const produitIds = produits.map(p => p.id);
    const commandes = await prisma_1.default.commande.findMany({
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
router.post('/:id/validate', auth_1.authenticate, (0, auth_1.requireRoles)('admin', 'vendeur'), async (req, res) => {
    const id = Number(req.params.id);
    const updated = await prisma_1.default.commande.update({ where: { id }, data: { status: 'en_cours_pour_la_livraison' }, include: { users: true } });
    // Notify client
    const token = updated.users.expoPushToken;
    if (token) {
        await (0, notifications_1.sendExpoNotificationsAsync)([(0, notifications_1.buildMessage)(token, 'Commande validée', `Votre commande #${updated.id} est validée.`)]);
    }
    res.json(updated);
});
// Get my orders (client)
router.get('/me', auth_1.authenticate, (0, auth_1.requireRoles)('client'), async (req, res) => {
    const orders = await prisma_1.default.commande.findMany({ where: { usersId: req.user.id }, include: { ligneCommande: true } });
    res.json(orders);
});
// Admin: list all orders
router.get('/', auth_1.authenticate, (0, auth_1.requireRoles)('admin'), async (_req, res) => {
    const orders = await prisma_1.default.commande.findMany({ include: { ligneCommande: true, users: { select: { id: true, email: true } } } });
    res.json(orders);
});
// Cancel order (admin or vendeur)
router.post('/:id/cancel', auth_1.authenticate, (0, auth_1.requireRoles)('admin', 'vendeur'), async (req, res) => {
    const id = Number(req.params.id);
    const updated = await prisma_1.default.commande.update({ where: { id }, data: { status: 'annulee' }, include: { users: true } });
    const token = updated.users.expoPushToken;
    if (token) {
        await (0, notifications_1.sendExpoNotificationsAsync)([(0, notifications_1.buildMessage)(token, 'Commande annulée', `Votre commande #${updated.id} a été annulée.`)]);
    }
    res.json(updated);
});
// Deliver order (admin or vendeur)
router.post('/:id/deliver', auth_1.authenticate, (0, auth_1.requireRoles)('admin', 'vendeur'), async (req, res) => {
    const id = Number(req.params.id);
    const updated = await prisma_1.default.commande.update({ where: { id }, data: { status: 'livree' }, include: { users: true } });
    const token = updated.users.expoPushToken;
    if (token) {
        await (0, notifications_1.sendExpoNotificationsAsync)([(0, notifications_1.buildMessage)(token, 'Commande livrée', `Votre commande #${updated.id} a été livrée.`)]);
    }
    res.json(updated);
});
exports.default = router;
