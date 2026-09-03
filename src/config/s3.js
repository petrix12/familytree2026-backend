const { S3Client, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

const s3Client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: forcePathStyle,
});

/**
 * Verifica si el bucket existe en S3/MinIO y lo crea si no existe
 */
const ensureBucketExists = async (bucketName) => {
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    } catch (error) {
        // Si el bucket no existe (error 404 o NotFound), lo creamos
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            console.log(`📦 El bucket '${bucketName}' no existe. Creándolo automáticamente...`);
            await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
            console.log(`✅ Bucket '${bucketName}' creado con éxito.`);
        } else {
            throw error;
        }
    }
};

module.exports = { s3Client, ensureBucketExists };