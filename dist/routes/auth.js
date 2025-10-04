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
const authSchema = zod_1.z.union([
    zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(6), app: zod_1.z.enum(['vendeur', 'client', 'admin']).optional().default('client') }),
    zod_1.z.object({ nom: zod_1.z.string().min(2), password: zod_1.z.string().min(6), app: zod_1.z.enum(['vendeur', 'client', 'admin']).optional().default('client') })
]);
// Enums côté API pour rester aligné avec Prisma
const typeCoutureEnum = zod_1.z.enum(['HOMME', 'FEMME', 'ENFANT', 'MIXTE']);
const specialiteEnum = zod_1.z.enum(['HauteCouture', 'PretAPorter', 'SurMesure', 'Retouche']);
// Helpers pour accepter valeur unique ou tableau et normaliser en tableau
const asArray = (s) => zod_1.z.union([s, zod_1.z.array(s)]).transform(v => Array.isArray(v) ? v : [v]);
// Normalisation téléphone (Togo): accepte divers formats et renvoie "+228XXXXXXXX"
function normalizeTelephone(input) {
    const raw = String(input ?? '').trim();
    const digits = raw.replace(/[^0-9+]/g, '');
    // Cas déjà +228XXXXXXXX
    if (/^\+228\d{8}$/.test(digits))
        return digits;
    // Convertir 00228XXXXXXXX -> +228XXXXXXXX
    const d = digits.replace(/^00/, '+');
    if (/^\+228\d{8}$/.test(d))
        return d;
    // 228XXXXXXXX -> +228XXXXXXXX
    if (/^228\d{8}$/.test(digits))
        return `+${digits}`;
    // 8 chiffres locaux -> +228XXXXXXXX
    if (/^\d{8}$/.test(digits))
        return `+228${digits}`;
    // 9 chiffres commençant par 0 -> +228XXXXXXXX
    if (/^0\d{8}$/.test(digits))
        return `+228${digits.slice(1)}`;
    return digits; // renvoyer tel quel; la validation suivante refusera si non conforme
}
// Normalisation des entrées côté API pour tolérer accents/espaces/casse
const normalizeTypeCoutureInput = asArray(zod_1.z.string())
    .transform(arr => arr.map(v => v.toString().trim().toUpperCase()))
    .transform(arr => arr.map(v => {
    const map = {
        'HOMME': 'HOMME',
        'FEMME': 'FEMME',
        'ENFANT': 'ENFANT',
        'MIXTE': 'MIXTE'
    };
    return map[v] ?? v;
}))
    .pipe(zod_1.z.array(typeCoutureEnum));
