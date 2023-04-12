import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import type { DeleteResult } from 'typeorm';

import { UserAlreadyException } from '@/api/auth/auth.exceptions';

import { Admin } from './entities/admin.entity';
import { AdminRepository } from './admin.repository';

import type {
  GotAdminDto,
  CreateAdminDto,
  UpdateAdminDto,
  CreatedAdminDto,
  GotAdminDetailDto,
} from './dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: AdminRepository,
  ) {}

  public async create(data: CreateAdminDto): Promise<CreatedAdminDto> {
    const { email, phoneNumber } = data;

    const admin = await this.findOneByEmailOrPhoneNumber({
      email,
      phoneNumber,
    });
    if (admin) {
      throw new UserAlreadyException();
    }

    const createdAdmin = await this.adminRepository.create(data);

    await this.adminRepository.save(createdAdmin);

    return createdAdmin.toResponse();
  }

  public async findOneByEmail(email: string): Promise<Admin> {
    return this.adminRepository.findOneBy({ email });
  }

  public async findOneByEmailOrPhoneNumber({
    email,
    phoneNumber,
  }: {
    email?: string;
    phoneNumber: string;
  }): Promise<Admin> {
    return this.adminRepository.findOneBy([{ email }, { phoneNumber }]);
  }

  public async getAll(): Promise<GotAdminDto[]> {
    const admins = await this.adminRepository.find();

    return admins.map((admin) => admin.toResponse());
  }

  public async getDetailById(id: string): Promise<GotAdminDetailDto> {
    const admin = await this.adminRepository.findOneBy({ id });

    return admin.toResponse();
  }

  private async handleUpdateAdmin({
    admin,
    data,
  }: {
    admin: Admin;
    data: UpdateAdminDto;
  }): Promise<Admin> {
    const { phoneNumber } = data;

    if (phoneNumber && phoneNumber !== admin?.phoneNumber) {
      const existedAdmin = await this.findOneByEmailOrPhoneNumber({
        phoneNumber,
      });

      if (existedAdmin) {
        throw new UserAlreadyException();
      }
    }

    const updatedAdmin = await this.adminRepository.create({
      ...admin,
      ...data,
    });

    await this.adminRepository.save(updatedAdmin);

    return updatedAdmin;
  }

  public async updateById({
    id,
    data,
  }: {
    id: string;
    data: UpdateAdminDto;
  }): Promise<GotAdminDto> {
    const admin = await this.adminRepository.findOneBy({ id });

    const updatedAdmin = await this.handleUpdateAdmin({ admin, data });

    return updatedAdmin.toResponse();
  }

  public async updateByAdmin({
    admin,
    data,
  }: {
    admin: Admin;
    data: UpdateAdminDto;
  }): Promise<GotAdminDto> {
    const updatedAdmin = await this.handleUpdateAdmin({ admin, data });

    return updatedAdmin.toResponse();
  }

  public async deleteById(id: string): Promise<DeleteResult> {
    return this.adminRepository.delete({ id });
  }
}
