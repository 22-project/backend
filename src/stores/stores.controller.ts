import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { Stores } from './stores.entity';
import * as path from 'path';
import { Public } from '../auth/common/decorators';
import { CacheInterceptor } from 'src/cache/cache.interceptor';
import { CreateStoreDto, CoordinatesDto, storeDto } from './dto';
import { MyLocation } from './types';
@Controller('stores')
export class StoresController {
  constructor(private storesService: StoresService) {}

  @UseInterceptors(CacheInterceptor)
  @Public()
  @Get('/hot')
  async hotPlaces(): Promise<any[]> {
    try {
      return await this.storesService.getHotPlaces();
    } catch (err) {
      throw err;
    }
  }

  @Public()
  @UseInterceptors(CacheInterceptor)
  @Post('/nearby-stores-rough')
  async getNearbyStoresRough(
    @Body() coordinates: CoordinatesDto,
    @Query('sort')
    sortBy?: 'distance' | 'name' | 'waitingCnt' | 'waitingCnt2' | 'rating',
  ): Promise<{ 근처식당목록: storeDto[] }> {
    try {
      const { swLatlng, neLatlng } = coordinates;

      //console.log(swLatlng.La, swLatlng.Ma, neLatlng.La, neLatlng.Ma);
      //geolocation 받고 그 가운데에 user위치;

      const stores = await this.storesService.getNearByStoresRough(
        swLatlng.Ma,
        swLatlng.La,
        neLatlng.Ma,
        neLatlng.La,
        sortBy,
      );
      return stores;
    } catch (err) {
      throw err;
    }
  }

  //elastic 주식탐
  @Public()
  @UseInterceptors(CacheInterceptor)
  @Post('/nearby-stores-elastic')
  async getNearbyStoresWithElastic(
    @Body() coordinates: CoordinatesDto,
    @Query('a') sort: 'ASC' | 'DESC' = 'ASC',
    @Query('b') column: string,
    @Query('c') page: number,
  ): Promise<any[]> {
    try {
      const { swLatlng, neLatlng, myLatitude, myLongitude } = coordinates;
      const stores = await this.storesService.getNearbyStoresWithElastic(
        sort,
        column,
        page,
        swLatlng.Ma,
        swLatlng.La,
        neLatlng.Ma,
        neLatlng.La,
        myLatitude,
        myLongitude,
      );
      return stores;
    } catch (err) {
      throw err;
    }
  }

  //elastic, api/stores/search?keyword=햄버거 간단한 검색기능
  @Public()
  @UseInterceptors(CacheInterceptor)
  @Post('/search')
  async searchStoresWithElastic(
    @Body() myLocation: MyLocation,
    @Query('keyword') keyword: string,
    @Query('b') sort: 'ASC' | 'DESC' = 'ASC',
    @Query('a') column: string,
  ): Promise<storeDto[]> {
    try {
      return await this.storesService.searchStoresWithElastic(
        keyword,
        sort,
        column,
        myLocation.myLatitude,
        myLocation.myLongitude,
      );
    } catch (err) {
      throw err;
    }
  }

  //Redis로 상세조회 (정보+댓글)
  @UseInterceptors(CacheInterceptor)
  @Public()
  @Get('/:storeId')
  async getOneStore(
    @Param('storeId', ParseIntPipe) storeId: number,
  ): Promise<storeDto> {
    try {
      return await this.storesService.getOneStore(storeId);
    } catch (err) {
      throw err;
    }
  }

  // 상점 추가
  @Public()
  @Post('/')
  @UsePipes(ValidationPipe)
  async createStore(@Body() createStoreDto: CreateStoreDto): Promise<Stores> {
    try {
      return await this.storesService.createStore(createStoreDto);
    } catch (err) {
      throw err;
    }
  }

  //CSV파일 postgres 업로드
  @Public()
  @Post('/process')
  async processCSV(): Promise<void> {
    try {
      const inputFile = path.resolve('src/stores/csv/111.csv');
      await this.storesService.processCSVFile(inputFile);
    } catch (err) {
      throw err;
    }
  }

  //주소로 카카오에서 좌표 받아서 postgres업데이트
  @Public()
  @Post('/update-coordinates')
  async updateCoordinates(): Promise<string> {
    try {
      await this.storesService.updateCoordinates();
      return 'Coordinates updated successfully';
    } catch (err) {
      throw err;
    }
  }
}

//카카오맵api 연동
// @Get('/:query')
//   async searchPlaces(@Param('query') query: string): Promise<any> {
//     const userLocation = await this.locationService.getCoordinatesOfIpAddress();

//     return await this.storesService.searchPlaces(query, userLocation);
//   }

// //postgres 의 coordinate 값을 채우는 api
// @Public()
// @Post('/fill-coordinates')
// async fillCoordinates() {
//   await this.storesService.fillCoordinates();
// }

// // Redis로 postgres 의 storeId 와 LA,MA 를 redis 에 저장
// @Public()
// @Post('/to-redis')
// async addStoresToRedis(): Promise<void> {
//   return await this.storesService.addStoresToRedis();
// }

// // Redis로 주식탐, 좌하단 우상단 좌표 내의 음식점 조회
// @Public()
// @Post('/nearby-stores-redis')
// async getNearbyStoresByBox(
//   @Body()
//   coordinates: {
//     swLatlng: { La: number; Ma: number };
//     neLatlng: { La: number; Ma: number };
//   },
//   @Query('sort')
//   sortBy?: 'distance' | 'name' | 'waitingCnt' | 'waitingCnt2' | 'rating',
// ) {
//   const stores = await this.storesService.getNearbyStoresByBox(
//     coordinates,
//     sortBy,
//   );
//   return stores;
// }
