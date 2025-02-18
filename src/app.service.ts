import { BadRequestException, Injectable } from '@nestjs/common';
import fs from 'fs';
import { CsvParser, ParsedData } from 'nest-csv-parser';
import path from 'path';
import { AppRepository } from './app.repository';

class CSVEntity {
  year: string;
  title: string;
  studios: string;
  producers: string;
  winner: 'yes' | '';
}

type Entity = {
  index: number;
  year: string;
  title: string;
  studios: string;
  producers: string;
  winner: 'yes' | '';
};

type CsvParseResult = ParsedData<InstanceType<typeof CSVEntity>>;

@Injectable()
export class AppService {
  constructor(
    private readonly appRepository: AppRepository,
    private readonly csvParser: CsvParser,
  ) {}

  async importMoviesCsvFile() {
    const csvFilePath = path.join(__dirname, 'assets', 'movielist.csv');

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

    for (const entity of entities.list) {
      index++;

      const errorsFound = this.validateCsvEntity({ ...entity, index });

      if (errorsFound.length) {
        errors.push(...errorsFound);
        continue;
      }

      await this.appRepository.create({
        ...entity,
        year: Number(entity.year),
        winner: entity.year === 'yes',
      });
    }
  }

  private validateCsvEntity(entity: Entity) {
    const errorsFound: string[] = [];

    if (!entity.year) {
      errorsFound.push(
        `Sorry! I could not find the property 'year' in the line ${entity.index}`,
      );
    }

    if (!entity.title) {
      errorsFound.push(
        `Sorry! I could not find the property 'title' in the line ${entity.index}`,
      );
    }

    if (!entity.studios) {
      errorsFound.push(
        `Sorry! I could not find the property 'studios' in the line ${entity.index}`,
      );
    }

    if (!entity.producers) {
      errorsFound.push(
        `Sorry! I could not find the property 'producers' in the line ${entity.index}`,
      );
    }

    if (errorsFound.length) {
      return errorsFound;
    }

    if (!Number(entity.year)) {
      errorsFound.push(
        `Sorry! The property 'year' has wrong type value in the line ${entity.index}`,
      );
    }

    return errorsFound;
  }

  findAll() {
    return this.appRepository.findAll();
  }
}
