import { server } from './src/config/socket.config';
import { env } from './src/constant/env.constant';
import connectDB from './src/config/db.config';

server.listen(env.PORT, async() => {
  
 await connectDB();

  console.log(
    `Server is running on http://${env.HOST}:${env.PORT} in ${env.NODE_ENV} mode`,
  );
});
