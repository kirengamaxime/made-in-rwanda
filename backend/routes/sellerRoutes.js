const router = require('express').Router();
const c = require('../controllers/sellerController');
const { protect, requireApprovedSeller } = require('../middleware/auth');

router.get('/', c.listPublic);
router.get('/me', protect, requireApprovedSeller, c.myProfile);
router.put('/me', protect, requireApprovedSeller, c.updateProfile);
router.get('/me/stats', protect, requireApprovedSeller, c.stats);

module.exports = router;
