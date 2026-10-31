import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './modules/app/app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Transactional Outbox API')
    .setDescription(
      'Transactional Outbox with RabbitMQ and PostgreSQL API. Exposes productor management and inspection of the outbox events that carry productor changes to RabbitMQ.',
    )
    .setVersion('1.0')
    .setExternalDoc(
      'Repository',
      'https://github.com/marcusgajozo/node-transactional-outbox-with-rabbitmq',
    )
    .addTag('app', 'Service health')
    .addTag('productors', 'Productor management')
    .addTag('outbox-productor', 'Outbox event inspection')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const configService = app.get(ConfigService);
  await app.listen(Number(configService.get('PORT') ?? 3000));
}
await bootstrap();
