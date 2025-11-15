import request from 'supertest';
import { DataSource } from 'typeorm';
import { Resource } from '../../src/entities/resource.entity';

const mockDataSource = new DataSource({
  type: 'better-sqlite3',
  database: ':memory:',
  dropSchema: true,
  entities: [Resource],
  synchronize: true,
  logging: false,
});

jest.mock('../../src/repository/data-source', () => ({
  AppDataSource: mockDataSource,
}));

import app from '../../src/app';

describe('Resource API Integration Tests', () => {
  let createdResourceId: number;

  beforeAll(async () => {
    await mockDataSource.initialize();
  });

  afterAll(async () => {
    if (mockDataSource.isInitialized) {
      await mockDataSource.destroy();
    }
  });

  beforeEach(async () => {
    const resourceRepository = mockDataSource.getRepository(Resource);
    await resourceRepository.clear();
  });

  describe('POST /api/v1/resources', () => {
    it('should create a new resource', async () => {
      const response = await request(app)
        .post('/api/v1/resources')
        .send({
          name: 'Test Resource',
          description: 'Test Description',
          status: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Resource');
      expect(response.body.description).toBe('Test Description');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/v1/resources')
        .send({
          description: 'Test Description',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });

    it('should return 400 when name is empty', async () => {
      const response = await request(app)
        .post('/api/v1/resources')
        .send({
          name: '',
          description: 'Test Description',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/resources/:id', () => {
    beforeEach(async () => {
      const resourceRepository = mockDataSource.getRepository(Resource);
      const resource = await resourceRepository.save({
        name: 'Test Resource',
        description: 'Test Description',
        status: true,
      });

      createdResourceId = resource.id;
    });

    it('should get a resource by id', async () => {
      const response = await request(app)
        .get(`/api/v1/resources/${createdResourceId}`)
        .expect(200);

      expect(response.body.id).toBe(createdResourceId);
      expect(response.body.name).toBe('Test Resource');
    });

    it('should return 404 when resource not found', async () => {
      const response = await request(app).get('/api/v1/resources/99999').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Resource not found');
    });

    it('should return 400 when id is invalid', async () => {
      const response = await request(app).get('/api/v1/resources/invalid').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid resource ID');
    });
  });

  describe('GET /api/v1/resources', () => {
    beforeEach(async () => {
      const resourceRepository = mockDataSource.getRepository(Resource);

      const testResource = resourceRepository.create({
        name: 'Test Resource',
        description: 'Test Description',
        status: true,
      });
      const saved = await resourceRepository.save(testResource);
      createdResourceId = saved.id;

      await resourceRepository.save([
        { name: 'Apple Product', description: 'Fruit', status: true },
        { name: 'Banana Product', description: 'Fruit', status: false },
        { name: 'Cherry Product', description: 'Fruit', status: true },
      ]);
    });

    it('should get all resources with pagination', async () => {
      const response = await request(app).get('/api/v1/resources').expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should filter resources by name', async () => {
      const response = await request(app).get('/api/v1/resources?name=Apple').expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toContain('Apple');
    });

    it('should filter resources by status', async () => {
      const response = await request(app).get('/api/v1/resources?status=true').expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((resource: any) => {
        expect(resource.status).toBe(true);
      });
    });

    it('should paginate results', async () => {
      const response = await request(app).get('/api/v1/resources?page=1&limit=2').expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(Number(response.body.pagination.page)).toBe(1);
      expect(Number(response.body.pagination.limit)).toBe(2);
    });
  });

  describe('PUT /api/v1/resources/:id', () => {
    beforeEach(async () => {
      const resourceRepository = mockDataSource.getRepository(Resource);
      const resource = await resourceRepository.save({
        name: 'Test Resource',
        description: 'Test Description',
        status: true,
      });

      createdResourceId = resource.id;
    });

    it('should update a resource', async () => {
      const response = await request(app)
        .put(`/api/v1/resources/${createdResourceId}`)
        .send({
          name: 'Updated Resource',
          description: 'Updated Description',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Resource');
      expect(response.body.description).toBe('Updated Description');
    });

    it('should return 404 when updating non-existent resource', async () => {
      const response = await request(app)
        .put('/api/v1/resources/99999')
        .send({
          name: 'Updated Resource',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Resource not found');
    });

    it('should return 400 when id is invalid', async () => {
      const response = await request(app)
        .put('/api/v1/resources/invalid')
        .send({
          name: 'Updated Resource',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/resources/:id', () => {
    beforeEach(async () => {
      const resourceRepository = mockDataSource.getRepository(Resource);
      const resource = await resourceRepository.save({
        name: 'Test Resource',
        description: 'Test Description',
        status: true,
      });

      createdResourceId = resource.id;
    });

    it('should delete a resource', async () => {
      const response = await request(app)
        .delete(`/api/v1/resources/${createdResourceId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Resource deleted successfully');
    });

    it('should return 404 when deleting non-existent resource', async () => {
      const response = await request(app).delete('/api/v1/resources/99999').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Resource not found');
    });

    it('should return 400 when id is invalid', async () => {
      const response = await request(app).delete('/api/v1/resources/invalid').expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/v1/unknown').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Route');
      expect(response.body.message).toContain('not found');
    });
  });
});
