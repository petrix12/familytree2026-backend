const express = require('express');
const router = express.Router();

// Importar los middlewares exportados desde auth.middleware.js
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');

// Importar controladores de administración
const { getUsers, updateUserRoles, updateUser } = require('../controllers/admin.controller');

// Proteger todas las rutas de este router
router.use(authenticateJWT);
router.use(authorizeRoles('SUPER_ADMIN'));

// Rutas
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.put('/users/:id/roles', updateUserRoles);

module.exports = router;