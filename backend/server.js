const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { port, clientUrls, isProd } = require('./config/env');
const { connect: connectDB } = require('./config/db');
const { ensureBucket } = require('./services/storageService');
const sanitize = require('./middleware/sanitize');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.set('trust proxy', 1);

// cross-origin resource policy relaxed so the React app (another origin) can display /uploads images
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, cb) => (!origin || clientUrls.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
  credentials: true,
}));
app.use(express.json({ limit: '100kb' })); // request bodies are never logged (card data safety)
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(sanitize);
if (!isProd) app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d', fallthrough: true }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many requests. Please slow down.' } }));

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/seller-applications', require('./routes/applicationRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/sellers', require('./routes/sellerRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  connectDB().then(async () => {
    await ensureBucket().catch((e) => console.warn('[storage] bucket check failed:', e.message));
    app.listen(port, () => console.log(`[server] Made in Rwanda API running on http://localhost:${port}`));
  });
}

module.exports = app;
