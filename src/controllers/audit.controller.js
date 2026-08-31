const prisma = require('../config/prisma');

const getAuditLogs = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 15, 
            entity, 
            action, 
            search,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const parsedLimit = Math.max(1, parseInt(limit, 10) || 15);

        const skip = (parsedPage - 1) * parsedLimit;
        const take = parsedLimit;

        const where = {};

        // Validamos que no vengan como cadenas vacías desde req.query
        if (entity && entity.trim() !== '') {
            where.entity = entity;
        }

        if (action && action.trim() !== '') {
            where.action = { contains: action, mode: 'insensitive' };
        }
        
        if (search && search.trim() !== '') {
            where.OR = [
                { action: { contains: search, mode: 'insensitive' } },
                { entity: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                where.createdAt.gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        // Construcción del ordenamiento dinámico
        let orderBy = {};
        if (sortBy === 'user') {
            orderBy = { user: { name: sortOrder } };
        } else if (['action', 'entity', 'createdAt'].includes(sortBy)) {
            orderBy = { [sortBy]: sortOrder };
        } else {
            orderBy = { createdAt: 'desc' };
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take,
                orderBy, // <--- Pasar la variable aquí
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                },
            }),
            prisma.auditLog.count({ where }),
        ]);        

        return res.json({
            status: 'success',
            data: {
                logs,
                pagination: {
                    total,
                    page: parsedPage,
                    totalPages: Math.ceil(total / take) || 1,
                },
            },
        });
    } catch (error) {
        console.error('Error al obtener audit logs:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAuditLogs,
};