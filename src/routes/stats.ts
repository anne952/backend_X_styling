import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/dashboard-cards', authenticate, requireRoles('admin'), async (_req, res) => {
  const [produits, vendeurs, clients, likes] = await Promise.all([
    prisma.produit.count(),
    prisma.users.count({ where: { role: 'vendeur' } }),
    prisma.users.count({ where: { role: 'client' } }),
    Promise.resolve(0) // placeholder for likes feature
  ]);
  res.json({ produits, vendeurs, clients, likes });
});

router.get('/sales/yearly', authenticate, requireRoles('admin', 'vendeur'), async (_req, res) => {
  const currentYear = new Date().getFullYear();
  const start = new Date(currentYear, 0, 1);
  const end = new Date(currentYear + 1, 0, 1);

  const sales = await prisma.commande.groupBy({
    by: ['date'],
    where: { date: { gte: start, lt: end } },
    _sum: { montant: true }
  });

  res.json(sales);
});

router.get('/users/line', authenticate, requireRoles('admin'), async (_req, res) => {
  const counts = await prisma.users.groupBy({ by: ['id'] });
  res.json(counts.length);
});

export default router;

