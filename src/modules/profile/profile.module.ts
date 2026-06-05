import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { CartService } from '../cart/cart.service';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, CartService],
})
export class ProfileModule {}
