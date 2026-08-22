import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntityWithDates } from './base-entity';
import { ProductMaster } from './product-master.entity';

@Entity({ name: 'bottle_family' })
export class BottleFamily extends BaseEntityWithDates {
  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description!: string | null;

  @Column({ nullable: true })
  sourceFile!: string | null;

  @OneToMany(() => ProductMaster, (product) => product.bottleFamily)
  products?: ProductMaster[];
}
