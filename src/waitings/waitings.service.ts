import { StoresRepository } from './../stores/stores.repository';
import { Users } from 'src/auth/users.entity';
import { WaitingStatus } from './waitingStatus.enum';
import { Waitings } from './waitings.entity';
import { WaitingsRepository } from './waitings.repository';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TablesRepository } from 'src/tables/tables.repository';
import { InjectQueue } from '@nestjs/bull/dist/decorators';
import { Job, Queue } from 'bull';
@Injectable()
export class WaitingsService {
  constructor(
    @InjectQueue('waitingQueue')
    private waitingQueue: Queue,
    private waitingsRepository: WaitingsRepository,
    private storesRepository: StoresRepository,
    private tablesRepository: TablesRepository,
  ) {}

  // async addMessageQueue(
  //   storeId: number,
  //   peopleCnt: number,
  //   user: Users,
  // ): Promise<void> {
  //   const existsStore = await this.storesRepository.findOne({
  //     where: { storeId },
  //   });
  //   if (!existsStore) {
  //     throw new NotFoundException('음식점이 존재하지 않습니다');
  //   }
  //   const existsUser = await this.waitingsRepository.getWaitingByUser(user);
  //   if (existsUser) {
  //     throw new ConflictException('이미 웨이팅을 신청하셨습니다');
  //   }
  //   await this.waitingQueue.add('createWaiting', {
  //     storeId,
  //     peopleCnt,
  //     user,
  //   });
  //   return;
  // }

  async getCurrentWaitingsCnt(storeId: number): Promise<number> {
    const existsStore = await this.storesRepository.findOne({
      where: { storeId },
    });
    if (!existsStore) {
      throw new NotFoundException('음식점이 존재하지 않습니다');
    }
    const job = await this.waitingQueue.add('getCurrentWaitingCnt', storeId);
    const result = await job.finished();
    return result;
  }

  async getWaitingList(storeId: number, user: Users): Promise<Waitings[]> {
    if (user.StoreId !== storeId) {
      throw new UnauthorizedException('권한이 없습니다.');
    }
    const existsStore = await this.storesRepository.findOne({
      where: { storeId },
    });
    if (!existsStore) {
      throw new NotFoundException('음식점 존재하지 않습니다');
    }
    return this.waitingsRepository.getWaitingListById(storeId);
  }

  // 음식점이 꽉 차있는 경우 웨이팅 신청
  async postWaitings(
    storeId: number,
    peopleCnt: number,
    user: Users,
  ): Promise<void> {
    const existsStore = await this.storesRepository.findOne({
      where: { storeId },
    });
    if (!existsStore) {
      throw new NotFoundException('음식점이 존재하지 않습니다');
    }
    const existsUser = await this.waitingsRepository.getWaitingByUser(user);
    if (existsUser) {
      throw new ConflictException('이미 웨이팅을 신청하셨습니다');
    }
    this.waitingQueue.add('postWaiting', { storeId, peopleCnt, user });
    return;
  }

  // 가게에 자리가 있어 바로
  async postEntered(
    storeId: number,
    peopleCnt: number,
    user: Users,
  ): Promise<void> {
    const existsStore = await this.storesRepository.findOne({
      where: { storeId },
    });
    if (!existsStore) {
      throw new NotFoundException('음식점이 존재하지 않습니다');
    }
    if (user.StoreId !== storeId) {
      throw new UnauthorizedException('권한이 없습니다');
    }
    const existsUser = await this.waitingsRepository.getWaitingByUser(user);
    if (existsUser) {
      throw new ConflictException('이미 웨이팅을 신청하셨습니다');
    }
    this.waitingsRepository.postEntered(storeId, peopleCnt, user);
    this.tablesRepository.decrementTables(storeId, peopleCnt);
    return;
  }

