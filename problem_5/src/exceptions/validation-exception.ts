export class ValidationException extends Error {
  statusCode: number;
  message: string;
  errors?: any;

  constructor(message: string, errors?: any) {
    super(message);
    this.statusCode = 400;
    this.message = message;
    this.errors = errors;
  }
}
