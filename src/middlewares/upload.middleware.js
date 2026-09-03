const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Almacenamiento en memoria para Supabase
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        // Asegurar que la carpeta exista únicamente cuando se recibe una petición de subida
        const uploadDir = path.join(__dirname, '../../uploads/avatars');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, true);
    } else {
        cb(new Error('Formato no soportado. Solo se permiten archivos de imagen.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2 MB
    },
});

module.exports = upload;