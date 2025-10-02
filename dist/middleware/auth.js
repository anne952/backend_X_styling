"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRoles = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../prisma"));
const authenticate = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Token manquant' });
        }
        const token = header.slice(7);
        // Vérifier le token JWT
        const secret = process.env.JWT_SECRET || 'dev-secret';
        const payload = jsonwebtoken_1.default.verify(token, secret);
        // Vérifier que le token existe dans la base de données
        const user = await prisma_1.default.users.findFirst({
            where: {
                id: payload.id,
                token: token
            },
            select: {
                id: true,
                role: true,
                token: true
            }
        });
        if (!user || !user.token) {
            return res.status(401).json({ message: 'Token invalide ou expiré' });
        }
        req.user = { id: user.id, role: user.role };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ message: 'Token invalide' });
        }
        console.error('Erreur d\'authentification:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};
exports.authenticate = authenticate;
const requireRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ message: 'Non authentifié' });
        if (!roles.includes(req.user.role))
            return res.status(403).json({ message: 'Accès refusé' });
        next();
    };
};
exports.requireRoles = requireRoles;
