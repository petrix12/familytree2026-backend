const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { auditStorage } = require('./auditContext.middleware');  // <- Nuevo

// 1. Verificar si la petición incluye un Token JWT válido y poblar el contexto de auditoría
/* const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            status: 'fail',
            message: 'Acceso no autorizado. Debe proporcionar un Token Bearer',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Adjunta el usuario (id, email, roles) al objeto request
        next();
    } catch (error) {
        return res.status(403).json({
            status: 'fail',
            message: 'Token inválido o expirado',
        });
    }
}; */
// Nuevo: Nueva versión del middleware authenticateJWT que también actualiza el contexto de auditoría
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            status: 'fail',
            message: 'Acceso no autorizado. Debe proporcionar un Token Bearer',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Adjunta el usuario (id, email, roles) al objeto request

        // Actualizar el context store con el ID del usuario decodificado
        const store = auditStorage.getStore();
        if (store) {
            store.userId = decoded.id;
        }

        next();
    } catch (error) {
        return res.status(403).json({
            status: 'fail',
            message: 'Token inválido o expirado',
        });
    }
};

// 2. Control de Acceso Basado en Roles (RBAC)
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.roles) {
            return res.status(403).json({
                status: 'fail',
                message: 'Acceso denegado. Sin roles asignados',
            });
        }

        const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));

        if (!hasRole) {
            return res.status(403).json({
                status: 'fail',
                message: 'No tienes los permisos requeridos para ejecutar esta acción',
            });
        }

        next();
    };
};

// 3. Middleware para verificar si el usuario posee un permiso específico
const checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;

            // Consultar los roles del usuario incluyendo sus permisos
            const userWithRoles = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    roles: {
                        include: {
                            role: {
                                include: {
                                    permissions: {
                                        include: { permission: true }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!userWithRoles) {
                return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' });
            }

            // Extraer nombres de roles
            const userRoleNames = userWithRoles.roles.map(ur => ur.role.name);

            // SUPER_ADMIN tiene acceso global a todo
            if (userRoleNames.includes('SUPER_ADMIN')) {
                return next();
            }

            // Extraer todas las acciones permitidas de todos sus roles
            const userPermissions = new Set();
            userWithRoles.roles.forEach(ur => {
                ur.role.permissions.forEach(rp => {
                    userPermissions.add(rp.permission.action);
                });
            });

            if (!userPermissions.has(requiredPermission)) {
                return res.status(403).json({
                    status: 'fail',
                    message: `No tienes el permiso necesario (${requiredPermission}) para realizar esta acción`,
                });
            }

            next();
        } catch (error) {
            console.error('Error en verificación de permisos:', error);
            return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
        }
    };
};

module.exports = { authenticateJWT, authorizeRoles, checkPermission };