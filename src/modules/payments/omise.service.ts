import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Omise from 'omise';

@Injectable()
export class OmiseService {
  private omise: any;

  constructor(private config: ConfigService) {
    this.omise = Omise({
      publicKey: process.env.OMISE_PUBLIC_KEY,//this.config.getOrThrow('OMISE_PUBLIC_KEY'),
      secretKey: process.env.OMISE_SECRET_KEY,//this.config.getOrThrow('OMISE_SECRET_KEY'),
    });
  }

  async createCharge(
    amount: number,
    orderId: string,
  ) {
    const charge = await this.omise.charges.create({
      amount: amount * 100, // Omise uses satang
      currency: 'thb',
      return_uri: `http://localhost:3000/payment-success`,
      metadata: {
        orderId,
      },
      source: {
        type: 'promptpay',
      },
    });

    return charge;
  }

  async createCardCharge(
    amount: number,
    token: string,
    orderId: string,
  ) {
    return this.omise.charges.create({
      amount: amount * 100,
      currency: 'thb',
      card: token,
      metadata: { orderId },
    });
  }

  async createPromptPayCharge(amount: number, orderId: string) {
    const charge = await this.omise.charges.create({
      amount: amount * 100,
      currency: "thb",
      metadata: { orderId },
      source: {
        type: "promptpay"
      }
    })

    return charge
  }
}
