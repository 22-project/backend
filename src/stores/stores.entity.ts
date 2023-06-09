import { Users } from '../auth/users.entity';
import { Reviews } from '../reviews/reviews.entity';
import { Waitings } from '../waitings/waitings.entity';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  Point,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Stores extends BaseEntity {
  @PrimaryGeneratedColumn()
  storeId: number;

  @Column()
  storeName: string;

  @Column()
  category: string;

  @Column()
  maxWaitingCnt: number;

  @Column('numeric')
  lat: number;

  @Column('numeric')
  lon: number;

  @Column()
  newAddress: string;

  @Column({ nullable: true })
  oldAddress: string;

  @Column({ default: 60 })
  cycleTime: number;

  @Column()
  tableForTwo: number;

  @Column()
  tableForFour: number;

  @Column('geometry', {
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  coordinates: Point;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => Waitings, (waiting) => waiting.store)
  waitings: Waitings[];

  @OneToMany(() => Reviews, (review) => review.store)
  reviews: Reviews[];

  @OneToOne(() => Users, (user) => user.store)
  user: Users;
}
