import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/list-all')
  findAll() {
    return this.appService.findAll();
  }

  @Get('/find-gra-worst-winners')
  findGoldenRaspberryAwardsWorstWinners() {
    return this.appService.findGoldenRaspberryAwardsWorstWinners();
  }
}
