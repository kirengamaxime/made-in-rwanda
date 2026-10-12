const router = require('express').Router();
const c = require('../controllers/categoryController');
const { protect, optionalAuth, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.get('/', optionalAuth, c.list);
router.post('/', protect, authorize('admin', 'manager'), c.create);
router.put('/:id', protect, authorize('admin', 'manager'), validateObjectId('id'), c.update);
router.delete('/:id', protect, authorize('admin', 'manager'), validateObjectId('id'), c.remove);

module.exports = router;
