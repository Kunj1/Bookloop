import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';

export const verifyToken = (token: string): Promise<{ userId: string }> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err || !decoded || typeof decoded !== 'object' || !('userId' in decoded)) {
        return reject(new Error('Invalid or expired token'));
      }
      resolve(decoded as { userId: string });
    });
  });
};
