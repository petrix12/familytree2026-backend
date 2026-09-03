const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, ensureBucketExists } = require('../config/s3');
const prisma = require('../config/prisma');
const path = require('path');

const uploadAvatar = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({
                status: 'fail',
                message: 'No se ha adjuntado ningún archivo de imagen',
            });
        }

        const bucketName = process.env.S3_BUCKET_NAME || 'app-uploads';

        // 1. Garantizar que el bucket existe antes de subir
        await ensureBucketExists(bucketName);

        const fileExt = path.extname(req.file.originalname);
        const fileName = `avatars/user_${userId}_${Date.now()}${fileExt}`;

        // 2. Subir Buffer mediante S3
        const uploadParams = {
            Bucket: bucketName,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        // 3. Construir URL pública
        const publicUrl = `${process.env.S3_PUBLIC_URL}/${fileName}`;

        // 4. Actualizar usuario en Base de Datos
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl: publicUrl },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                createdAt: true,
            },
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

module.exports = { uploadAvatar };