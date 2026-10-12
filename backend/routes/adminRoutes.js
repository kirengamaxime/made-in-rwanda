const router = require('express').Router();
const c = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.use(protect, authorize('admin', 'manager'));

router.get('/stats', c.stats);
router.get('/users', c.listUsers);
router.put('/users/:id/status', validateObjectId('id'), c.setUserStatus);
router.get('/sellers', c.listSellers);
router.put('/sellers/:id/status', validateObjectId('id'), c.setSellerStatus);
router.post('/sellers/:id/reset-credentials', validateObjectId('id'), c.resetSellerCredentials);
router.get('/products', c.listProducts);
router.put('/products/:id/status', validateObjectId('id'), c.setProductStatus);
router.get('/settings', c.getSettings);
router.put('/settings', c.updateSettings);

module.exports = router;
