"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/dashboard-cards', auth_1.authenticate, (0, auth_1.requireRoles)('admin'), async (_req, res) => {
    const [produits, vendeurs, clients, likes] = await Promise.all([
        prisma_1.default.produit.count(),
        prisma_1.default.users.count({ where: { role: 'vendeur' } }),
        prisma_1.default.users.count({ where: { role: 'client' } }),
        Promise.resolve(0) // placeholder for likes feature
    ]);
    res.json({ produits, vendeurs, clients, likes });
});
router.get('/sales/yearly', auth_1.authenticate, (0, auth_1.requireRoles)('admin', 'vendeur'), async (_req, res) => {
    const currentYear = new Date().getFullYear();
    const start = new Date(currentYear, 0, 1);
    const end = new Date(currentYear + 1, 0, 1);
    const sales = await prisma_1.default.commande.groupBy({
        by: ['date'],
        where: { date: { gte: start, lt: end } },
        _sum: { montant: true }
    });
    res.json(sales);
});
router.get('/users/line', auth_1.authenticate, (0, auth_1.requireRoles)('admin'), async (_req, res) => {
    const counts = await prisma_1.default.users.groupBy({ by: ['id'] });
    res.json(counts.length);
});
exports.default = router;
