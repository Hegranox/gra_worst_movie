import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  importMoviesCsvFile() {
    return this.appService.importMoviesCsvFile();
  }

  @Get('/list')
  list() {
    return this.appService.findAll();
  }
}
