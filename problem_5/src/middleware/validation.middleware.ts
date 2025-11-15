import { Request, Response, NextFunction } from 'express';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ValidationException } from '../exceptions';

export function validateDto(
  type: any,
  source: 'body' | 'query' | 'params' = 'body',
  skipMissingProperties = false
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = plainToClass(type, req[source]);

      const errors: ValidationError[] = await validate(dto, {
        skipMissingProperties,
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (errors.length > 0) {
        const formattedErrors = errors.map((error: ValidationError) => ({
          field: error.property,
          constraints: error.constraints,
          message: Object.values(error.constraints || {}).join(', '),
        }));

        throw new ValidationException('Validation error', formattedErrors);
      }

      next();
    } catch (error) {
      console.log(error)
      next(error);
    }
  };
}
