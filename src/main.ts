// src/main.ts (NestJS Backend)

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const allowedOrigins = [
    'http://localhost:5173', // Your React Frontend local dev server
    'https://unallied-viscerally-rebecka.ngrok-free.dev', // YOUR NGROK PUBLIC URL
  ];

  app.enableCors({
    origin: allowedOrigins,
    // Ensure OPTIONS, GET, and POST (for the transfer form) are all allowed.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  const port = process.env.PORT || 3000;

  // Start the application
  await app.listen(port, () => {
    console.log(`🚀 NestJS application listening on port ${port}`);
    console.log(`Node environment: ${process.env.NODE_ENV}`);
  });
}

bootstrap();
