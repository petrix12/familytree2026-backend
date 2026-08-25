const requireRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.roles) {
            return res.status(403).json({
                status: 'fail',
                message: 'Acceso denegado: Usuario sin información de roles',
            });
        }

        const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));

        if (!hasRole) {
            return res.status(403).json({
                status: 'fail',
                message: 'No tienes los permisos necesarios para realizar esta acción',
            });
        }

        next();
    };
};

module.exports = { requireRoles };