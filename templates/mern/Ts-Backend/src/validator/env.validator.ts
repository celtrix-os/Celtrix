import { z } from 'zod';

export const EnvSchema = z.object({
  PORT: z.string().default('5000'),
  HOST: z.string().default('localhost'),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  CORS_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  RATE_LIMIT_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  CLIENT_URL: z.string().url().default('http://localhost:5137'),

  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRATION: z.string().default('7d'),
  
  DB_NAME: z.string().min(1, "DB_NAME is required"),
  DB_CONNECTION_STRING: z.string().min(1, "DB_CONNECTION_STRING is required"),
  
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional().default(''),
  
  UPLOAD_DIR: z.string().default('./uploads'),
  TEMP_DIR: z.string().default('./temp'),
  MAX_FILE_SIZE: z.string()
    .regex(/^\d+[kmgt]?b$/i, "MAX_FILE_SIZE must be in format like '10mb', '1gb'")
    .default('10mb'),
});