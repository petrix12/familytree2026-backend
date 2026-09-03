const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, ensureBucketExists } = require('../config/s3');
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const path = require('path');

/**
 * Helper para eliminar una imagen existente en S3 dada su URL pública
 */
const deleteExistingS3File = async (publicUrl) => {
    if (!publicUrl) return;

    try {
        const bucketName = process.env.S3_BUCKET_NAME || 'app-uploads';
        const s3PublicBaseUrl = `${process.env.S3_PUBLIC_URL}/`;

        // Extraer la Key (ruta interna en el bucket) quitando el prefijo de la URL pública
        if (publicUrl.startsWith(s3PublicBaseUrl)) {
            const key = publicUrl.replace(s3PublicBaseUrl, '');
            console.log(`🗑️ Eliminando archivo anterior en S3: ${key}`);

            await s3Client.send(new DeleteObjectCommand({
                Bucket: bucketName,
                Key: key
            }));
        }
    } catch (err) {
        // Loguear el error pero no bloquear el flujo si el archivo ya no existía
        console.warn('⚠️ No se pudo eliminar la imagen anterior en S3:', err.message);
    }
};

/**
 * Subir o Reemplazar Avatar
 */
const uploadAvatar = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({
                status: 'fail',
                message: 'No se ha adjuntado ningún archivo de imagen',
            });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ status: 'fail', message: 'Usuario no encontrado' });
        }

        const bucketName = process.env.S3_BUCKET_NAME || 'app-uploads';
        await ensureBucketExists(bucketName);

        // 1. Eliminar la imagen previa si existía
        if (user.avatarUrl) {
            await deleteExistingS3File(user.avatarUrl);
        }

        // 2. Subir la nueva imagen
        const fileExt = path.extname(req.file.originalname);
        const fileName = `avatars/user_${userId}_${Date.now()}${fileExt}`;

        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            // ACL: 'public-read' // Opcional: marca el archivo como legible públicamente
        }));

        const publicUrl = `${process.env.S3_PUBLIC_URL}/${fileName}`;

        // 3. Actualizar la base de datos
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl: publicUrl },
            select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
        });

        return res.status(200).json({
            status: 'success',
            message: 'Imagen de perfil actualizada correctamente',
            data: { user: updatedUser },
        });
    } catch (error) {
        console.error('🔥 Error en uploadAvatar / S3:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al procesar la imagen',
        });
    }
};

/**
 * Eliminar Avatar Actual del Perfil
 */
const deleteAvatar = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ status: 'fail', message: 'Usuario no encontrado' });
        }

        if (user.avatarUrl) {
            await deleteExistingS3File(user.avatarUrl);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl: null },
            select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
        });

        return res.status(200).json({
            status: 'success',
            message: 'Imagen de perfil eliminada correctamente',
            data: { user: updatedUser },
        });
    } catch (error) {
        console.error('🔥 Error en deleteAvatar / S3:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al eliminar la imagen',
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, currentPassword, newPassword } = req.body;

        // Buscar usuario actual
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ status: 'fail', message: 'Usuario no encontrado' });
        }

        const updateData = {};

        // Actualizar nombre si fue enviado
        if (name && name.trim() !== '') {
            updateData.name = name.trim();
        }

        // Si intenta cambiar la contraseña
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Debes proporcionar la contraseña actual para establecer una nueva.'
                });
            }

            // Validar contraseña actual
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'La contraseña actual es incorrecta.'
                });
            }

            // Encriptar nueva contraseña
            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        // Si hay datos para actualizar
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                createdAt: true
            }
        });

        return res.status(200).json({
            status: 'success',
            message: 'Perfil actualizado correctamente',
            data: { user: updatedUser }
        });
    } catch (error) {
        console.error('Error en updateProfile:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al actualizar el perfil'
        });
    }
};

module.exports = { uploadAvatar, deleteAvatar, updateProfile };