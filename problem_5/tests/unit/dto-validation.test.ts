import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateResourceDto, UpdateResourceDto, SearchResourceDto } from '../../src/dto';

describe('DTO Validation', () => {
  describe('CreateResourceDto', () => {
    it('should validate a valid CreateResourceDto', async () => {
      const dto = plainToClass(CreateResourceDto, {
        name: 'Test Resource',
        description: 'Test Description',
        status: true,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when name is missing', async () => {
      const dto = plainToClass(CreateResourceDto, {
        description: 'Test Description',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when name is empty string', async () => {
      const dto = plainToClass(CreateResourceDto, {
        name: '',
        description: 'Test Description',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should fail validation when name exceeds 255 characters', async () => {
      const dto = plainToClass(CreateResourceDto, {
        name: 'a'.repeat(256),
        description: 'Test Description',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should validate with optional fields missing', async () => {
      const dto = plainToClass(CreateResourceDto, {
        name: 'Test Resource',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('UpdateResourceDto', () => {
    it('should validate a valid UpdateResourceDto', async () => {
      const dto = plainToClass(UpdateResourceDto, {
        name: 'Updated Resource',
        description: 'Updated Description',
        status: false,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with all fields missing', async () => {
      const dto = plainToClass(UpdateResourceDto, {});

      const errors = await validate(dto, { skipMissingProperties: true });
      expect(errors.length).toBe(0);
    });

    it('should validate with only name provided', async () => {
      const dto = plainToClass(UpdateResourceDto, {
        name: 'Updated Name',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('SearchResourceDto', () => {
    it('should validate a valid SearchResourceDto', async () => {
      const dto = plainToClass(SearchResourceDto, {
        name: 'test',
        status: true,
        page: 1,
        limit: 10,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when page is less than 1', async () => {
      const dto = plainToClass(SearchResourceDto, {
        page: 0,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('page');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should fail validation when limit exceeds 100', async () => {
      const dto = plainToClass(SearchResourceDto, {
        limit: 101,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('max');
    });

    it('should validate with all fields missing', async () => {
      const dto = plainToClass(SearchResourceDto, {});

      const errors = await validate(dto, { skipMissingProperties: true });
      expect(errors.length).toBe(0);
    });
  });
});
