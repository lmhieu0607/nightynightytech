import { Resource } from '../entities/resource.entity';
import { ResourceResponseDto } from '../dto';

export class ResourceMapper {
  static toDto(resource: Resource): ResourceResponseDto {
    return {
      id: resource.id,
      name: resource.name,
      description: resource.description,
      status: resource.status,
    };
  }

  static toDtoArray(resources: Resource[]): ResourceResponseDto[] {
    return resources.map(resource => this.toDto(resource));
  }
}
