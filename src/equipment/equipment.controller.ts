// ITM-Data-API/src/equipment/equipment.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { Prisma } from '@prisma/client';

@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  // 1. 인프라 목록 조회
  @Get()
  async getInfraList() {
    return this.equipmentService.getInfraList();
  }

  // 2. 상세 조회 (Explorer)
  // [주의] :id 보다 위에 있어야 함
  @Get('details')
  async getEquipmentDetails(
    @Query('site') site?: string,
    @Query('sdwt') sdwt?: string,
    @Query('eqpId') eqpId?: string,
  ) {
    return this.equipmentService.getEquipmentDetails({ site, sdwt, eqpId });
  }

  // 3. ID 목록 조회
  // [주의] :id 보다 위에 있어야 함
  @Get('ids')
  async getEqpIds(
    @Query('site') site?: string,
    @Query('sdwt') sdwt?: string,
    @Query('type') type?: string,
  ) {
    return this.equipmentService.getEqpIds({ site, sdwt, type });
  }

  // 4. 단일 장비 조회
  @Get(':id')
  async getEquipment(@Param('id') id: string) {
    return this.equipmentService.getEquipment(id);
  }

  // 5. 장비 추가
  @Post()
  async createEquipment(@Body() body: Prisma.RefEquipmentCreateInput) {
    return this.equipmentService.createEquipment(body);
  }

  // 6. 장비 수정
  @Patch(':id')
  async updateEquipment(
    @Param('id') id: string,
    @Body() body: Prisma.RefEquipmentUpdateInput,
  ) {
    return this.equipmentService.updateEquipment(id, body);
  }

  // 7. 장비 삭제
  @Delete(':id')
  async deleteEquipment(@Param('id') id: string) {
    return this.equipmentService.deleteEquipment(id);
  }
}
