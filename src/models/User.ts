import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,OneToMany} from 'typeorm';
import { IsEmail, IsNotEmpty, MinLength, MaxLength, IsOptional, IsIn, IsPhoneNumber, IsUrl, Min, Max, IsInt} from 'class-validator';
import { Book } from './Book';
import { CreditHistory } from './CreditHistory';
import { WebsiteReview } from './WebsiteReview';
  
  // Define the safe user type without password
  export type SafeUser = Omit<User, 'password' | 'toJSON'> & { password?: never };
  
  @Entity()
  export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column()
    @IsNotEmpty()
    fullName!: string;
  
    @Column({ unique: true })
    @IsEmail()
    @IsNotEmpty()
    email!: string;
  
    @Column()
    @IsNotEmpty()
    @MinLength(8)
    password!: string;
  
    @Column()
    @IsNotEmpty()
    state!: string;
  
    @Column()
    @IsNotEmpty()
    address!: string;
  
    @Column({ unique: true })
    @IsPhoneNumber('IN') // Assuming Indian phone numbers
    @IsNotEmpty()
    phoneNumber!: string;
  
    @Column({ type: 'text', nullable: true })
    @IsOptional()
    @IsUrl()
    profilePicture?: string;

    @Column({ nullable: true })
    profilePictureId?: string;
  
    @Column({ default: 'donator/receiver' })
    @IsIn(['donator/receiver', 'courier_partner', 'courses_partner'])
    role: string = 'donator/receiver';

    @Column({ type: 'text', nullable: true, default: null })
    refreshToken?: string | null;

    // Relation: Books Donated
    @OneToMany(() => Book, (book) => book.createdBy, { cascade: true })
    donatedBooks!: Book[];

    // Relation: Books Received
    @OneToMany(() => Book, (book) => book.receivedBy, { cascade: true })
    receivedBooks!: Book[];

    // Relation: Credit History
    @OneToMany(() => CreditHistory, (credit) => credit.user, { cascade: true })
    creditHistory!: CreditHistory[];

    @Column({ type: 'decimal', precision: 2, scale: 1, default: 0 })
    @Min(0)
    @Max(5)
    rating: number = 0.0;

    @Column({ type: 'int', default: 0 })
    @IsInt()
    @Min(0)
    numRatings: number = 0;

    @OneToMany(() => WebsiteReview, (review) => review.reviewer, { cascade: true })
    websiteReviews!: WebsiteReview[];
    
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;
  
    toJSON(): SafeUser {
      const { password,refreshToken, ...safeUser } = { ...this };
      return safeUser;
    }
  }
  