"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const updateMeSchema = zod_1.z.object({
    nom: zod_1.z.string().min(2).optional(),
    email: zod_1.z.string().email().optional(),
    password: zod_1.z.string().min(6).optional(),
    photoProfil: zod_1.z.string().url().optional()
}).refine((data) => Object.keys(data).length > 0, { message: 'Aucune donnée à mettre à jour' });
router.get('/', auth_1.authenticate, (0, auth_1.requireRoles)('admin'), async (_req, res) => {
    const users = await prisma_1.default.users.findMany({ select: { id: true, email: true, nom: true, role: true } });
    res.json(users);
});
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRoles)('admin'), async (req, res) => {
    const id = Number(req.params.id);
    await prisma_1.default.users.delete({ where: { id } });
    res.status(204).send();
});
router.put('/me', auth_1.authenticate, async (req, res) => {
    try {
        const parsed = updateMeSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: 'Données invalides', errors: parsed.error.format() });
        }
        const { nom, email, password, photoProfil } = parsed.data;
        const userId = req.user.id;
        // Vérifier l'unicité de l'email si fourni
        if (email) {
            const existing = await prisma_1.default.users.findFirst({ where: { email, id: { not: userId } } });
            if (existing) {
                return res.status(409).json({ message: 'Email déjà utilisé' });
            }
        }
        // Hasher le mot de passe si fourni
        const hashedPassword = password ? await bcrypt_1.default.hash(password, 10) : undefined;
        const updated = await prisma_1.default.users.update({
            where: { id: userId },
            data: { nom, email, photoProfil, ...(hashedPassword && { password: hashedPassword }) },
            select: { id: true, email: true, nom: true, role: true, photoProfil: true }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
