import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: true,
      },
    });
  }

  async updateProfile(userId: string, dto: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        profileImage: dto.profileImage,
        backgroundImage: dto.backgroundImage,
      },
    });
  }

  async deleteAccount(userId: string) {
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Account deleted' };
  }

  async addAddress(userId: string, dto: any) {
    return this.prisma.address.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async updateAddress(userId: string, addressId: string, dto: any) {
    return this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });
  }

  async deleteAddress(addressId: string) {
    return this.prisma.address.delete({
      where: { id: addressId },
    });
  }
}
