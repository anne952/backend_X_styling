import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireRoles('admin'), async (_req, res) => {
  const users = await prisma.users.findMany({ select: { id: true, email: true, nom: true, role: true } });
  res.json(users);
});

router.delete('/:id', authenticate, requireRoles('admin'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.users.delete({ where: { id } });
  res.status(204).send();
});

router.put('/me', authenticate, async (req, res) => {
  const { nom } = req.body as { nom?: string };
  const me = await prisma.users.update({ where: { id: req.user!.id }, data: { nom } });
  res.json({ id: me.id, email: me.email, nom: me.nom, role: me.role });
});

export default router;

