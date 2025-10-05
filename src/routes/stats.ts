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

router.get('/vendeur/:id', authenticate, async (req, res) => {
  const vendeurId = Number(req.params.id);
  if (Number.isNaN(vendeurId)) {
    return res.status(400).json({ message: 'ID vendeur invalide' });
  }

  const vendeur = await prisma.users.findUnique({
    where: { id: vendeurId },
    select: {
      id: true,
      nom: true,
      email: true,
      photoProfil: true,
      role: true,
      typeCouture: true,
      specialite: true,
      commentaire: true,
      localisation: true
    }
  });

  if (!vendeur || vendeur.role !== 'vendeur') {
    return res.status(404).json({ message: 'Vendeur introuvable' });
  }

  // Compter le nombre de produits
  const nombreProduits = await prisma.produit.count({ where: { vendeurId } });

  // Compter le total des likes sur ses produits
  const totalLikes = await prisma.like.count({
    where: { produit: { vendeurId } }
  });

  res.json({
    vendeur,
    stats: { nombreProduits, totalLikes }
  });
});

/**
 * 📌 Gains du vendeur (ses ventes)
 */
router.get('/vendeur/earnings', authenticate, requireRoles('vendeur'), async (req, res) => {
  try {
    const vendeurId = req.user!.id;

    // Récupérer tous les produits du vendeur
    const produits = await prisma.produit.findMany({ 
      where: { vendeurId },
      select: { id: true }
    });
    const produitIds = produits.map(p => p.id);

    if (produitIds.length === 0) {
      return res.json({
        totalGains: 0,
        nombreVentes: 0,
        commandes: []
      });
    }

    // Récupérer les commandes contenant ses produits
    const commandes = await prisma.commande.findMany({
      where: { 
        ligneCommande: { 
          some: { produitId: { in: produitIds } } 
        }
      },
      include: { 
        ligneCommande: {
          where: { produitId: { in: produitIds } },
          include: { produit: true }
        },
        users: {
          select: { nom: true, email: true }
        }
      }
    });

    // Calculer les gains totaux
    let totalGains = 0;
    commandes.forEach(commande => {
      commande.ligneCommande.forEach(ligne => {
        totalGains += Number(ligne.total);
      });
    });

    res.json({
      totalGains,
      nombreVentes: commandes.length,
      commandes: commandes.map(commande => ({
        id: commande.id,
        date: commande.date,
        montant: commande.montant,
        status: commande.status,
        client: commande.users,
        produitsVendus: commande.ligneCommande.map(ligne => ({
          produit: ligne.produit.nom,
          quantite: ligne.quantite,
          prixUnitaire: ligne.prixUnitaire,
          total: ligne.total
        }))
      }))
    });

  } catch (error) {
    console.error('❌ Erreur calcul gains vendeur:', error);
    return res.status(500).json({ message: 'Erreur serveur lors du calcul des gains' });
  }
});

export default router;
