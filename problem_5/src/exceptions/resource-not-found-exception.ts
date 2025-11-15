import { BusinessException } from './business-exception';

export class ResourceNotFoundException extends BusinessException {
  constructor(message: string = 'Resource not found') {
    super(404, message);
    this.name = 'NotFoundException';
  }
}
