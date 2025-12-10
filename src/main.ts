import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3000;

  // Start the application
  await app.listen(port, () => {
    console.log(`🚀 NestJS application listening on port ${port}`);
    console.log(`Node environment: ${process.env.NODE_ENV}`);
  });
}

bootstrap();
