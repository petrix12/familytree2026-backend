const { fakerES: faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

const seedUsers = async (quantity = 25) => {
    try {
        console.log(`🌱 Generando ${quantity} usuarios falsos...`);

        const defaultPassword = await bcrypt.hash('Password123!', 10);
        const usersData = [];

        for (let i = 0; i < quantity; i++) {
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            
            usersData.push({
                name: `${firstName} ${lastName}`,
                email: faker.internet.email({ firstName, lastName }).toLowerCase(),
                password: defaultPassword,
            });
        }

        // Insertar masivamente
        await prisma.user.createMany({
            data: usersData,
            skipDuplicates: true,
        });

        console.log(`✅ ${quantity} usuarios creados exitosamente.`);
    } catch (error) {
        console.error('❌ Error seeding usuarios:', error.message);
    } finally {
        await prisma.$disconnect();
    }
};

seedUsers();