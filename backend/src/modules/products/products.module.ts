import { Module } from '@nestjs/common';
import { ProductRepository } from './infrastructure/repositories/product.repository';
import { ProductsController } from './interfaces/controllers/products.controller';

@Module({
  controllers: [ProductsController],
  providers: [ProductRepository],
  exports: [ProductRepository],
})
export class ProductsModule {}
