const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Rutas
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares Globales
//app.use(cors());
app.use(cors({
  origin: [
    'https://familytree2026-frontend.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());

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
