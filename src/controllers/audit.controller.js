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
            endDate 
        } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

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
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
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
                    page: Number(page),
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