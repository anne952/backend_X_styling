import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';

const router = Router();

router.post('/admin/bootstrap-test', (_req, res) => {
  res.json({ ok: true });
});



router.get('/:id/products', authenticate, requireRoles('admin', 'client'), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'id invalide' });
  const produits = await prisma.produit.findMany({
    where: { vendeurId: id },
    include: { productImages: true }
  });
  res.json(produits);
});



router.get('/:id', authenticate, requireRoles('admin', 'client'), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'id invalide' });
  const users = await prisma.users.findUnique({ where: { id } });
  if (!users) return res.status(404).json({ message: 'Utilisateur introuvable' });
  res.json(users);
});



const updateMeSchema = z.object({
  nom: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  photoProfil: z.string().url().optional()
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

// Bootstrap: créer le premier admin sans token, protégé par un secret d'env
const bootstrapAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nom: z.string().min(2),
  secret: z.string().min(10)
});

router.post('/admin/bootstrap', async (req, res) => {
  try {
    const parsed = bootstrapAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Données invalides', errors: parsed.error.format() });
    }

    const { email, password, nom, secret } = parsed.data;
    const expected = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!expected || secret !== expected) {
      return res.status(403).json({ message: 'Secret invalide' });
    }

    const existingAdmins = await prisma.users.count({ where: { role: 'admin' } });
    if (existingAdmins > 0) {
      return res.status(409).json({ message: 'Bootstrap déjà effectué' });
    }

    const exists = await prisma.users.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ message: 'Email déjà utilisé' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

    const created = await prisma.users.create({
      data: { email, password: hashed, nom, role: 'admin', token: '' }
    });
    const token = jwt.sign({ id: created.id, role: 'admin' }, jwtSecret, { expiresIn: '7d' });
    await prisma.users.update({ where: { id: created.id }, data: { token } });

    return res.status(201).json({ message: 'Premier administrateur créé', token });
  } catch (error) {
    console.error('Erreur bootstrap admin:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Admin crée un autre admin
const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nom: z.string().min(2)
});

router.post('/admin', authenticate, requireRoles('admin'), async (req, res) => {
  try {
    const parsed = createAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Données invalides', errors: parsed.error.format() });
    }

    const { email, password, nom } = parsed.data;

    const exists = await prisma.users.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ message: 'Email déjà utilisé' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const secret = process.env.JWT_SECRET || 'dev-secret';
    // Générer un token initial pour permettre l'auth immédiate
    const tempToken = jwt.sign({ id: -1, role: 'admin' }, secret, { expiresIn: '7d' });

    const created = await prisma.users.create({
      data: {
        email,
        password: hashed,
        nom,
        role: 'admin',
        token: tempToken
      },
      select: { id: true, email: true, nom: true, role: true, token: true }
    });

    // Regénérer un token signé avec le bon id
    const realToken = jwt.sign({ id: created.id, role: created.role }, secret, { expiresIn: '7d' });
    await prisma.users.update({ where: { id: created.id }, data: { token: realToken } });

    return res.status(201).json({
      message: 'Administrateur créé avec succès',
      user: { id: created.id, email: created.email, nom: created.nom, role: created.role },
      token: realToken
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'administrateur:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/me', authenticate, async (req, res) => {
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Données invalides', errors: parsed.error.format() });
    }

    const { nom, email, password, photoProfil } = parsed.data;
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

    const data: any = {};
    if (nom) data.nom = nom;
    if (email) data.email = email;
    if (photoProfil) data.photoProfil = photoProfil;
    if (hashedPassword) data.password = hashedPassword;

    const updated = await prisma.users.update({
      where: { id: req.user!.id },
      data
    });
    res.json({ message: 'Profil mis à jour avec succès', user: updated });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du profil.' });
  }
});


// Enregistrer le token push Expo pour l'utilisateur courant
router.post('/me/expo-push-token', authenticate, async (req, res) => {
  try {
    const token = (req.body as any)?.expoPushToken;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'expoPushToken requis' });
    }
    const updated = await prisma.users.update({
      where: { id: req.user!.id },
      data: { expoPushToken: token },
      select: { id: true, expoPushToken: true }
    });
    return res.json(updated);
  } catch (error) {
    console.error('Erreur enregistrement expoPushToken:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
