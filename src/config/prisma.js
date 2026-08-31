const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { auditStorage } = require('../middlewares/auditContext.middleware');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prismaRaw = new PrismaClient({ adapter });

const prisma = prismaRaw.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const result = await query(args);

                const writeOperations = ['create', 'update', 'delete', 'updateMany', 'deleteMany'];
                const ignoredModels = ['AuditLog', 'SystemLog', 'system_logs', 'audit_logs'];

                // Evitar auditar acciones sobre las tablas del sistema / logs
                if (writeOperations.includes(operation) && !ignoredModels.includes(model)) {
                    try {
                        const store = auditStorage.getStore();
                        const userId = store?.userId || null;
                        const ipAddress = store?.ipAddress || '127.0.0.1';

                        const sanitizedDetails = args?.data ? { ...args.data } : {};
                        if (sanitizedDetails.password) {
                            sanitizedDetails.password = '[PROTECTED]';
                        }

                        const auditData = {
                            action: `${operation.toUpperCase()}_${model.toUpperCase()}`,
                            entity: model,
                            entityId: result?.id ? String(result.id) : (args?.where?.id ? String(args.where.id) : 'N/A'),
                            ipAddress,
                            details: JSON.stringify(sanitizedDetails),
                        };

                        if (userId) {
                            auditData.user = { connect: { id: userId } };
                        }

                        await prismaRaw.auditLog.create({
                            data: auditData,
                        });
                    } catch (error) {
                        console.error('Error registrando auditoría en Prisma Extension:', error);
                    }
                }

                return result;
            },
        },
    },
});

module.exports = prisma;
module.exports.prismaRaw = prismaRaw;