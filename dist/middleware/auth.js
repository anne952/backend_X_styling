"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRoles = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = header.slice(7);
    try {
        const secret = process.env.JWT_SECRET || 'dev-secret';
        const payload = jsonwebtoken_1.default.verify(token, secret);
        req.user = { id: payload.id, role: payload.role };
        next();
    }
    catch {
        return res.status(401).json({ message: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
const requireRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        if (!roles.includes(req.user.role))
            return res.status(403).json({ message: 'Forbidden' });
        next();
    };
};
exports.requireRoles = requireRoles;
