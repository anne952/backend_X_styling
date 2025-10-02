"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public list of colors
router.get('/', async (_req, res) => {
    const colors = await prisma_1.default.couleur.findMany();
    res.json(colors);
});
// Create color (admin)
router.post('/', auth_1.authenticate, (0, auth_1.requireRoles)('admin'), async (req, res) => {
    const nom = req.body?.nom;
    const hex = req.body?.hex;
    if (!nom || typeof nom !== 'string' || !nom.trim()) {
        return res.status(400).json({ message: 'nom de couleur requis' });
    }
    try {
        const created = await prisma_1.default.couleur.create({ data: { nom: nom.trim(), hex: hex ?? null } });
        return res.status(201).json(created);
    }
    catch (e) {
        if (e.code === 'P2002') {
            return res.status(409).json({ message: 'Couleur déjà existante' });
        }
        return res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
