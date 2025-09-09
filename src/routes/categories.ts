import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';

const router = Router();

const typeCategorieEnum = z.enum(['Homme', 'Femme', 'Enfant']);
const typeInput = z.string()
  .transform(v => v.trim())
  .transform(v => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase())
  .pipe(typeCategorieEnum);

// List categories (public)
router.get('/', async (_req, res) => {
  const categories = await prisma.categorie.findMany();
  res.json(categories);
});

// Create category (admin)
router.post('/', authenticate, requireRoles('admin'), async (req, res) => {
  const parsed = typeInput.safeParse((req.body as any)?.type);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Type invalide', errors: parsed.error.format() });
  }
  const type = parsed.data;
  try {
    const created = await prisma.categorie.create({ data: { type } });
    return res.status(201).json(created);
  } catch (e: any) {
    if (e.code === 'P2002') {
      return res.status(409).json({ message: 'Catégorie déjà existante' });
    }
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
