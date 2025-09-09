"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const reviewSchema = zod_1.z.object({
    productId: zod_1.z.number().int().positive(),
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().optional()
});
// Créer une review
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const parsed = reviewSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: 'Données invalides', errors: parsed.error.format() });
        }
        const { productId, rating, comment } = parsed.data;
        const userId = req.user.id;
        // Vérifier si l'utilisateur a déjà fait une review pour ce produit
        const existingReview = await prisma_1.default.review.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId
                }
            }
        });
        if (existingReview) {
            return res.status(409).json({ message: 'Vous avez déjà évalué ce produit' });
        }
        // Vérifier que le produit existe
        const product = await prisma_1.default.produit.findUnique({
            where: { id: productId }
        });
        if (!product) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }
        const review = await prisma_1.default.review.create({
            data: {
                productId,
                userId,
                rating,
                comment
            },
            include: {
                user: {
                    select: {
                        id: true,
                        nom: true,
                        email: true
                    }
                },
                product: {
                    select: {
                        id: true,
                        nom: true
                    }
                }
            }
        });
        res.status(201).json(review);
    }
    catch (error) {
        console.error('Erreur lors de la création de la review:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// Obtenir toutes les reviews d'un produit
router.get('/product/:productId', async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        if (isNaN(productId)) {
            return res.status(400).json({ message: 'ID produit invalide' });
        }
        const reviews = await prisma_1.default.review.findMany({
            where: { productId },
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
        // Calculer la note moyenne
        const averageRating = reviews.length > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
            : 0;
        res.json({
            reviews,
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews: reviews.length
        });
    }
    catch (error) {
        console.error('Erreur lors de la récupération des reviews:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// Obtenir les reviews d'un utilisateur
router.get('/user/:userId', auth_1.authenticate, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const currentUserId = req.user.id;
        // Seul l'utilisateur peut voir ses propres reviews ou un admin
        if (userId !== currentUserId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }
        const reviews = await prisma_1.default.review.findMany({
            where: { userId },
            include: {
                product: {
                    select: {
                        id: true,
                        nom: true,
                        image: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    }
    catch (error) {
        console.error('Erreur lors de la récupération des reviews utilisateur:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// Mettre à jour une review
router.put('/:reviewId', auth_1.authenticate, async (req, res) => {
    try {
        const reviewId = parseInt(req.params.reviewId);
        const userId = req.user.id;
        if (isNaN(reviewId)) {
            return res.status(400).json({ message: 'ID review invalide' });
        }
        const parsed = reviewSchema.partial().safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: 'Données invalides', errors: parsed.error.format() });
        }
        // Vérifier que la review existe et appartient à l'utilisateur
        const existingReview = await prisma_1.default.review.findFirst({
            where: {
                id: reviewId,
                userId
            }
        });
        if (!existingReview) {
            return res.status(404).json({ message: 'Review non trouvée ou accès non autorisé' });
        }
        const updatedReview = await prisma_1.default.review.update({
            where: { id: reviewId },
            data: parsed.data,
            include: {
                user: {
                    select: {
                        id: true,
                        nom: true,
                        email: true
                    }
                },
                product: {
                    select: {
                        id: true,
                        nom: true
                    }
                }
            }
        });
        res.json(updatedReview);
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour de la review:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// Supprimer une review
router.delete('/:reviewId', auth_1.authenticate, async (req, res) => {
    try {
        const reviewId = parseInt(req.params.reviewId);
        const userId = req.user.id;
        if (isNaN(reviewId)) {
            return res.status(400).json({ message: 'ID review invalide' });
        }
        // Vérifier que la review existe et appartient à l'utilisateur ou que l'utilisateur est admin
        const existingReview = await prisma_1.default.review.findFirst({
            where: {
                id: reviewId,
                OR: [
                    { userId },
                    { user: { role: 'admin' } }
                ]
            }
        });
        if (!existingReview) {
            return res.status(404).json({ message: 'Review non trouvée ou accès non autorisé' });
        }
        await prisma_1.default.review.delete({
            where: { id: reviewId }
        });
        res.json({ message: 'Review supprimée avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression de la review:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// Obtenir toutes les reviews (admin seulement)
router.get('/', auth_1.authenticate, (0, auth_1.requireRoles)('admin'), async (req, res) => {
    try {
        const reviews = await prisma_1.default.review.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        nom: true,
                        email: true
                    }
                },
                product: {
                    select: {
                        id: true,
                        nom: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    }
    catch (error) {
        console.error('Erreur lors de la récupération de toutes les reviews:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
