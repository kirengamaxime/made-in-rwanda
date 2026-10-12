const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' } });

router.post('/register', loginLimiter, c.register);
router.post('/login', loginLimiter, c.login);
router.post('/seller/login', loginLimiter, c.sellerLogin);
router.post('/admin/login', loginLimiter, c.adminLogin);
router.get('/me', protect, c.me);
router.put('/me', protect, c.updateProfile);
router.put('/password', protect, c.changePassword);

module.exports = router;