const normalizeSpecialiteInput = asArray(zod_1.z.string())
    .transform(arr => arr.map(v => v.toString().trim()))
    .transform(arr => arr.map(v => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
    .transform(arr => arr.map(v => v.toLowerCase().replace(/[\s\-_.]/g, '')))
    .transform(arr => arr.map(v => {
    const map = {
        'hautecouture': 'HauteCouture',
        'pretaporter': 'PretAPorter',
        'pretporter': 'PretAPorter',
        'pretaaporter': 'PretAPorter',
        'surmesure': 'SurMesure',
        'retouche': 'Retouche',
        'retouches': 'Retouche'
    };
    return map[v] ?? v;
}))
    .pipe(zod_1.z.array(specialiteEnum));
const telephoneInput = zod_1.z.string()
    .transform(normalizeTelephone)
    .refine(v => /^\+228\d{8}$/.test(v), { message: 'Téléphone doit être un numéro togolais valide' });
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    nom: zod_1.z.string().min(2),
    role: zod_1.z.enum(['client', 'vendeur']).optional().default('client'),
    photoProfil: zod_1.z.string().url().optional(),
    // Champs spécifiques aux vendeurs
    localisation: zod_1.z.string().trim().min(1).optional(),
    telephone: telephoneInput.optional(),
    typeCouture: normalizeTypeCoutureInput.optional(),
    commentaire: zod_1.z.string().optional(),
    specialite: normalizeSpecialiteInput.optional()
}).superRefine((data, ctx) => {
    if (data.role === 'vendeur') {
        if (!data.localisation) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: 'localisation est requis pour un vendeur', path: ['localisation'] });
        }
        if (!data.telephone) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: 'telephone est requis pour un vendeur', path: ['telephone'] });
        }
        if (!data.typeCouture || data.typeCouture.length === 0) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: 'typeCouture est requis (au moins une valeur)', path: ['typeCouture'] });
        }
        if (!data.specialite || data.specialite.length === 0) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: 'specialite est requis (au moins une valeur)', path: ['specialite'] });
        }
    }
});
router.post('/register', async (req, res) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: 'Données invalides', errors: parsed.error.format() });
        }
        const { email, password, nom, role, photoProfil, localisation, telephone, typeCouture, commentaire, specialite } = parsed.data;
        // Vérifier si l'email existe déjà
        const exists = await prisma_1.default.users.findUnique({ where: { email } });
        if (exists) {
            return res.status(409).json({ message: 'Email déjà utilisé' });
        }
        const hashed = await bcrypt_1.default.hash(password, 10);
        const secret = process.env.JWT_SECRET || 'dev-secret';
        // Crée l'utilisateur sans token
        const created = await prisma_1.default.users.create({
            data: {
                email,
                password: hashed,
                nom,
                role,
                photoProfil,
                localisation,
                telephone,
                typeCouture: typeCouture ?? undefined,
                commentaire,
                specialite: specialite ?? undefined
            },
            select: {
                id: true,
                email: true,
                nom: true,
                role: true,
                photoProfil: true,
                localisation: true,
                telephone: true,
                typeCouture: true,
                commentaire: true,
                specialite: true
            }
        });
        // Génère le token avec id et rôle
        const token = jsonwebtoken_1.default.sign({ id: created.id, role: created.role }, secret, { expiresIn: '7d' });
        await prisma_1.default.users.update({ where: { id: created.id }, data: { token } });
        return res.status(201).json({
            message: 'Utilisateur créé avec succès',
            user: {
                id: created.id,
                email: created.email,
                nom: created.nom,
                role: created.role,
                photoProfil: created.photoProfil,
                localisation: created.localisation,
                telephone: created.telephone,
                typeCouture: created.typeCouture,
                commentaire: created.commentaire,
                specialite: created.specialite
            },
            token
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
        const data = parsed.data;
        const user = await prisma_1.default.users.findFirst({ where: data.email ? { email: data.email } : { nom: data.nom } });
        if (!user) {
            return res.status(401).json({ message: 'Identifiants invalides' });
        }
        const ok = await bcrypt_1.default.compare(data.password, user.password);
        if (!ok) {
            return res.status(401).json({ message: 'Identifiants invalides' });
        }
        // Validation du rôle selon l'application
        const app = data.app;
        if ((app === 'vendeur' && user.role !== 'vendeur') || (app === 'client' && user.role !== 'client') || (app === 'admin' && user.role !== 'admin')) {
            return res.status(403).json({ message: `Accès refusé : cette application est réservée aux ${app}s.` });
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
                role: user.role,
                photoProfil: user.photoProfil,
                localisation: user.localisation,
                telephone: user.telephone,
                typeCouture: user.typeCouture,
                commentaire: user.commentaire,
                specialite: user.specialite
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
                photoProfil: true,
                localisation: true,
                telephone: true,
                typeCouture: true,
                commentaire: true,
                specialite: true
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
// Validation mise à jour profil vendeur
const updateVendorSchema = zod_1.z.object({
    nom: zod_1.z.string().min(2).optional(),
    email: zod_1.z.string().email().optional(),
    password: zod_1.z.string().min(6).optional(),
    photoProfil: zod_1.z.string().url().optional(),
    localisation: zod_1.z.string().trim().min(1).optional(),
    telephone: telephoneInput.optional(),
    typeCouture: normalizeTypeCoutureInput.optional(),
    commentaire: zod_1.z.string().optional(),
    specialite: normalizeSpecialiteInput.optional()
}).refine((data) => Object.keys(data).length > 0, { message: 'Aucune donnée à mettre à jour' });
// Route pour mettre à jour le profil vendeur
router.put('/profile', auth_1.authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'vendeur') {
            return res.status(403).json({ message: 'Réservé aux vendeurs' });
        }
        const parsed = updateVendorSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: 'Données invalides', errors: parsed.error.format() });
        }
        const userId = req.user.id;
        const { nom, email, password, photoProfil, localisation, telephone, typeCouture, commentaire, specialite } = parsed.data;
        // Vérifier l'unicité de l'email si fourni
        if (email) {
            const existing = await prisma_1.default.users.findFirst({ where: { email, id: { not: userId } } });
            if (existing) {
                return res.status(409).json({ message: 'Email déjà utilisé' });
            }
        }
        // Hasher le mot de passe si fourni
        const hashedPassword = password ? await bcrypt_1.default.hash(password, 10) : undefined;
        const user = await prisma_1.default.users.update({
            where: { id: userId },
            data: {
                nom,
                email,
                ...(hashedPassword && { password: hashedPassword }),
                photoProfil,
                localisation,
                telephone,
                typeCouture: typeCouture ?? undefined,
                commentaire,
                specialite: specialite ?? undefined
            },
            select: {
                id: true,
                email: true,
                nom: true,
                role: true,
                photoProfil: true,
                localisation: true,
                telephone: true,
                typeCouture: true,
                commentaire: true,
                specialite: true
            }
        });
        return res.json({
            message: 'Profil mis à jour avec succès',
            user
        });
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
