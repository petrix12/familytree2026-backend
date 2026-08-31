const { prismaRaw } = require('../config/prisma');

const errorHandler = async (err, req, res, next) => {
    const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    const message = err.message || 'Error interno del servidor';

    console.error(`[SYSTEM ERROR] ${req.method} ${req.originalUrl}:`, err);

    try {
        // Usamos prismaRaw directamente
        await prismaRaw.systemLog.create({
            data: {
                level: 'ERROR',
                message: message,
                stackTrace: err.stack,
                path: req.originalUrl,
                method: req.method,
                statusCode: statusCode,
                userId: req.user?.id || null
            }
        });
        console.log('✅ Log de sistema registrado exitosamente en BD');
    } catch (dbErr) {
        console.error('⚠️ Falló al insertar el log en la BD:', dbErr.message);
    }

    res.status(statusCode).json({
        status: 'error',
        message: statusCode === 500 ? 'Ha ocurrido un error inesperado en el servidor' : message
    });
};

module.exports = { errorHandler };