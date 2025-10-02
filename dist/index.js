"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const products_1 = __importDefault(require("./routes/products"));
const orders_1 = __importDefault(require("./routes/orders"));
const stats_1 = __importDefault(require("./routes/stats"));
const reviews_1 = __importDefault(require("./routes/reviews"));
const categories_1 = __importDefault(require("./routes/categories"));
const colors_1 = __importDefault(require("./routes/colors"));
if (process.env.NODE_ENV !== 'production') {
    dotenv_1.default.config();
}
// Vérifie que la variable DATABASE_URL est définie
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Exiting...');
    process.exit(1);
}
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// Routes API
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/products', products_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/stats', stats_1.default);
app.use('/api/reviews', reviews_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/colors', colors_1.default);
console.log("🚀 Routes chargées :");
console.log(" - /api/auth ->", typeof auth_1.default);
console.log(" - /api/users ->", typeof users_1.default);
console.log(" - /api/products ->", typeof products_1.default);
console.log(" - /api/orders ->", typeof orders_1.default);
console.log(" - /api/stats ->", typeof stats_1.default);
console.log(" - /api/reviews ->", typeof reviews_1.default);
console.log(" - /api/categories ->", typeof categories_1.default);
console.log(" - /api/colors ->", typeof colors_1.default);
// Port fourni par Render
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
