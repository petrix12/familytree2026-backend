const jwt = require('jsonwebtoken');

// 1. Verificar si la petición incluye un Token JWT válido
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

module.exports = { authenticateJWT, authorizeRoles };