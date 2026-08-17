const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

// Inicializar el pool de conexiones con la URL de la base de datos
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando la carga de datos iniciales (Seed)...');

  const roles = [
    { name: 'SUPER_ADMIN', description: 'Acceso total y gestión del sistema' },
    { name: 'ADMIN', description: 'Administrador de contenido y usuarios' },
    { name: 'USER', description: 'Usuario estándar registrado' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  console.log('✅ Roles creados/verificados correctamente en la base de datos.');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });