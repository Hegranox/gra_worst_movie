import { Test, TestingModule } from '@nestjs/testing';
import { CsvParser } from 'nest-csv-parser';
import path from 'path';
import { AppRepository } from './app.repository';
import { AppService } from './app.service';
import fs from 'fs';
import Datastore from 'nedb-promises';

class Movie {
  id: string;
  year: number;
  title: string;
  studios: string;
  producers: string;
  winner: boolean;
}

describe('AppService', () => {
  let service: AppService;
  let db: Datastore<Movie>;

  const testCsvPath = path.join(__dirname, 'test-movielist.csv');

  beforeEach(async () => {
    db = Datastore.create({ inMemoryOnly: true });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        AppRepository,
        CsvParser,
        {
          provide: 'NEDB',
          useValue: db,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  afterEach(() => {
    if (fs.existsSync(testCsvPath)) {
      fs.unlinkSync(testCsvPath);
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw an error if the CSV file is missing', async () => {
    await expect(service.importMoviesCsvFile(testCsvPath)).rejects.toThrow(
      'Sorry! File not found.',
    );
  });

  it('should log the missing year column error', async () => {
    const csvData = `title;studios;producers;winner
    Title A;Studio A;Producer A;yes`;

    fs.writeFileSync(testCsvPath, csvData);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await service.importMoviesCsvFile(testCsvPath);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        'Sorry! There is some error on the line 1: "year" is required',
      ]),
    );

    consoleSpy.mockRestore();
  });

  it('should log the missing title column error', async () => {
    const csvData = `year;studios;producers;winner
    2000;Studio A;Producer A;yes`;

    fs.writeFileSync(testCsvPath, csvData);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await service.importMoviesCsvFile(testCsvPath);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        'Sorry! There is some error on the line 1: "title" is required',
      ]),
    );

    consoleSpy.mockRestore();
  });

  it('should log the missing studios column error', async () => {
    const csvData = `year;title;producers;winner
    2000;Title A;Producer A;yes`;

    fs.writeFileSync(testCsvPath, csvData);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await service.importMoviesCsvFile(testCsvPath);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        'Sorry! There is some error on the line 1: "studios" is required',
      ]),
    );

    consoleSpy.mockRestore();
  });

  it('should log the missing producers column error', async () => {
    const csvData = `year;title;studios;winner
    2000;Title A;Studio A;yes`;

    fs.writeFileSync(testCsvPath, csvData);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await service.importMoviesCsvFile(testCsvPath);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        'Sorry! There is some error on the line 1: "producers" is required',
      ]),
    );

    consoleSpy.mockRestore();
  });

  it('should log the type error of column "year"', async () => {
    const csvData = `year;title;studios;producers;winner
    A;Title A;Studio A;Producer A;`;

    fs.writeFileSync(testCsvPath, csvData);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await service.importMoviesCsvFile(testCsvPath);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        'Sorry! There is some error on the line 1: "year" must be a number',
      ]),
    );

    consoleSpy.mockRestore();
  });

  it('should import data to the database', async () => {
    const csvData = `year;title;studios;producers;winner
    1990;Title A;Studio A;Producer A;yes
    2000;Title B;Studio B;Producer B;`;

    fs.writeFileSync(testCsvPath, csvData);
    await service.importMoviesCsvFile(testCsvPath);

    const movies = await service.findAll();

    expect(movies).toHaveLength(2);

    expect(movies[0].year).toBe(1990);
    expect(movies[0].title).toBe('Title A');
    expect(movies[0].studios).toBe('Studio A');
    expect(movies[0].producers).toBe('Producer A');
    expect(movies[0].winner).toBe(true);

    expect(movies[1].year).toBe(2000);
    expect(movies[1].title).toBe('Title B');
    expect(movies[1].studios).toBe('Studio B');
    expect(movies[1].producers).toBe('Producer B');
    expect(movies[1].winner).toBe(false);
  });

  it('should find the correct worst award winners (Scenario 1 - No Winners)', async () => {
    const csvData = `year;title;studios;producers;winner
    1995;Shadows Unleashed;Lionsgate;John Smith;no
    1998;The Last Hope;DreamWorks;Jane Doe and John Smith;no
    1999;Frozen Tears;New Line Cinema;Michael Johnson;no
    2002;Dark Abyss;Universal Pictures;Emily White;no
    2005;The Last Symphony;Columbia Pictures;David Black, Emily White and Michael Johnson;no
    2007;Beyond the Horizon;MGM;John Smith;no
    2010;Falling Skies;Warner Bros;Jane Doe;no
    2012;The Silent City;20th Century Fox;Michael Johnson;no
    2013;Whispering Shadows;Amazon Studios;Emily White and Michael Johnson;no
    2015;Crimson Moon;Paramount Pictures;David Black;no
    2016;Nightfall Rising;HBO Films;Jane Doe, John Smith and David Black;no
    2018;Golden Sunset;Netflix Studios;Jane Doe;no
    2020;Endless Journey;Disney;Michael Johnson;no
    2021;The Forgotten Path;Apple Studios;Emily White;no
    2023;Echoes of Time;Sony Pictures;David Black;no`;

    fs.writeFileSync(testCsvPath, csvData);
    await service.importMoviesCsvFile(testCsvPath);

    const result = await service.findGoldenRaspberryAwardsWorstWinners();

    expect(result.min).toHaveLength(0);
    expect(result.max).toHaveLength(0);
  });

  it('should find the correct worst award winners (Scenario 2 - 1 max/min winner)', async () => {
    const csvData = `year;title;studios;producers;winner
    1995;Shadows Unleashed;Lionsgate;John Smith;yes
    1998;The Last Hope;DreamWorks;Jane Doe and John Smith;yes
    1999;Frozen Tears;New Line Cinema;Michael Johnson;no
    2002;Dark Abyss;Universal Pictures;Emily White;no
    2005;The Last Symphony;Columbia Pictures;David Black, Emily White and Michael Johnson;yes
    2007;Beyond the Horizon;MGM;John Smith;no
    2010;Falling Skies;Warner Bros;Jane Doe;no
    2012;The Silent City;20th Century Fox;Michael Johnson;no
    2013;Whispering Shadows;Amazon Studios;Emily White and Michael Johnson;no
    2015;Crimson Moon;Paramount Pictures;David Black;no
    2016;Nightfall Rising;HBO Films;Jane Doe, John Smith and David Black;no
    2018;Golden Sunset;Netflix Studios;Jane Doe;no
    2020;Endless Journey;Disney;Michael Johnson;no
    2021;The Forgotten Path;Apple Studios;Emily White;no
    2023;Echoes of Time;Sony Pictures;David Black;yes`;

    fs.writeFileSync(testCsvPath, csvData);
    await service.importMoviesCsvFile(testCsvPath);

    const result = await service.findGoldenRaspberryAwardsWorstWinners();

    expect(result.min).toHaveLength(1);
    expect(result.max).toHaveLength(1);

    expect(result.min[0].producer).toBe('John Smith');
    expect(result.min[0].interval).toBe(3);
    expect(result.min[0].previousWin).toBe(1995);
    expect(result.min[0].followingWin).toBe(1998);

    expect(result.max[0].producer).toBe('David Black');
    expect(result.max[0].interval).toBe(18);
    expect(result.max[0].previousWin).toBe(2005);
    expect(result.max[0].followingWin).toBe(2023);
  });

  it('should find the correct worst award winners (Scenario 3 - 2 max/min winner)', async () => {
    const csvData = `year;title;studios;producers;winner
    1995;Shadows Unleashed;Lionsgate;John Smith and Jane Doe;yes
    1998;The Last Hope;DreamWorks;Jane Doe and John Smith;yes
    1999;Frozen Tears;New Line Cinema;Michael Johnson;no
    2002;Dark Abyss;Universal Pictures;Emily White;no
    2005;The Last Symphony;Columbia Pictures;David Black, Emily White and Michael Johnson;yes
    2007;Beyond the Horizon;MGM;John Smith;no
    2010;Falling Skies;Warner Bros;Jane Doe;no
    2012;The Silent City;20th Century Fox;Michael Johnson;no
    2013;Whispering Shadows;Amazon Studios;Emily White and Michael Johnson;no
    2015;Crimson Moon;Paramount Pictures;David Black;no
    2016;Nightfall Rising;HBO Films;Jane Doe, John Smith and David Black;no
    2018;Golden Sunset;Netflix Studios;Jane Doe;no
    2020;Endless Journey;Disney;Michael Johnson;no
    2021;The Forgotten Path;Apple Studios;Emily White;no
    2023;Echoes of Time;Sony Pictures;David Black and Michael Johnson;yes`;

    fs.writeFileSync(testCsvPath, csvData);
    await service.importMoviesCsvFile(testCsvPath);

    const result = await service.findGoldenRaspberryAwardsWorstWinners();

    expect(result.min).toHaveLength(2);
    expect(result.max).toHaveLength(2);

    expect(result.min[0].producer).toBe('John Smith');
    expect(result.min[0].interval).toBe(3);
    expect(result.min[0].previousWin).toBe(1995);
    expect(result.min[0].followingWin).toBe(1998);

    expect(result.min[1].producer).toBe('Jane Doe');
    expect(result.min[1].interval).toBe(3);
    expect(result.min[1].previousWin).toBe(1995);
    expect(result.min[1].followingWin).toBe(1998);

    expect(result.max[0].producer).toBe('David Black');
    expect(result.max[0].interval).toBe(18);
    expect(result.max[0].previousWin).toBe(2005);
    expect(result.max[0].followingWin).toBe(2023);

    expect(result.max[1].producer).toBe('Michael Johnson');
    expect(result.max[1].interval).toBe(18);
    expect(result.max[1].previousWin).toBe(2005);
    expect(result.max[1].followingWin).toBe(2023);
  });

  it('should find the correct worst award winners (Scenario 4 - 1 min/3 max same winner)', async () => {
    const csvData = `year;title;studios;producers;winner
    1995;Shadows Unleashed;Lionsgate;John Smith;yes
    1998;The Last Hope;DreamWorks;Jane Doe and John Smith;yes
    1999;Frozen Tears;New Line Cinema;Michael Johnson;no
    2002;Dark Abyss;Universal Pictures;Emily White;no
    2005;The Last Symphony;Columbia Pictures;David Black, Emily White and Michael Johnson;yes
    2007;Beyond the Horizon;MGM;John Smith;no
    2010;Falling Skies;Warner Bros;Jane Doe;no
    2012;The Silent City;20th Century Fox;Michael Johnson;no
    2013;Whispering Shadows;Amazon Studios;Emily White and Michael Johnson;no
    2015;Crimson Moon;Paramount Pictures;David Black;no
    2016;Nightfall Rising;HBO Films;Jane Doe, John Smith and David Black;yes
    2018;Golden Sunset;Netflix Studios;Jane Doe;no
    2020;Endless Journey;Disney;Michael Johnson;no
    2021;The Forgotten Path;Apple Studios;Emily White;no
    2023;Echoes of Time;Sony Pictures;David Black and Michael Johnson;yes`;

    fs.writeFileSync(testCsvPath, csvData);
    await service.importMoviesCsvFile(testCsvPath);

    const result = await service.findGoldenRaspberryAwardsWorstWinners();

    expect(result.min).toHaveLength(1);
    expect(result.max).toHaveLength(3);

    expect(result.min[0].producer).toBe('John Smith');
    expect(result.min[0].interval).toBe(3);
    expect(result.min[0].previousWin).toBe(1995);
    expect(result.min[0].followingWin).toBe(1998);

    expect(result.max[0].producer).toBe('John Smith');
    expect(result.max[0].interval).toBe(18);
    expect(result.max[0].previousWin).toBe(1998);
    expect(result.max[0].followingWin).toBe(2016);

    expect(result.max[1].producer).toBe('Jane Doe');
    expect(result.max[1].interval).toBe(18);
    expect(result.max[1].previousWin).toBe(1998);
    expect(result.max[1].followingWin).toBe(2016);

    expect(result.max[2].producer).toBe('Michael Johnson');
    expect(result.max[2].interval).toBe(18);
    expect(result.max[2].previousWin).toBe(2005);
    expect(result.max[2].followingWin).toBe(2023);
  });
});
