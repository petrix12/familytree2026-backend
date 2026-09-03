const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe, logout } = require('../controllers/auth.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { uploadAvatar } = require('../controllers/profile.controller');
const upload = require('../middlewares/upload.middleware');

const router = express.Router();

// Reglas de validación para Registro
const registerValidation = [
    body('email').isEmail().withMessage('Debe proporcionar un correo electrónico válido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('firstName').notEmpty().withMessage('El nombre es obligatorio'),
    body('lastName').notEmpty().withMessage('El apellido es obligatorio'),
    validate,
];

// Reglas de validación para Login
const loginValidation = [
    body('email').isEmail().withMessage('Debe proporcionar un correo electrónico válido'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria'),
    validate,
];

// Definición de Endpoints
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', authenticateJWT, getMe);  // Endpoint protegido para verificar estado de sesión de usuario logueado
router.post('/logout', authenticateJWT, logout);
router.post('/avatar', authenticateJWT, upload.single('avatar'), uploadAvatar);

module.exports = router;


