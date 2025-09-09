import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authenticate, requireRoles } from '../middleware/auth';

const router = Router();

const reviewSchema = z.object({
  vendeurId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1, 'Le commentaire est requis')
});

// Créer une review (cible: vendeur)
router.post('/', authenticate, async (req, res) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Données invalides', errors: parsed.error.format() });
    }

    const { vendeurId, rating, comment } = parsed.data;
    const userId = req.user!.id;

    // Vérifier que le vendeur existe et a le rôle vendeur
    const vendeur = await prisma.users.findUnique({ where: { id: vendeurId } });
    if (!vendeur || vendeur.role !== 'vendeur') {
      return res.status(404).json({ message: 'Vendeur non trouvé' });
    }

    const review = await prisma.review.create({
      data: {
        vendeurId,
        userId,
        rating,
        comment
      },
      include: {
        user: {
          select: { id: true, nom: true, email: true }
        },
        vendeur: {
          select: { id: true, nom: true }
        }
      }
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Erreur lors de la création de la review:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir toutes les reviews d'un vendeur (public)
router.get('/vendor/:vendeurId', async (req, res) => {
  try {
    const vendeurId = parseInt(req.params.vendeurId);
    if (isNaN(vendeurId)) {
      return res.status(400).json({ message: 'ID vendeur invalide' });
    }

    const reviews = await prisma.review.findMany({
      where: { vendeurId },
      include: {
        user: {
          select: {
            id: true,
            nom: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    res.json({
      reviews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des reviews vendeur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les reviews d'un utilisateur (auteur)
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const currentUserId = req.user!.id;

    if (userId !== currentUserId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const reviews = await prisma.review.findMany({
      where: { userId },
      include: {
        vendeur: {
          select: {
            id: true,
            nom: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(reviews);
  } catch (error) {
    console.error('Erreur lors de la récupération des reviews utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour une review (seulement par l'auteur)
router.put('/:reviewId', authenticate, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId);
    const userId = req.user!.id;

    if (isNaN(reviewId)) {
      return res.status(400).json({ message: 'ID review invalide' });
    }

    const parsed = z.object({ rating: z.number().int().min(1).max(5).optional(), comment: z.string().trim().min(1).optional() }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Données invalides', errors: parsed.error.format() });
    }

    const existing = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ message: 'Review non trouvée ou accès non autorisé' });
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: parsed.data,
      include: {
        user: { select: { id: true, nom: true, email: true } },
        vendeur: { select: { id: true, nom: true } }
      }
    });

    res.json(updatedReview);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la review:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une review (admin ou auteur)
router.delete('/:reviewId', authenticate, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId);
    if (isNaN(reviewId)) {
      return res.status(400).json({ message: 'ID review invalide' });
    }

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      return res.status(404).json({ message: 'Review non trouvée' });
    }

    const isOwner = review.userId === req.user!.id;
    const isAdmin = req.user!.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await prisma.review.delete({ where: { id: reviewId } });
    res.json({ message: 'Review supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la review:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir toutes les reviews (admin seulement)
router.get('/', authenticate, requireRoles('admin'), async (_req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        user: { select: { id: true, nom: true, email: true } },
        vendeur: { select: { id: true, nom: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(reviews);
  } catch (error) {
    console.error('Erreur lors de la récupération de toutes les reviews:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
