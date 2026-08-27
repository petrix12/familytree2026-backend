const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const rolesController = require('../controllers/roles.controller');

// Importar el nuevo controlador de auditoría (CommonJS)
const { getAuditLogs } = require('../controllers/audit.controller');

// Importar los middlewares exportados desde auth.middleware.js
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

// Importar controladores de administración
const { getUsers,  updateUserRoles, createUser, updateUser, deleteUser } = require('../controllers/admin.controller');

// Proteger todas las rutas de este router
router.use(authenticateJWT);
router.use(authorizeRoles('SUPER_ADMIN'));

// Validaciones para creación
const createUserValidation = [
    body('name').notEmpty().withMessage('El nombre es obligatorio'),
    body('email').isEmail().withMessage('Correo electrónico inválido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    validate,
];

// Rutas Users | Endpoints
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.put('/users/:id/roles', updateUserRoles);
router.post('/users', createUserValidation, createUser);
router.delete('/users/:id', deleteUser);

// CRUD de Roles
router.get('/roles', rolesController.getRoles);
router.get('/permissions', rolesController.getPermissions);
router.post('/roles', rolesController.createRole);
router.put('/roles/:id', rolesController.updateRole);
router.delete('/roles/:id', rolesController.deleteRole);

// Ruta de Auditoría y Logs
router.get('/audit-logs', getAuditLogs);

module.exports = router;