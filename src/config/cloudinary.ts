import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

const APP_FOLDER = 'BOOKLOOP'; // Base folder for all uploads
const URL_EXPIRATION = 3600; // URL expiration in seconds (1 hour)

// Verify required environment variables
const requiredEnvVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  throw new AppError(`Missing required environment variables: ${missingEnvVars.join(', ')}`, 500);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Test Cloudinary connection
export const testCloudinaryConnection = async (): Promise<void> => {
  try {
    await cloudinary.api.ping();
    logger.info('Cloudinary connection verified successfully');
  } catch (error) {
    logger.error('Failed to connect to Cloudinary:', error);
    throw new AppError('Failed to connect to Cloudinary', 500);
  }
};

export const getSignedUrl = (publicId: string): string => {
  return cloudinary.url(publicId, {
    secure: true,
    signed: true,
    expires_at: Math.floor(Date.now() / 1000) + URL_EXPIRATION
  });
};

export { cloudinary, APP_FOLDER };