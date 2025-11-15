import { Entity, Column } from 'typeorm';
import { AbstractEntity } from './abstract.entity';

@Entity('resources')
export class Resource extends AbstractEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  status: boolean;
}