  async patchStatusOfWaitings(
    storeId: number,
    waitingId: number,
    status: WaitingStatus,
    user: Users,
  ): Promise<void> {
    if (user.StoreId !== storeId) {
      throw new UnauthorizedException('권한이 없습니다');
    }
    const existsStore = await this.storesRepository.findOne({
      where: { storeId },
    });
    if (!existsStore) {
      throw new NotFoundException('음식점이 존재하지 않습니다');
    }
    const existsUser = await this.waitingsRepository.getWaitingByUser(user);
    if (!existsUser) {
      throw new ConflictException('웨이팅이 존재하지 않습니다');
    }

    if (status === 'EXITED') {
      this.waitingsRepository.patchToExited(storeId, waitingId);
      const waiting = await this.waitingsRepository.getWaitingById(waitingId);
      this.tablesRepository.incrementTables(storeId, waiting.peopleCnt);
      return;
    } // 퇴장 처리를 하고 그 인원수에 맞는 대기열을 CALLED 처리 한다 => 매장용

    if (status === 'DELAYED') {
      this.waitingsRepository.patchToDelayed(storeId, waitingId);
      return;
    } // 최근의 CALLED 된 사람을 DELAYED 로 바꾸고 다음 사람을 CALLED 한다 => 매장용

    if (status === 'ENTERED') {
      this.waitingsRepository.patchToEntered(storeId, waitingId, status);
      const waiting = await this.waitingsRepository.getWaitingById(waitingId);
      this.tablesRepository.decrementTables(storeId, waiting.peopleCnt);
      return;
    } // DELAYED, CALLED, WAITING 을 ENTERED 로 바꾸고 입장시킨다 => 매장용
  }

  async patchStatusToCanceled(
    storeId: number,
    waitingId: number,
    user: Users,
  ): Promise<void> {
    const existsStore = await this.storesRepository.findOne({
      where: { storeId },
    });
    if (!existsStore) {
      throw new NotFoundException('음식점이 존재하지 않습니다');
    }
    const existsUser = await this.waitingsRepository.getWaitingByUser(user);
    if (!existsUser) {
      throw new ConflictException('웨이팅이 존재하지 않습니다');
    }
    this.waitingsRepository.patchToCanceled(storeId, waitingId);
    return;
  }

  async checkAndPatchNoshow(): Promise<void> {
    console.log('실행중');
    const delayed = await this.waitingsRepository.getAllDelayed();
    delayed.forEach((entity) => {
      const currentTime = new Date();
      const updatedAt = entity.updatedAt;
      const timePassed = Math.floor(
        (currentTime.getTime() - updatedAt.getTime()) / 1000 / 60,
      );

      if (timePassed >= 10) {
        entity.status = WaitingStatus.NOSHOW;
        this.waitingsRepository.save(entity);
        console.log(
          `waitingId ${entity.waitingId}의 상태가 NOSHOW가 되었습니다`,
        );
      }
    });
    return;
  }

  async getWaitingTime(
    storeId: number,
    waitingId: number,
    user: Users,
  ): Promise<number> {
    const existsStore = await this.storesRepository.findOne({
      where: { storeId },
    });
    if (!existsStore) {
      throw new NotFoundException('음식점이 존재하지 않습니다');
    }
    const existsUser = await this.waitingsRepository.getWaitingByUser(user);
    if (!existsUser) {
      throw new ConflictException('웨이팅이 존재하지 않습니다');
    }

    const cycleTime = await this.storesRepository.getCycleTimeByStoreId(
      storeId,
    );

    const peopleCnt = await this.waitingsRepository.getPeopleCnt(
      storeId,
      waitingId,
      user,
    ); // 대기를 건 사람의 수

    const tableCnt = await this.waitingsRepository.getTableTotalCnt(
      storeId,
      peopleCnt,
    ); // 사람 수에 맞는 테이블의 갯수

    const waitingPeople: Waitings[] =
      await this.waitingsRepository.getWaitingsStatusWaiting(
        storeId,
        peopleCnt,
      );
    const waitingIdsArr = waitingPeople.map((e) => e.waitingId);

    // status 가 WAITING 인 사람 중에서 내가 몇등인지
    const myTurn = waitingIdsArr.indexOf(Number(waitingId)) + 1;

    const enteredPeople: Waitings[] =
      await this.waitingsRepository.getWaitingsStatusEntered(
        storeId,
        peopleCnt,
      );

    if (tableCnt > enteredPeople.length || enteredPeople.length === 0) {
      return 0;
    }

    const bigCycle = Math.ceil(myTurn / enteredPeople.length); // 기다리는 사람들을 매장에 있는 사람들로 나눈 몫
    const left = myTurn % enteredPeople.length; // 그 나머지

    const leftCnt: number = left === 0 ? enteredPeople.length : left;

    console.log(bigCycle, leftCnt);

    const currentTime = new Date();
    const updatedTime = enteredPeople[leftCnt - 1].updatedAt;

    // 내가 앉을 테이블에 앉은 사람이 먹은지 몇분 됐는지
    const prePersonEatingTime = Math.floor(
      (currentTime.getTime() - updatedTime.getTime()) / 1000 / 60,
    );
    console.log(
      '해당 테이블에 있는 사람이 입장한지 몇분 지났는지?',
      prePersonEatingTime,
    );

    return bigCycle * cycleTime - prePersonEatingTime;
  }
}
