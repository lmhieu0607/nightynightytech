import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Resource API',
      version: '1.0.0',
      description: 'A REST API for managing resources with full CRUD operations',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
    tags: [
      {
        name: 'Resources',
        description: 'Resource management endpoints',
      },
      {
        name: 'Health',
        description: 'Health check endpoint',
      },
    ],
    components: {
      schemas: {
        ResourceResponse: {
          type: 'object',
          required: ['id', 'name', 'status'],
          properties: {
            id: {
              type: 'integer',
              description: 'Resource ID',
              example: 1,
            },
            name: {
              type: 'string',
              description: 'Resource name',
              maxLength: 255,
              example: 'My Resource',
            },
            description: {
              type: 'string',
              description: 'Resource description',
              nullable: true,
              example: 'This is a sample resource',
            },
            status: {
              type: 'boolean',
              description: 'Resource status',
              default: true,
              example: true,
            },
          },
        },
        CreateResourceDto: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              description: 'Resource name',
              maxLength: 255,
              example: 'New Resource',
            },
            description: {
              type: 'string',
              description: 'Resource description',
              example: 'This is a new resource',
            },
            status: {
              type: 'boolean',
              description: 'Resource status',
              default: true,
              example: true,
            },
          },
        },
        UpdateResourceDto: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Resource name',
              maxLength: 255,
              example: 'Updated Resource',
            },
            description: {
              type: 'string',
              description: 'Resource description',
              example: 'This is an updated resource',
            },
            status: {
              type: 'boolean',
              description: 'Resource status',
              example: false,
            },
          },
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ResourceResponse',
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  example: 1,
                },
                limit: {
                  type: 'integer',
                  example: 10,
                },
                total: {
                  type: 'integer',
                  example: 100,
                },
                totalPages: {
                  type: 'integer',
                  example: 10,
                },
              },
            },
          },
        },
        SuccessResponse: {
          $ref: '#/components/schemas/ResourceResponse',
        },
        DeleteSuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Resource deleted successfully',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                  message: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
