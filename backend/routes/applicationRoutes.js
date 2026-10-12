const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/applicationController');
const { protect, optionalAuth, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validateObjectId = require('../middleware/validateObjectId');

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many requests. Please try again later.' } });
const staff = [protect, authorize('admin', 'manager')];

router.post('/', limiter, optionalAuth, upload.applicationImages, c.submit);
router.get('/status', limiter, c.checkStatus);
router.get('/', ...staff, c.list);
router.get('/:id', ...staff, validateObjectId('id'), c.getOne);
router.put('/:id/approve', ...staff, validateObjectId('id'), c.approve);
router.put('/:id/reject', ...staff, validateObjectId('id'), c.reject);

module.exports = router;
