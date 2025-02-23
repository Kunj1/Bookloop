import { Request as ExpressRequest, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}

export type RequestWithUser = ExpressRequest & { user?: JwtPayload };
export type RequestHandler = (req: RequestWithUser, res: Response, next: NextFunction) => Promise<void> | void;
