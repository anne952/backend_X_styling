import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

export type AppRole = 'client' | 'vendeur' | 'admin';

export interface AuthUser {
  id: number;
  role: AppRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token manquant' });
    }
    
    const token = header.slice(7);
    
    // Vérifier le token JWT
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = jwt.verify(token, secret) as AuthUser;
    
    // Vérifier que le token existe dans la base de données
    const user = await prisma.users.findFirst({
      where: {
        id: payload.id,
        token: token
      },
      select: {
        id: true,
        role: true,
        token: true
      }
    });
    
    if (!user || !user.token) {
      return res.status(401).json({ message: 'Token invalide ou expiré' });
    }
    
    req.user = { id: user.id, role: user.role as AppRole };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Token invalide' });
    }
    console.error('Erreur d\'authentification:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const requireRoles = (...roles: AppRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Non authentifié' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Accès refusé' });
    next();
  };
};
