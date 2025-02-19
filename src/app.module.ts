import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppRepository } from './app.repository';
import { CsvModule } from 'nest-csv-parser';
import { ConfigModule } from '@nestjs/config';
import Datastore from 'nedb-promises';

@Module({
  imports: [ConfigModule.forRoot(), CsvModule],
  controllers: [AppController],
  providers: [
    AppService,
    AppRepository,
    {
      provide: 'NEDB',
      useFactory: () => {
        return Datastore.create({ autoload: true });
      },
    },
  ],
})
export class AppModule {}
