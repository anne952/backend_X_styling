import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';

const router = Router();

// Public list of colors
router.get('/', async (_req, res) => {
  const colors = await prisma.couleur.findMany();
  res.json(colors);
});

// Create color (admin)
router.post('/', authenticate, requireRoles('admin'), async (req, res) => {
  const nom = (req.body as any)?.nom;
  const hex = (req.body as any)?.hex;
  if (!nom || typeof nom !== 'string' || !nom.trim()) {
    return res.status(400).json({ message: 'nom de couleur requis' });
  }
  try {
    const created = await prisma.couleur.create({ data: { nom: nom.trim(), hex: hex ?? null } });
    return res.status(201).json(created);
  } catch (e: any) {
    if (e.code === 'P2002') {
      return res.status(409).json({ message: 'Couleur déjà existante' });
    }
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;


