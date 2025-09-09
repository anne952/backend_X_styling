"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const authSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6)
});
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    nom: zod_1.z.string().min(2),
    role: zod_1.z.enum(['client', 'vendeur']).optional().default('client')
});
router.post('/register', async (req, res) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: 'Données invalides', errors: parsed.error.format() });
        }
        const { email, password, nom, role } = parsed.data;
        // Vérifier si l'email existe déjà
        const exists = await prisma_1.default.users.findUnique({ where: { email } });
        if (exists) {
            return res.status(409).json({ message: 'Email déjà utilisé' });
        }
        const hashed = await bcrypt_1.default.hash(password, 10);
        const secret = process.env.JWT_SECRET || 'dev-secret';
        const token = jsonwebtoken_1.default.sign({ email }, secret, { expiresIn: '7d' });
        const user = await prisma_1.default.users.create({
            data: {
                email,
                password: hashed,
                nom,
                role,
                token
            },
            select: {
                id: true,
                email: true,
                nom: true,
                role: true,
                token: true
            }
        });
        return res.status(201).json({
            message: 'Utilisateur créé avec succès',
            user: {
                id: user.id,
                email: user.email,
                nom: user.nom,
                role: user.role
            },
            token: user.token
        });
    }
    catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const parsed = authSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: 'Données invalides', errors: parsed.error.format() });
        }
        const { email, password } = parsed.data;
        const user = await prisma_1.default.users.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Identifiants invalides' });
        }
        const ok = await bcrypt_1.default.compare(password, user.password);
        if (!ok) {
            return res.status(401).json({ message: 'Identifiants invalides' });
        }
        // Générer un nouveau token
        const secret = process.env.JWT_SECRET || 'dev-secret';
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, secret, { expiresIn: '7d' });
        // Mettre à jour le token dans la base de données
        await prisma_1.default.users.update({
            where: { id: user.id },
            data: { token }
        });
        return res.json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                email: user.email,
                nom: user.nom,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Erreur lors de la connexion:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
});
router.post('/logout', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        // Supprimer le token de la base de données
        await prisma_1.default.users.update({
            where: { id: userId },
            data: { token: null }
        });
        return res.json({ message: 'Déconnexion réussie' });
    }
    catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
});
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma_1.default.users.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                nom: true,
                role: true,
                createdAt: true
            }
        });
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        return res.json(user);
    }
    catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
