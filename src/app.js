const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Middleware para establecer el contexto de auditoría
const { setAuditUser } = require('./middlewares/auditContext.middleware');

// Rutas
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares Globales
const allowedOrigins = [
    process.env.FRONTEND_URL_PROD,
    process.env.FRONTEND_URL_LOCAL_VITE,
    process.env.FRONTEND_URL_LOCAL_VUE_CLI,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Contexto de auditoría global para envolver la petición HTTP
app.use(setAuditUser);

// Ruta raíz informativa
app.get('/', (req, res) => {
    res.send('API REST de FamilyTree2026 ejecutándose. Visita /api/v1/health para estado.');
});

// Ruta de comprobación de estado (Health Check)
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'API FamilyTree2026 operativa',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

// Registrar Rutas de la API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);

// Inicialización del Servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`📌 Entorno: ${process.env.NODE_ENV || 'development'}`);
});
