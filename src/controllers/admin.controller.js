const prisma = require('../config/prisma');

// Listar usuarios con búsqueda y paginación
const getUsers = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = search
        ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ],
        }
        : {};

        const [total, users] = await prisma.$transaction([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    isActive: true,
                    createdAt: true,
                    roles: {
                        select: {
                            role: { select: { name: true } },
                        },
                    },
                },
            }),
        ]);

        // Formatear la estructura de respuesta de roles
        const formattedUsers = users.map((u) => ({
            ...u,
            roles: u.roles.map((r) => r.role.name),
        }));

        return res.status(200).json({
            status: 'success',
            data: {
                users: formattedUsers,
                pagination: {
                    total,
                    page: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                },
            },
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

// Asignar / Cambiar Roles de un usuario
const updateUserRoles = async (req, res) => {
    try {
        const { id } = req.params;
        const { roles } = req.body; // Ejemplo: ["ADMIN", "USER"] o []

        // 1. Eliminar asignaciones de roles actuales
        await prisma.userRole.deleteMany({ where: { userId: id } });

        // 2. Obtener IDs de los nuevos roles solicitados
        if (roles && roles.length > 0) {
            const dbRoles = await prisma.role.findMany({
                where: { name: { in: roles } },
            });

            // 3. Crear nuevas relaciones
            const userRolesData = dbRoles.map((role) => ({
                userId: id,
                roleId: role.id,
            }));

            await prisma.userRole.createMany({ data: userRolesData });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Roles actualizados correctamente',
        });
    } catch (error) {
        console.error('Error al actualizar roles:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

// Actualizar información básica del usuario (Nombre y Email)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email } = req.body;

        // Validar que el usuario exista
        const existingUser = await prisma.user.findUnique({ where: { id } });
        if (!existingUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'Usuario no encontrado',
            });
        }

        // Si se intenta cambiar el email, verificar que no esté registrado por otro usuario
        if (email && email !== existingUser.email) {
            const emailTaken = await prisma.user.findUnique({ where: { email } });
            if (emailTaken) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'El correo electrónico ya está en uso por otro usuario',
                });
            }
        }

        // Actualizar solo nombre e email (los campos omitidos se mantienen intactos)
        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                name: name || existingUser.name,
                email: email || existingUser.email,
            },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                roles: {
                    select: {
                        role: { select: { name: true } },
                    },
                },
            },
        });

        // Formatear salida de roles
        const formattedUser = {
            ...updatedUser,
            roles: updatedUser.roles.map((r) => r.role.name),
        };

        return res.status(200).json({
            status: 'success',
            message: 'Perfil de usuario actualizado correctamente',
            data: { user: formattedUser },
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

module.exports = { getUsers, updateUserRoles, updateUser };