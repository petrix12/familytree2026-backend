const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
require('dotenv').config();

const seedSuperAdmin = async () => {
    try {
        console.log('🌱 Iniciando Seeder de SuperAdmin...');

        const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@familytree.com';
        const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

        if (!adminPassword) {
            throw new Error('❌ Error: Debes definir SUPER_ADMIN_PASSWORD en tu archivo .env');
        }

        // 1. Asegurar los 3 roles base en la BD
        const roles = [
            { name: 'SUPER_ADMIN', description: 'Acceso total y gestión del sistema' },
            { name: 'ADMIN', description: 'Administrador de contenido y usuarios' },
            { name: 'USER', description: 'Usuario estándar' },
        ];

        for (const r of roles) {
            await prisma.role.upsert({
                where: { name: r.name },
                update: {},
                create: r,
            });
        }

        // 2. Obtener el ID del rol SUPER_ADMIN
        const superAdminRole = await prisma.role.findUnique({
            where: { name: 'SUPER_ADMIN' },
        });

        // 3. Crear o actualizar el Usuario SUPER_ADMIN
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const adminUser = await prisma.user.upsert({
            where: { email: adminEmail },
            update: {},
            create: {
                name: 'Super Admin',
                email: adminEmail,
                password: hashedPassword,
                roles: {
                    create: {
                        roleId: superAdminRole.id,
                    },
                },
            },
        });

        console.log('✅ Seeder ejecutado con éxito.');
        console.log(`👤 SuperAdmin verificado: ${adminUser.email}`);
    } catch (error) {
        console.error('❌ Error ejecutando el Seeder:', error.message);
    } finally {
        await prisma.$disconnect();
    }
};

seedSuperAdmin();