import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import statsRoutes from './routes/stats';
import reviewRoutes from './routes/reviews';
import categoryRoutes from './routes/categories';
import colorRoutes from './routes/colors';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Vérifie que la variable DATABASE_URL est définie
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Exiting...');
  process.exit(1);
}

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/colors', colorRoutes);


console.log("🚀 Routes chargées :");
console.log(" - /api/auth ->", typeof authRoutes);
console.log(" - /api/users ->", typeof userRoutes);
console.log(" - /api/products ->", typeof productRoutes);
console.log(" - /api/orders ->", typeof orderRoutes);
console.log(" - /api/stats ->", typeof statsRoutes);
console.log(" - /api/reviews ->", typeof reviewRoutes);
console.log(" - /api/categories ->", typeof categoryRoutes);
console.log(" - /api/colors ->", typeof colorRoutes);


// Port fourni par Render
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
