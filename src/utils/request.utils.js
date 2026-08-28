/**
 * Normaliza y obtiene la IP real del cliente desde la request
 */
const getClientIp = (req) => {
    if (!req) return '127.0.0.1';

    let ip =
        req.headers?.['x-forwarded-for']?.split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        req.ip;

    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
        return '127.0.0.1';
    }
    return ip || '127.0.0.1';
};

module.exports = { getClientIp };