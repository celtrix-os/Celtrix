import mongoose from 'mongoose';
import { env } from '../constant/env.constant';

const connectDB = async ()  => {
  try {
   const conn =  await mongoose.connect(env.DB_CONNECTION_STRING, {
      dbName: env.DB_NAME,
      autoIndex: env.NODE_ENV !== 'production',
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};


export default connectDB;