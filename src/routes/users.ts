import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import prisma from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';

const router = Router();

const updateMeSchema = z.object({
  nom: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional()
}).refine((data) => Object.keys(data).length > 0, { message: 'Aucune donnée à mettre à jour' });

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
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Données invalides', errors: parsed.error.format() });
    }

    const { nom, email, password } = parsed.data;
    const userId = req.user!.id;

    // Vérifier l'unicité de l'email si fourni
    if (email) {
      const existing = await prisma.users.findFirst({ where: { email, id: { not: userId } } });
      if (existing) {
        return res.status(409).json({ message: 'Email déjà utilisé' });
      }
    }

    // Hasher le mot de passe si fourni
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const updated = await prisma.users.update({
      where: { id: userId },
      data: { nom, email, ...(hashedPassword && { password: hashedPassword }) },
      select: { id: true, email: true, nom: true, role: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;

