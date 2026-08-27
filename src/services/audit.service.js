const prisma = require('../config/prisma');

export const auditService = {
    /**
     * Registra un evento en la auditoría.
     */
    async log({ userId = null, action, entity, entityId = null, details = null, req = null }) {
        try {
        let ipAddress = null;

        if (req) {
            ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        }

        await prisma.auditLog.create({
            data: {
                userId,
                action,
                entity,
                entityId,
                details,
                ipAddress,
            },
        });
        } catch (error) {
            // Evitamos que un error guardando el log tumbe la petición principal
            console.error('[AUDIT LOG ERROR]:', error);
        }
    },
};