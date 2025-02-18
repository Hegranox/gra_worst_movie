import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('🚀 ~ bootstrap ~ process.env.PORT:', process.env.PORT);
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

// CSV Validator
// https://www.npmjs.com/package/csv-file-validator
