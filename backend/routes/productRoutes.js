const router = require('express').Router();
const c = require('../controllers/productController');
const { protect, optionalAuth, authorize, requireApprovedSeller } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validateObjectId = require('../middleware/validateObjectId');

router.get('/', c.list);
router.get('/mine', protect, requireApprovedSeller, c.mine);
router.get('/:id', validateObjectId('id'), optionalAuth, c.getOne);
router.post('/', protect, requireApprovedSeller, upload.productImages, c.create);
router.put('/:id', protect, requireApprovedSeller, validateObjectId('id'), upload.productImages, c.update);
router.delete('/:id', protect, authorize('seller', 'admin', 'manager'), validateObjectId('id'), c.remove);

module.exports = router;
