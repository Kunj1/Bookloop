import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { IsNotEmpty, Min, Max, IsUrl, IsIn, IsOptional } from 'class-validator';
import { User } from './User';

@Entity()
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @IsNotEmpty()
  name!: string;

  @Column()
  @IsNotEmpty()
  description!: string;

  @Column()
  @IsNotEmpty()
  company!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @Min(0)
  price!: number;

  @Column()
  @IsNotEmpty()
  @IsUrl()
  imageUrl!: string;

  @Column()
  @IsNotEmpty()
  language!: string;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 0.0 })
  @Min(0)
  @Max(5)
  rating: number = 0.0;

  @Column({ type: 'int', default: 0 })
  @Min(0)
  numRatings: number = 0;

  @Column({ nullable: true })
  @IsOptional()
  @IsUrl()
  courseLink?: string;

  @ManyToOne(() => User)
  creator!: User;

  @ManyToMany(() => User)
  @JoinTable()
  enrolledUsers!: User[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}