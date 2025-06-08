const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUser);
router.patch('/:id', userController.updateUser);

// Restrict to admin only
router.use(authController.restrictTo('admin'));
router.delete('/:id', userController.deleteUser);

module.exports = router;