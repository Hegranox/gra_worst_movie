import { Inject, Injectable } from '@nestjs/common';
import Datastore from 'nedb-promises';
import { Movie } from './entities/movie.entity';
import CreateMovieDto from './dto/create-movie.dto';
import { v7 as uuidV7 } from 'uuid';

@Injectable()
export class AppRepository {
  constructor(@Inject('NEDB') private readonly db: Datastore<Movie>) {}

  create(data: CreateMovieDto) {
    const newMovie = { ...data, id: uuidV7() };
    return this.db.insert(newMovie);
  }

  async findAll() {
    const movies = await this.db.find({});
    return movies;
  }
}
