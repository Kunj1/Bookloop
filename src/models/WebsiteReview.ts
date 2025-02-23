import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { IsNotEmpty, IsInt, Min, Max, IsOptional, Length } from 'class-validator';
import { User } from './User';

@Entity()
export class WebsiteReview {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    // Relation: User who left the review
    @ManyToOne(() => User, (user) => user.websiteReviews, { onDelete: 'CASCADE' })
    reviewer!: User;

    // Rating (0-5)
    @Column({ type: 'int' })
    @IsInt()
    @Min(0)
    @Max(5)
    rating!: number;

    // Review text
    @Column({ type: 'text', nullable: true })
    @IsOptional()
    @Length(5, 500) // Minimum 5, Maximum 500 characters
    review?: string;

    // Date of review
    @CreateDateColumn()
    createdAt!: Date;
}
