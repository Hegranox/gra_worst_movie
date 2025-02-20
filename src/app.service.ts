import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import fs from 'fs';
import { groupBy } from 'lodash';
import { CsvParser, ParsedData } from 'nest-csv-parser';
import path from 'path';
import { AppRepository } from './app.repository';
import Joi from 'joi';

class CSVEntity {
  year: string;
  title: string;
  studios: string;
  producers: string;
  winner: 'yes' | '';
}

type Movie = {
  id: string;
  year: number;
  title: string;
  studios: string;
  producers: string;
  winner: boolean;
};

type CsvParseResult = ParsedData<InstanceType<typeof CSVEntity>>;

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly appRepository: AppRepository,
    private readonly csvParser: CsvParser,
  ) {}

  async onModuleInit() {
    const csvFilePath = path.join(__dirname, 'assets', 'movielist.csv');
    await this.importMoviesCsvFile(csvFilePath);
  }

  async importMoviesCsvFile(csvFilePath: string) {
    try {
      fs.readFileSync(csvFilePath);
    } catch {
      throw new BadRequestException('Sorry! File not found.');
    }

    const csvFileStream = fs.createReadStream(csvFilePath);

    const entities = (await this.csvParser.parse(
      csvFileStream,
      CSVEntity,
      undefined,
      undefined,
      { strict: true, separator: ';' },
    )) as CsvParseResult;

    let index = 0;
    const errors: string[] = [];

    const ValidatorSchema = Joi.object({
      year: Joi.number().required(),
      title: Joi.string().required(),
      studios: Joi.string().required(),
      producers: Joi.string().required(),
      winner: Joi.string().empty('').default('no'),
    });

    for (const entity of entities.list) {
      index++;

      const { error } = ValidatorSchema.validate(entity);

      if (error) {
        errors.push(
          `Sorry! There is some error on the line ${index}: ${error.message}`,
        );
        continue;
      }

      await this.appRepository.create({
        ...entity,
        year: Number(entity.year),
        winner: entity.winner === 'yes',
      });
    }

    if (errors.length) {
      console.log(errors);
    }
  }

  findAll() {
    return this.appRepository.findAll();
  }

  async findGoldenRaspberryAwardsWorstWinners() {
    const winners: Movie[] = [];

    const winnersWithAtLeast2Awards: {
      producer: string;
      interval: number;
      previousWin: number;
      followingWin: number;
    }[] = [];

    const data = await this.appRepository.findAllWinners();

    for (const winner of data) {
      if (!winner.producers.includes('and')) {
        winners.push(winner);
        continue;
      }

      const producers = winner.producers
        .split(',')
        .flatMap((p) => p.trim().split(/\s+and\s+/));

      for (const producer of producers) {
        winners.push({
          ...winner,
          producers: producer,
        });
      }
    }

    const winnersGroupedByProducers = groupBy(winners, 'producers');

    Object.keys(winnersGroupedByProducers)
      .filter((key) => winnersGroupedByProducers[key].length > 1)
      .forEach((key) => {
        const movies = winnersGroupedByProducers[key].sort(
          (a, b) => a.year - b.year,
        );

        for (let i = 0; i < movies.length - 1; i++) {
          const currentWin = movies[i];
          const nextWin = movies[i + 1];

          winnersWithAtLeast2Awards.push({
            producer: key,
            interval: nextWin.year - currentWin.year,
            previousWin: currentWin.year,
            followingWin: nextWin.year,
          });
        }
      });

    if (!winnersWithAtLeast2Awards.length) {
      return {
        min: [],
        max: [],
      };
    }

    const groupByWinRate = groupBy(winnersWithAtLeast2Awards, 'interval');
    const intervals = Object.keys(groupByWinRate)
      .map(Number)
      .sort((a, b) => a - b);

    const min = groupByWinRate[intervals[0]];
    const max = groupByWinRate[intervals[intervals.length - 1]];

    return {
      min,
      max,
    };
  }
}
