import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';

@Entity()
export class CreditHistory {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User, user => user.creditHistory, { onDelete: 'CASCADE' })
    user!: User;

    @Column()
    bookName!: string; 

    @Column({ type: 'enum', enum: ['donation', 'received', 'content'] })
    type!: 'donation' | 'received' | 'content';

    @Column({ type: 'int' })
    credits!: number;

    @CreateDateColumn()
    timestamp!: Date;
}
