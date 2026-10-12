const router = require('express').Router();
const c = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.post('/', protect, authorize('buyer'), c.create);
router.get('/', protect, authorize('admin', 'manager'), c.list);
router.get('/:id', protect, validateObjectId('id'), c.getOne);
router.post('/:id/cancel', protect, authorize('buyer'), validateObjectId('id'), c.cancel);

module.exports = router;
