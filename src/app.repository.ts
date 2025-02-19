import { Inject, Injectable } from '@nestjs/common';
import Datastore from 'nedb-promises';

class Movie {
  id: string;
  year: number;
  title: string;
  studios: string;
  producers: string;
  winner: boolean;
}

@Injectable()
export class AppRepository {
  constructor(@Inject('NEDB') private readonly db: Datastore<Movie>) {}

  create(data: {
    year: number;
    title: string;
    studios: string;
    producers: string;
    winner: boolean;
  }) {
    return this.db.insert(data);
  }

  async findAll() {
    return this.db.find({}).sort({ year: 1 });
  }

  async findAllWinners() {
    return this.db.find({ winner: true }).sort({ year: 1 });
  }
}
