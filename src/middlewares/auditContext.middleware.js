const { AsyncLocalStorage } = require('async_hooks');

const auditStorage = new AsyncLocalStorage();

const setAuditUser = (req, res, next) => {
    // Se ejecuta el siguiente middleware dentro del contexto de AsyncLocalStorage
    auditStorage.run({}, () => {
        // En este punto inicial req.user puede ser undefined si la ruta aún no ha pasado por protect
        next();
    });
};

module.exports = { setAuditUser, auditStorage };