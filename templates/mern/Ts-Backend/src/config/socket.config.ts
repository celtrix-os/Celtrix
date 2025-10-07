//  Your Socket Config Code Goes Here

import { Server  , Socket} from 'socket.io';
import http from 'http';
import app from '../app';
import { env } from '../constant/env.constant';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CLIENT_URL,
    methods: ['GET', 'POST' , 'PUT' , 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 200,
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
    preflightContinue: false,
    
 
  },
});

io.on('connection', (socket : Socket ) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

export { server, io };