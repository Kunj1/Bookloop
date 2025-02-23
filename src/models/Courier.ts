import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum CourierOrderStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

@Entity()
export class CourierOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User)
  @JoinColumn()
  donator!: User;

  @ManyToOne(() => User)
  @JoinColumn()
  receiver!: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  courierPartner?: User;

  @Column()
  pickupAddress!: string;

  @Column()
  deliveryAddress!: string;

  @Column({ type: 'enum', enum: CourierOrderStatus, default: CourierOrderStatus.PENDING })
  status!: CourierOrderStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;
}