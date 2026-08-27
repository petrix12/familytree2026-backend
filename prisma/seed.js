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

  const permissions = [
    // Módulo de Usuarios
    { action: 'users:read', module: 'users', description: 'Permite ver el listado y detalle de usuarios' },
    { action: 'users:create', module: 'users', description: 'Permite registrar nuevos usuarios' },
    { action: 'users:update', module: 'users', description: 'Permite editar datos de usuarios existentes' },
    { action: 'users:delete', module: 'users', description: 'Permite eliminar usuarios' },
    
    // Módulo de Roles y Permisos
    { action: 'roles:read', module: 'roles', description: 'Permite ver la lista de roles y sus permisos' },
    { action: 'roles:create', module: 'roles', description: 'Permite crear nuevos roles' },
    { action: 'roles:update', module: 'roles', description: 'Permite modificar roles y asignar permisos' },
    { action: 'roles:delete', module: 'roles', description: 'Permite eliminar roles' },
  ];
  
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { action: perm.action },
      update: { description: perm.description, module: perm.module },
      create: perm,
    });
  }

  console.log('✅ Catálogo de permisos inicializado con éxito.');  
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