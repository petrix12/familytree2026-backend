const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

// Listar usuarios con búsqueda, paginación y ordenamiento
const getUsers = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = search
        ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ],
        }
        : {};

        // Validar campos permitidos para evitar ordenamientos inválidos
        const allowedSortFields = ['name', 'email', 'createdAt'];
        const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

        const [total, users] = await prisma.$transaction([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: [
                    { [validSortBy]: validSortOrder },
                    { id: 'asc' } // Criterio secundario para desempate
                ],
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
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

        // Formatear la estructura de respuesta de roles...
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

// CREAR USUARIO (ADMIN)
const createUser = async (req, res) => {
    try {
        const { name, email, password, role = 'USER' } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ status: 'fail', message: 'El correo electrónico ya existe' });
        }

        // Buscar el rol solicitado (por defecto USER)
        const roleObj = await prisma.role.findUnique({ where: { name: role } });
        if (!roleObj) {
            return res.status(400).json({ status: 'fail', message: `El rol ${role} no existe` });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: passwordHash,
                roles: { create: { roleId: roleObj.id } },
            },
            select: { id: true, email: true, name: true, createdAt: true },
        });

        return res.status(201).json({ status: 'success', data: { user: newUser } });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

// ELIMINAR USUARIO (CRUD Completo)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Evitar que un Admin se elimine a sí mismo por accidente
        if (req.user.id === id) {
            return res.status(400).json({ status: 'fail', message: 'No puedes eliminar tu propia cuenta' });
        }

        // Eliminar relaciones de roles primero (o usar onDelete: Cascade en Prisma)
        await prisma.userRole.deleteMany({ where: { userId: id } });
        await prisma.user.delete({ where: { id } });

        return res.status(200).json({ status: 'success', message: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        return res.status(500).json({ status: 'error', message: 'Error al eliminar el usuario' });
    }
};

// Actualizar información del usuario (Nombre, Email y Contraseña opcional)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password } = req.body;

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

        // Construir el objeto con los campos a actualizar
        const updateData = {
            name: name || existingUser.name,
            email: email || existingUser.email,
        };

        // Si se envía una contraseña nueva no vacía, la encriptamos e incluimos en el update
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
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

module.exports = { getUsers, updateUserRoles, updateUser, createUser, deleteUser };