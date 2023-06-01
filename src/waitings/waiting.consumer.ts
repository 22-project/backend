import { WaitingsRepository } from './waitings.repository';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Waitings } from './waitings.entity';

@Processor('waitingQueue')
export class WaitingConsumer {
  constructor(private readonly waitingsRepository: WaitingsRepository) {}

  @Process('getCurrentWaitingCnt')
  async getCurrentWaitingCnt(job: Job): Promise<number> {
    const { storeId } = job.data;
    console.log(`${job.id}의 작업을 수행하였습니다`);
    return await this.waitingsRepository.getCurrentWaitingCnt(storeId);
  }

  @Process('postWaiting')
  async getMessageQueue(job: Job): Promise<void> {
    const { storeId, peopleCnt, user } = job.data;
    console.log(`${job.id}의 작업을 수행하였습니다`);
    await this.waitingsRepository.postWaitings(storeId, peopleCnt, user);
    return;
  }

  @Process('postEntered')
  async postEntered(job: Job): Promise<void> {
    const { storeId, userId, peopleCnt } = job.data;
    console.log(`${job.id}의 작업을 수행하였습니다`);
    await this.waitingsRepository.postEntered(storeId, userId, peopleCnt);
    return;
  }

  @Process('getWaitingListById')
  async getWaitingList(job: Job): Promise<Waitings[]> {
    const { storeId } = job.data;
    console.log(`${job.id}의 작업을 수행하였습니다`);
    return await this.waitingsRepository.getWaitingListById(storeId);
  }

  @Process('patchToExited')
  async patchToExited(job: Job): Promise<void> {
    const { storeId, waitingId } = job.data;
    console.log(`${job.id}의 작업을 수행하였습니다`);
    await this.waitingsRepository.patchToExited(storeId, waitingId);
    return;
  }

  @Process('patchToDelayed')
  async patchToDelayed(job: Job): Promise<void> {
    const { storeId, waitingId } = job.data;
    console.log(`${job.id}의 작업을 수행하였습니다`);
    await this.waitingsRepository.patchToDelayed(storeId, waitingId);
    return;
  }

  @Process('patchToEntered')
  async patchToEntered(job: Job): Promise<void> {
    const { storeId, waitingId, status } = job.data;
    console.log(`${job.id}의 작업을 수행하였습니다`);
    await this.waitingsRepository.patchToEntered(storeId, waitingId, status);
    return;
  }

  @Process('patchToCanceled')
  async patchToCanceled(job: Job): Promise<void> {
    const { storeId, waitingId } = job.data;
    console.log(`${job.id}의 작업을 수행하였습니다`);
    await this.waitingsRepository.patchToCanceled(storeId, waitingId);
    return;
  }
}
