const router = require('express').Router();
const { publicSettings } = require('../controllers/adminController');

router.get('/public', publicSettings);

module.exports = router;
