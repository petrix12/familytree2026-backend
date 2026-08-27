const prisma = require('../config/prisma');

// Listar todos los roles con sus permisos asignados
const getRoles = async (req, res) => {
    try {
        const roles = await prisma.role.findMany({
            include: {
                permissions: {
                    include: { permission: true }
                },
                _count: { select: { users: true } } // Cantidad de usuarios con este rol
            },
            orderBy: { name: 'asc' }
        });

        const formattedRoles = roles.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
            userCount: r._count.users,
            permissions: r.permissions.map(p => p.permission.action),
            createdAt: r.createdAt
        }));

        return res.status(200).json({ status: 'success', data: { roles: formattedRoles } });
    } catch (error) {
        console.error('Error al obtener roles:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

// Listar todo el catálogo de permisos disponibles (agrupados por módulo)
const getPermissions = async (req, res) => {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: [{ module: 'asc' }, { action: 'asc' }]
        });

        return res.status(200).json({ status: 'success', data: { permissions } });
    } catch (error) {
        console.error('Error al obtener permisos:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

// Crear un nuevo rol con permisos asociados
const createRole = async (req, res) => {
    try {
        const { name, description, permissions = [] } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ status: 'fail', message: 'El nombre del rol es obligatorio' });
        }

        const formattedName = name.trim().toUpperCase();

        // Verificar unicidad
        const existingRole = await prisma.role.findUnique({ where: { name: formattedName } });
        if (existingRole) {
            return res.status(400).json({ status: 'fail', message: 'El nombre del rol ya existe' });
        }

        // Buscar IDs de los permisos enviados
        const dbPermissions = await prisma.permission.findMany({
            where: { action: { in: permissions } }
        });

        const newRole = await prisma.role.create({
            data: {
                name: formattedName,
                description,
                permissions: {
                    create: dbPermissions.map(p => ({ permissionId: p.id }))
                }
            }
        });

        return res.status(201).json({
            status: 'success',
            message: 'Rol creado exitosamente',
            data: { role: newRole }
        });
    } catch (error) {
        console.error('Error al crear rol:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

// Actualizar rol y sincronizar permisos
const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, permissions = [] } = req.body;

        const existingRole = await prisma.role.findUnique({ where: { id } });
        if (!existingRole) {
            return res.status(404).json({ status: 'fail', message: 'Rol no encontrado' });
        }

        // Proteger el rol SUPER_ADMIN de cambios de nombre
        if (existingRole.name === 'SUPER_ADMIN' && name && name.toUpperCase() !== 'SUPER_ADMIN') {
            return res.status(400).json({ status: 'fail', message: 'No se puede renombrar el rol SUPER_ADMIN' });
        }

        const formattedName = name ? name.trim().toUpperCase() : existingRole.name;

        // Obtener los permisos válidos
        const dbPermissions = await prisma.permission.findMany({
            where: { action: { in: permissions } }
        });

        // Transacción: eliminar permisos anteriores y crear los nuevos
        await prisma.$transaction([
            prisma.rolePermission.deleteMany({ where: { roleId: id } }),
            prisma.role.update({
                where: { id },
                data: {
                    name: formattedName,
                    description,
                    permissions: {
                        create: dbPermissions.map(p => ({ permissionId: p.id }))
                    }
                }
            })
        ]);

        return res.status(200).json({
            status: 'success',
            message: 'Rol actualizado correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar rol:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

// Eliminar un rol
const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;

        const role = await prisma.role.findUnique({ where: { id } });
        if (!role) {
            return res.status(404).json({ status: 'fail', message: 'Rol no encontrado' });
        }

        // Protección estricta: No borrar roles core del sistema
        if (['SUPER_ADMIN', 'USER'].includes(role.name)) {
            return res.status(400).json({
                status: 'fail',
                message: `El rol del sistema "${role.name}" no puede ser eliminado.`
            });
        }

        await prisma.role.delete({ where: { id } });

        return res.status(200).json({ status: 'success', message: 'Rol eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar rol:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

module.exports = {
    getRoles,
    getPermissions,
    createRole,
    updateRole,
    deleteRole
};