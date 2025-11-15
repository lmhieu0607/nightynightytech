import { Request, Response, NextFunction } from 'express';
import { BusinessException, ValidationException } from '../exceptions';

export const exceptionHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {

  console.error("Error:", err)

  if (err instanceof ValidationException) {
    res.status(400).json({
      success: false,
      message: err.message,
      errors: err.errors || []
    });
    return;
  }

  if (err instanceof BusinessException) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message,
  });
};

export const routeNotFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
};
