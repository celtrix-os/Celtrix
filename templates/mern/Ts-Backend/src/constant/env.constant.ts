import dotenv from 'dotenv';
import { EnvSchema } from '../validator/env.validator';
dotenv.config();

export const env = EnvSchema.parse(process.env);

