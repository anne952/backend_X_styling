"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
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
    const { nom } = req.body;
    const me = await prisma_1.default.users.update({ where: { id: req.user.id }, data: { nom } });
    res.json({ id: me.id, email: me.email, nom: me.nom, role: me.role });
});
exports.default = router;
