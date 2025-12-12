import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set the global prefix for all routes (e.g., /api/history/transactions)
  app.setGlobalPrefix('api');

  // Enable CORS to allow the React frontend to communicate with the backend
  app.enableCors({
    // Allow requests only from your local React development server
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,POST,OPTIONS',
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
