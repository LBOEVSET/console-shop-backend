import { Injectable } from '@nestjs/common'
import axios from 'axios'

@Injectable()
export class OtpService {

  async sendOtp(phone: string) {
    const phoneE164 = this.toE164TH(phone)

    const res = await axios.get(process.env.VONAGE_URL_SEND_OTP!, {
      params: {
        api_key: process.env.VONAGE_API_KEY,
        api_secret: process.env.VONAGE_API_SECRET,
        number: phoneE164,
        brand: process.env.VONAGE_BRAND,
        workflow_id: 6, //1 time sms
        pin_expiry: 300,
        next_event_wait: 300
      },
    })

    return res.data
  }

  async verifyOtp(requestId: string, code: string) {
    const res = await axios.get(process.env.VONAGE_URL_VERIFY_OTP!, {
      params: {
        api_key: process.env.VONAGE_API_KEY,
        api_secret: process.env.VONAGE_API_SECRET,
        request_id: requestId,
        code,
      },
    })

    return res.data
  }

  toE164TH(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')

    if (cleaned.startsWith('66')) return `+${cleaned}`
    if (cleaned.startsWith('0')) return `+66${cleaned.slice(1)}`

    throw new Error('Invalid Thai phone number')
  }
}
