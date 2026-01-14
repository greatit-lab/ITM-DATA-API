// backend/src/prealign/prealign.service.ts
import { Injectable } from '@nestjs/common';
import { DataApiService } from '../common/data-api.service';

// [수정] 인터페이스 키값 변경 (x, y, theta -> xmm, ymm, notch)
export interface PreAlignData {
  timestamp: string;
  eqpId: string;
  xmm: number;
  ymm: number;
  notch: number;
}

@Injectable()
export class PreAlignService {
  private readonly DOMAIN = 'prealign';

  constructor(private readonly dataApiService: DataApiService) {}

  async getTrend(
    site: string,
    sdwt: string,
    eqpId: string,
    startDate: string,
    endDate: string,
  ): Promise<PreAlignData[]> {
    const params = { site, sdwt, eqpId, startDate, endDate };

    return await this.dataApiService.request<PreAlignData[]>(
      this.DOMAIN,
      'get',
      'trend',
      undefined,
      params,
    ) || [];
  }
}
