import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne} from 'typeorm';
import { IsNotEmpty, IsOptional, IsInt, Min, Max, IsUrl, IsArray, IsIn,IsBoolean} from 'class-validator';
import { User } from './User';
  
  @Entity()
  export class Book {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column()
    @IsNotEmpty()
    name!: string;
  
    @Column("text", { array: true })
    @IsArray()
    @IsNotEmpty({ each: true })
    authors!: string[];
  
    @Column({ type: "text", array: true, nullable: true })
    @IsOptional()
    @IsUrl({}, { each: true })
    imageUrls?: string[];
  
    @Column()
    @IsNotEmpty()
    @IsIn(['hindi', 'english', 'bengali', 'others'])
    language!: string;
  
    @Column()
    @IsNotEmpty()
    @IsIn(['fiction', 'novel', 'mystery', 'non-fiction', 'others'])
    genre!: string;
  
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    @IsInt()
    @Min(0)
    price!: number;

    @Column({ default: false })
    @IsBoolean()
    sold: boolean = false;
  
    @Column()
    @IsInt()
    @Min(1000) // Assuming books aren't older than the year 1000
    @Max(new Date().getFullYear()) // Ensures edition year is not in the future
    editionYear!: number;
  
    @Column({ type: 'text', nullable: true })
    @IsOptional()
    description?: string;

    // Relation: Donated by user
    @ManyToOne(() => User, (user) => user.donatedBooks, { onDelete: 'CASCADE' })
    createdBy!: User;

    // Relation: Received by user
    @ManyToOne(() => User, (user) => user.receivedBooks, { onDelete: 'SET NULL', nullable: true })
    receivedBy?: User;
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;
  }
  