# 1. Imagen base oficial de Node.js en Alpine para ligereza y seguridad
FROM node:20-alpine AS base

WORKDIR /usr/src/app

# Instalar dependencias del sistema necesarias para Prisma / OpenSSL en Alpine
RUN apk add --no-cache openssl

# 2. Copiar archivos de gestión de paquetes
COPY package*.json ./
COPY prisma ./prisma/

# 3. Instalación de dependencias de desarrollo y generación del cliente de Prisma
RUN npm ci
RUN npx prisma generate

# 4. Copiar el resto del código fuente del proyecto
COPY . .

# Expone el puerto donde corre Express
EXPOSE 4000

# Comando por defecto para desarrollo (se sobreescribirá con docker-compose en dev)
CMD ["npm", "run", "dev"]