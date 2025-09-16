"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const typeCategorieEnum = zod_1.z.enum(['Homme', 'Femme', 'Enfant']);
const typeInput = zod_1.z.string()
    .transform(v => v.trim())
    .transform(v => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase())
    .pipe(typeCategorieEnum);
// List categories (public)
router.get('/', async (_req, res) => {
    const categories = await prisma_1.default.categorie.findMany();
    res.json(categories);
});
// Create category (admin)
router.post('/', auth_1.authenticate, (0, auth_1.requireRoles)('admin'), async (req, res) => {
    const parsed = typeInput.safeParse(req.body?.type);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Type invalide', errors: parsed.error.format() });
    }
    const type = parsed.data;
    try {
        const created = await prisma_1.default.categorie.create({ data: { type } });
        return res.status(201).json(created);
    }
    catch (e) {
        if (e.code === 'P2002') {
            return res.status(409).json({ message: 'Catégorie déjà existante' });
        }
        return res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
