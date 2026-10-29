import { Body, Param, ParseUUIDPipe, UploadedFile } from '@nestjs/common';

import { FileValidatorPipe } from '@/pipes';
import { InjectController, InjectRoute, ReqUser } from '@/decorators';

import type { IJwtStrategy } from '@/api/auth/strategies';

import usersRoutes from './users.routes';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';

import type { UserResponseDto, UserDetailResponseDto } from './dto';

@InjectController({ name: usersRoutes.index })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @InjectRoute(usersRoutes.create)
  public async create(@Body() data: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(data);
  }

  @InjectRoute(usersRoutes.getAll)
  public async getAll(): Promise<UserResponseDto[]> {
    return this.usersService.getAll();
  }

  @InjectRoute(usersRoutes.getMe)
  public async getMe(
    @ReqUser() user: IJwtStrategy,
  ): Promise<UserDetailResponseDto> {
    return this.usersService.getDetailById(user.element.id);
  }

  @InjectRoute(usersRoutes.updateMe)
  public async updateMe(
    @ReqUser() user: IJwtStrategy,
    @Body() data: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(user.element, data);
  }

  @InjectRoute(usersRoutes.updateAvatar)
  public async updateAvatar(
    @UploadedFile(
      new FileValidatorPipe({
        fileTypeConfig: { type: /^image\/(png|jpg|jpeg|bmp|webp)$/ },
        maxSizeConfig: { size: 1 * 1024 * 1024 },
        fileIsRequired: false,
      }),
    )
    file: Express.Multer.File,
  ): Promise<void> {
    // TODO: Implement your logic
    console.log('File name:', file?.originalname);
  }

  @InjectRoute(usersRoutes.getById)
  public async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserDetailResponseDto> {
    return this.usersService.getDetailById(id);
  }

  @InjectRoute(usersRoutes.updateById)
  public async updateById(
    @ReqUser() user: IJwtStrategy,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateById({ id, data, actor: user.element });
  }

  @InjectRoute(usersRoutes.deleteById)
  public async deleteById(
    @ReqUser() user: IJwtStrategy,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<string> {
    await this.usersService.deleteById(id, user.element);

    return id;
  }
}
