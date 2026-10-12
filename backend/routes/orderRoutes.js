const router = require('express').Router();
const c = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.post('/', protect, authorize('buyer'), c.create);
router.get('/my-orders', protect, authorize('buyer'), c.myOrders);
router.get('/', protect, authorize('seller', 'admin', 'manager'), c.list);
router.get('/:id', protect, validateObjectId('id'), c.getOne);
router.put('/:id/status', protect, validateObjectId('id'), c.updateStatus);

module.exports = router;
