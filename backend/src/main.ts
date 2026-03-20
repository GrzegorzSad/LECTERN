import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as pgSession from 'connect-pg-simple';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const PgStore = pgSession(session);

  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
      }),
      secret: process.env.SESSION_SECRET || 'supersecret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        secure: true,
        sameSite: 'none',
        httpOnly: true,
      },
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('LECTERN')
    .setDescription('Backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  fs.writeFileSync('swagger.json', JSON.stringify(document, null, 2));

  await app.listen(3000);
}
bootstrap();
