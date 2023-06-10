import { TablesRepository } from './../tables/tables.repository';
import { Injectable } from '@nestjs/common';
import { Repository, ILike } from 'typeorm';
import { Stores } from './stores.entity';
import { StoresSearchDto } from './dto/search-stores.dto';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateStoresDto } from './dto/create-stores.dto';

// @Injectable()
// export class StoresRepository extends Repository<Stores, Tables> {
//   // constructor(dataSource: DataSource) {
//   //   super(Stores, dataSource.createEntityManager());
//   // }
//   constructor(
//     @InjectRepository(Stores) private storesDataSource: DataSource,
//     @InjectRepository(Tables) private tablesDataSource: DataSource,
//   ) {
//     super(
//       [Stores, Tables],
//       [storesDataSource.manager, tablesDataSource.manager],
//     );
//   }

@Injectable()
export class StoresRepository {
  // extends Repository<Stores> {
  // constructor(
  //   @InjectRepository(TablesRepository)
  //   private tablesRepository: TablesRepository,
  //   dataSource: DataSource,
  // ) {
  //   super(Stores, dataSource.createEntityManager());
  // }

  constructor(
    @InjectRepository(Stores) private stores: Repository<Stores>,
    @InjectRepository(TablesRepository)
    private tablesRepository: TablesRepository,
  ) {}

  //사용자 위치 기반 반경 1km내의 식당 조회를 위해 전체 데이터 조회
  async findAll(): Promise<Stores[]> {
    const result = await this.stores.find({ order: { storeId: 'ASC' } });
    // order: { storeId: 'ASC' },
    // console.log(result); 잘 읽히는것 확인
    return result;
  }

  async searchStores(keyword: string): Promise<StoresSearchDto[]> {
    const searchStores = await this.stores.find({
      select: ['storeId', 'storeName', 'category', 'maxWaitingCnt', 'address'],
      where: [
        { storeName: ILike(`%${keyword}%`) },
        { category: ILike(`%${keyword}%`) },
        { address: ILike(`%${keyword}%`) },
      ],
    });
    //ILIKE = case insensitive
    return searchStores;
  }

  async getCycleTimeByStoreId(storeId: number): Promise<number> {
    const store = await this.stores.findOne({
      where: { storeId },
    });
    return store.cycleTime;
  }

  //CSV 저장
  async processCSVFile(rows: any): Promise<void> {
    for (const rowData of rows) {
      {
        const La = 0;
        const Ma = 0;
        const description = 'string';
        const maxWaitingCnt = 0;
        const currentWaitingCnt = 0;
        const tableForTwo = Math.floor(Math.random() * 10);
        const tableForFour = Math.floor(Math.random() * 10);
        const storeName = rowData['사업장명'];
        const category = rowData['위생업태명'];
        const address = rowData['도로명전체주소'];
        const oldAddress = rowData['소재지전체주소'];

        const store = this.stores.create({
          storeName,
          description,
          maxWaitingCnt,
          currentWaitingCnt,
          La,
          Ma,
          tableForFour,
          tableForTwo,
          category,
          address,
          oldAddress,
        });

        try {
          const result = await this.stores.save(store);
          this.tablesRepository.createTable(result);
          console.log('Inserted', result, 'row:', store);
        } catch (error) {
          console.error('Error occurred during insert:', error);
        }
      }
    }
  }
  //좌표를 위한 주소와 아이디
  async getStoreAddressId() {
    return await this.stores.find({
      select: ['storeId', 'address', 'oldAddress'],
      where: { Ma: 0, La: 0 },
      order: { storeId: 'ASC' },
    });
  }
  //주소 넣고 좌표
  async getCoordinate(address: string): Promise<any> {
    try {
      if (!address) {
        return null;
      }
      const url =
        'https://dapi.kakao.com/v2/local/search/address.json?query=' +
        encodeURIComponent(address);
      // const restApiKey = '800b8fe2427efbffbef3bc6fe96a5464';
      const restApiKey = `${process.env.KAKAO_REST_API_KEY}`;
      const headers = { Authorization: 'KakaoAK ' + restApiKey };

      const response = await axios.get(url, { headers });

      const result = response.data;

      if (result.documents.length !== 0) {
        const resultAddress = result.documents[0].address;
        const coordinates = [resultAddress.y, resultAddress.x];

        return coordinates;
      } else {
        return null;
      }
    } catch (error) {
      throw new Error(
        'Error fetching coordinates from Kakao API: ' + error.message,
      );
    }
  }
  //저장
  async updateCoord(La: number, Ma: number, storeId: number): Promise<any> {
    await this.stores.update(storeId, { La, Ma });
  }

  async findStoreById(storeId: number): Promise<Stores> {
    return await this.stores.findOne({ where: { storeId } });
  }

  async updateRating(storeId: number, rating: number): Promise<void> {
    await this.stores.update(storeId, { rating });
  }

  async decrementCurrentWaitingCnt(storeId: number): Promise<void> {
    this.stores.decrement({ storeId }, 'currentWaitingCnt', 1);
    return;
  }

  async incrementCurrentWaitingCnt(storeId: number): Promise<void> {
    this.stores.increment({ storeId }, 'currentWaitingCnt', 1);
    return;
  }

  async getOneStore(storeId: number): Promise<Stores> {
    const store = await this.stores.findOne({
      where: { storeId },
      relations: ['reviews'],
    });

    return store;
  }

  async createStore(createStoreDto: CreateStoresDto): Promise<Stores> {
    const {
      storeName,
      category,
      description,
      maxWaitingCnt,
      currentWaitingCnt,
      Ma,
      La,
      tableForTwo,
      tableForFour,
    } = createStoreDto;

    const store = this.stores.create({
      storeName,
      category,
      description,
      maxWaitingCnt,
      currentWaitingCnt,
      Ma,
      La,
      tableForTwo,
      tableForFour,
    });

    await this.stores.save(store);

    return store;
  }
}
