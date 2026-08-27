const prisma = require('./config/prisma');

async function main() {
    // 1. Obtener el primer usuario existente para vincularlo al log
    const user = await prisma.user.findFirst();

    if (!user) {
        console.error('Debes tener al menos un usuario en la tabla User');
        return;
    }

    // 2. Insertar registros de prueba
    await prisma.auditLog.createMany({
        data: [
            {
                userId: user.id,
                action: 'CREATE',
                entity: 'Person',
                entityId: '1',
                details: JSON.stringify({ name: 'Juan Pérez', role: 'Padre' }),
                ipAddress: '127.0.0.1',
            },
            {
                userId: user.id,
                action: 'UPDATE',
                entity: 'User',
                entityId: String(user.id),
                details: JSON.stringify({ field: 'email', old: 'old@test.com', new: user.email }),
                ipAddress: '127.0.0.1',
            },
            {
                userId: user.id,
                action: 'LOGIN',
                entity: 'Auth',
                entityId: String(user.id),
                details: JSON.stringify({ message: 'Inicio de sesión exitoso' }),
                ipAddress: '127.0.0.1',
            },
        ],
    });

    console.log('✅ Logs de prueba creados exitosamente');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());