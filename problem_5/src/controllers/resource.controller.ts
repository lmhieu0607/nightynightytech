import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../repository/data-source';
import { Resource } from '../repository/entities/resource.entity';
import {
  CreateResourceDto,
  UpdateResourceDto,
  SearchResourceDto,
  PaginationResponseDto,
  ResourceResponseDto,
} from '../dto';
import { FindOptionsWhere, Like } from 'typeorm';
import { ResourceNotFoundException, ValidationException } from '../exceptions';
import { ResourceMapper } from '../mappers/resource.mapper';

export const searchResourcesByFilter = async (req: Request, res: Response, next: NextFunction) => {
  const { name, status, page = 1, limit = 10 }: SearchResourceDto = req.query;

  const skip = (page - 1) * limit;

  const resourceRepository = AppDataSource.getRepository(Resource);

  const where: FindOptionsWhere<Resource> = {};

  if (name) {
    where.name = Like(`%${name}%`);
  }

  if (status !== undefined) {
    where.status = status;
  }

  const [resources, total] = await resourceRepository.findAndCount({
    where,
    order: { created_at: 'DESC' },
    skip,
    take: limit,
  });

  const totalPages = Math.ceil(total / limit);

  const response: PaginationResponseDto<ResourceResponseDto> = {
    data: ResourceMapper.toDtoArray(resources),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };

  res.status(200).json(response);
};

export const getResourceById = async (req: Request, res: Response, next: NextFunction) => {
  const id = Number.parseInt(req.params.id);

  if (Number.isNaN(id)) {
    throw new ValidationException('Invalid resource ID');
  }

  const resourceRepository = AppDataSource.getRepository(Resource);
  const resource = await resourceRepository.findOneBy({ id });

  if (!resource) {
    throw new ResourceNotFoundException('Resource not found');
  }

  res.status(200).json(ResourceMapper.toDto(resource));
};

export const createResource = async (req: Request, res: Response, next: NextFunction) => {
  const request: CreateResourceDto = req.body;

  const resourceRepository = AppDataSource.getRepository(Resource);
  const resource = resourceRepository.create({
    name: request.name,
    description: request.description,
    status: request.status,
  });

  await resourceRepository.save(resource);

  res.status(201).json(ResourceMapper.toDto(resource));
};

export const updateResource = async (req: Request, res: Response, next: NextFunction) => {
  const id = Number.parseInt(req.params.id);

  if (Number.isNaN(id)) {
    throw new ValidationException('Invalid resource ID');
  }

  const data: UpdateResourceDto = req.body;
  const resourceRepository = AppDataSource.getRepository(Resource);

  const resource = await resourceRepository.findOneBy({ id });

  if (!resource) {
    throw new ResourceNotFoundException('Resource not found');
  }

  if (data.name !== undefined) {
    resource.name = data.name;
  }
  if (data.description !== undefined) {
    resource.description = data.description;
  }
  if (data.status !== undefined) {
    resource.status = data.status;
  }

  await resourceRepository.save(resource);

  res.status(200).json(ResourceMapper.toDto(resource));
};

export const deleteResource = async (req: Request, res: Response, next: NextFunction) => {
  const id = Number.parseInt(req.params.id);

  if (Number.isNaN(id)) {
    throw new ValidationException('Invalid resource ID');
  }

  const resourceRepository = AppDataSource.getRepository(Resource);
  const result = await resourceRepository.delete(id);

  if (!result.affected || result.affected === 0) {
    throw new ResourceNotFoundException('Resource not found');
  }

  res.status(200).json({
    success: true,
    message: 'Resource deleted successfully',
  });
};
