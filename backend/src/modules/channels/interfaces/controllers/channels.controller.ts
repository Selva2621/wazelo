import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChannelType, ChannelStatus } from '@prisma/client';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { ChannelService } from '../../domain/services/channel.service';
import { CreateChannelDto } from '../../application/dto/create-channel.dto';
import { UpdateChannelDto } from '../../application/dto/update-channel.dto';
import { SuspendChannelDto } from '../../application/dto/suspend-channel.dto';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelService: ChannelService) {}

  @Post()
  @Permissions(PERMISSIONS.CHANNELS_CREATE)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async create(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelService.createChannel(
      orgId,
      userId,
      dto.type,
      dto.name,
      dto.config,
      dto.rateLimitPerMin,
    );
  }

  @Get()
  @Permissions(PERMISSIONS.CHANNELS_READ)
  async list(
    @CurrentUser('orgId') orgId: string,
    @Query('type') type?: ChannelType,
    @Query('status') status?: ChannelStatus,
  ) {
    return this.channelService.listChannels(orgId, { type, status });
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CHANNELS_READ)
  async getById(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.channelService.getChannel(orgId, id);
  }

  @Get(':id/capabilities')
  @Permissions(PERMISSIONS.CHANNELS_READ)
  async getCapabilities(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const channel = await this.channelService.getChannel(orgId, id);
    return channel.capabilities;
  }

  @Put(':id')
  @Permissions(PERMISSIONS.CHANNELS_UPDATE)
  async update(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channelService.updateChannel(orgId, id, dto);
  }

  @Post(':id/suspend')
  @Permissions(PERMISSIONS.CHANNELS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async suspend(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendChannelDto,
  ) {
    await this.channelService.suspendChannel(orgId, id, dto.reason);
  }

  @Post(':id/reactivate')
  @Permissions(PERMISSIONS.CHANNELS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async reactivate(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.channelService.reactivateChannel(orgId, id);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CHANNELS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.channelService.deleteChannel(orgId, id);
  }
}
