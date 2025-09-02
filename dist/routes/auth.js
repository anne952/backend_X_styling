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
const router = (0, express_1.Router)();
const authSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6)
});
router.post('/register', async (req, res) => {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const { email, password } = parsed.data;
    const exists = await prisma_1.default.users.findUnique({ where: { email } });
    if (exists)
        return res.status(409).json({ message: 'Email déjà utilisé' });
    const hashed = await bcrypt_1.default.hash(password, 10);
    const user = await prisma_1.default.users.create({ data: { email, password: hashed, nom: email.split('@')[0], role: 'client' } });
    return res.status(201).json({ id: user.id, email: user.email, role: user.role });
});
router.post('/login', async (req, res) => {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const { email, password } = parsed.data;
    const user = await prisma_1.default.users.findUnique({ where: { email } });
    if (!user)
        return res.status(401).json({ message: 'Identifiants invalides' });
    const ok = await bcrypt_1.default.compare(password, user.password);
    if (!ok)
        return res.status(401).json({ message: 'Identifiants invalides' });
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, secret, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});
exports.default = router;
