import { Module } from '@nestjs/common';

import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stores } from './stores.entity';
import { StoresRepository } from './stores.repository';
import { LocationService } from '../location/location.service';
import { Tables } from '../tables/tables.entity';
import { TablesRepository } from '../tables/tables.repository';
import { ReviewsRepository } from '../reviews/reviews.repository';
import { Reviews } from '../reviews/reviews.entity';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { CustomCacheModule } from 'src/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stores, Tables, Reviews]),
    ElasticsearchModule.register({
      node: 'http://localhost:9200',
      maxRetries: 10,
      requestTimeout: 60000,
      pingTimeout: 60000,
      sniffOnStart: true,
    }),
    CustomCacheModule,
  ],
  controllers: [StoresController],
  providers: [
    StoresService,
    LocationService,
    StoresRepository,
    TablesRepository,
    ReviewsRepository,
  ],
})
export class StoresModule {}
