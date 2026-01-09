// ITM-Data-API/src/infra/infra.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { InfraService } from './infra.service';
import { Prisma } from '@prisma/client';

@Controller('infra')
export class InfraController {
  constructor(private readonly infraService: InfraService) {}

  @Get('sdwt')
  async getSdwts() { return this.infraService.getSdwts(); }

  @Post('sdwt')
  async createSdwt(@Body() body: Prisma.RefSdwtCreateInput) { return this.infraService.createSdwt(body); }

  @Put('sdwt/:id')
  async updateSdwt(@Param('id') id: string, @Body() body: Prisma.RefSdwtUpdateInput) {
    return this.infraService.updateSdwt(id, body);
  }

  @Delete('sdwt/:id')
  async deleteSdwt(@Param('id') id: string) { return this.infraService.deleteSdwt(id); }

  @Get('agent-server')
  async getAgentServers() { return this.infraService.getAgentServers(); }

  @Post('agent-server')
  async createAgentServer(@Body() body: Prisma.CfgServerCreateInput) { return this.infraService.createAgentServer(body); }

  @Put('agent-server/:id')
  async updateAgentServer(@Param('id') id: string, @Body() body: Prisma.CfgServerUpdateInput) {
    return this.infraService.updateAgentServer(id, body);
  }

  @Delete('agent-server/:id')
  async deleteAgentServer(@Param('id') id: string) { return this.infraService.deleteAgentServer(id); }
}
