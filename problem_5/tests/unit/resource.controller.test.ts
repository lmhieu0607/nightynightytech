import { Request, Response, NextFunction } from 'express';
import * as resourceController from '../../src/controllers/resource.controller';
import { AppDataSource } from '../../src/repository/data-source';
import { ResourceNotFoundException, ValidationException } from '../../src/exceptions';

jest.mock('../../src/repository/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('Resource Controller Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockRepository: any;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    mockRepository = {
      findAndCount: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchResourcesByFilter', () => {
    it('should return paginated resources with default pagination', async () => {
      const mockResources = [
        { id: 1, name: 'Resource 1', description: 'Desc 1', status: true, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'Resource 2', description: 'Desc 2', status: true, created_at: new Date(), updated_at: new Date() },
      ];
      mockRepository.findAndCount.mockResolvedValue([mockResources, 2]);

      mockRequest.query = {};

      await resourceController.searchResourcesByFilter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { created_at: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'Resource 1' }),
          expect.objectContaining({ id: 2, name: 'Resource 2' }),
        ]),
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });
    });

    it('should filter resources by name using LIKE', async () => {
      const mockResources = [
        { id: 1, name: 'Test Resource', description: 'Desc', status: true, created_at: new Date(), updated_at: new Date() },
      ];
      mockRepository.findAndCount.mockResolvedValue([mockResources, 1]);

      mockRequest.query = { name: 'Test' };

      await resourceController.searchResourcesByFilter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.any(Object), // Like('%Test%')
          }),
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should filter resources by status', async () => {
      const mockResources = [
        { id: 1, name: 'Resource 1', description: 'Desc', status: true, created_at: new Date(), updated_at: new Date() },
      ];
      mockRepository.findAndCount.mockResolvedValue([mockResources, 1]);

      mockRequest.query = { status: true } as any;

      await resourceController.searchResourcesByFilter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: true },
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle custom pagination parameters', async () => {
      const mockResources = [
        { id: 1, name: 'Resource 1', description: 'Desc', status: true, created_at: new Date(), updated_at: new Date() },
      ];
      mockRepository.findAndCount.mockResolvedValue([mockResources, 10]);

      mockRequest.query = { page: 2, limit: 5 } as any;

      await resourceController.searchResourcesByFilter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { created_at: 'DESC' },
        skip: 5, // (page 2 - 1) * 5
        take: 5,
      });
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: {
            page: 2,
            limit: 5,
            total: 10,
            totalPages: 2,
          },
        })
      );
    });
  });

  describe('getResourceById', () => {
    it('should return a resource by id', async () => {
      const mockResource = {
        id: 1,
        name: 'Test Resource',
        description: 'Test Description',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockRepository.findOneBy.mockResolvedValue(mockResource);

      mockRequest.params = { id: '1' };

      await resourceController.getResourceById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        id: 1,
        name: 'Test Resource',
        description: 'Test Description',
        status: true,
      });
    });

    it('should throw ResourceNotFoundException when resource not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      mockRequest.params = { id: '999' };

      await expect(
        resourceController.getResourceById(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        )
      ).rejects.toThrow(ResourceNotFoundException);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 999 });
    });

    it('should throw BadRequestException for invalid id', async () => {
      mockRequest.params = { id: 'invalid' };

      await expect(
        resourceController.getResourceById(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        )
      ).rejects.toThrow(ValidationException);

      expect(mockRepository.findOneBy).not.toHaveBeenCalled();
    });
  });

  describe('createResource', () => {
    it('should create a new resource', async () => {
      const createDto = {
        name: 'New Resource',
        description: 'New Description',
        status: true,
      };

      const mockCreatedResource = {
        id: 1,
        ...createDto,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRepository.create.mockReturnValue(mockCreatedResource);
      mockRepository.save.mockResolvedValue(mockCreatedResource);

      mockRequest.body = createDto;

      await resourceController.createResource(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        name: 'New Resource',
        description: 'New Description',
        status: true,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockCreatedResource);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        id: 1,
        name: 'New Resource',
        description: 'New Description',
        status: true,
      });
    });

    it('should create resource with default status', async () => {
      const createDto = {
        name: 'New Resource',
        description: 'New Description',
      };

      const mockCreatedResource = {
        id: 1,
        name: createDto.name,
        description: createDto.description,
        status: undefined,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRepository.create.mockReturnValue(mockCreatedResource);
      mockRepository.save.mockResolvedValue(mockCreatedResource);

      mockRequest.body = createDto;

      await resourceController.createResource(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        name: 'New Resource',
        description: 'New Description',
        status: undefined,
      });
    });
  });

  describe('updateResource', () => {
    it('should update a resource', async () => {
      const existingResource = {
        id: 1,
        name: 'Old Name',
        description: 'Old Description',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updateDto = {
        name: 'Updated Name',
        description: 'Updated Description',
      };

      const updatedResource = { ...existingResource, ...updateDto };

      mockRepository.findOneBy.mockResolvedValue(existingResource);
      mockRepository.save.mockResolvedValue(updatedResource);

      mockRequest.params = { id: '1' };
      mockRequest.body = updateDto;

      await resourceController.updateResource(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        id: 1,
        name: 'Updated Name',
        description: 'Updated Description',
        status: true,
      });
    });

    it('should update only provided fields', async () => {
      const existingResource = {
        id: 1,
        name: 'Old Name',
        description: 'Old Description',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRepository.findOneBy.mockResolvedValue(existingResource);
      mockRepository.save.mockResolvedValue(existingResource);

      mockRequest.params = { id: '1' };
      mockRequest.body = { name: 'New Name' };

      await resourceController.updateResource(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(existingResource.name).toBe('New Name');
      expect(existingResource.description).toBe('Old Description');
    });

    it('should throw ResourceNotFoundException when resource not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      mockRequest.params = { id: '999' };
      mockRequest.body = { name: 'Updated Name' };

      await expect(
        resourceController.updateResource(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        )
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('should throw ValidationException for invalid id', async () => {
      mockRequest.params = { id: 'invalid' };
      mockRequest.body = { name: 'Updated Name' };

      await expect(
        resourceController.updateResource(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        )
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('deleteResource', () => {
    it('should delete a resource', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      mockRequest.params = { id: '1' };

      await resourceController.deleteResource(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Resource deleted successfully',
      });
    });

    it('should throw ResourceNotFoundException when resource not found', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      mockRequest.params = { id: '999' };

      await expect(
        resourceController.deleteResource(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        )
      ).rejects.toThrow(ResourceNotFoundException);

      expect(mockRepository.delete).toHaveBeenCalledWith(999);
    });

    it('should throw ValidationException for invalid id', async () => {
      mockRequest.params = { id: 'invalid' };

      await expect(
        resourceController.deleteResource(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        )
      ).rejects.toThrow(ValidationException);

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });
});
