import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../prisma';

const router = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

router.post('/register', async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const { email, password } = parsed.data;
  const exists = await prisma.users.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ message: 'Email déjà utilisé' });
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.users.create({ data: { email, password: hashed, nom: email.split('@')[0], role: 'client' } });
  return res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

router.post('/login', async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const { email, password } = parsed.data;
  const user = await prisma.users.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: 'Identifiants invalides' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: 'Identifiants invalides' });
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const token = jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn: '7d' });
  return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

export default router;

