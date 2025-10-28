import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/database/entities';
import {
  ResponseGetUserWithoutPassword,
  RequestRegisterUser,
} from '../http/interfaces';
import { Logger } from 'winston';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @Inject('winston')
    private readonly logger: Logger,
  ) {}

  async register(
    data: RequestRegisterUser,
  ): Promise<ResponseGetUserWithoutPassword> {
    this.logger.debug(`Registering user with email: ${data.email}`, {
      context: UsersService.name,
    });

    const existing = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (existing) {
      this.logger.warn(
        `Registration conflict: email already in use - ${data.email}`,
        { context: UsersService.name },
      );
      throw new ConflictException('Email already in use');
    }

    const user = await this.userRepository.save(
      this.userRepository.create(data),
    );

    this.logger.info(
      `User registered successfully: id=${user.id} email=${user.email}`,
      { context: UsersService.name },
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async get(id: string): Promise<ResponseGetUserWithoutPassword> {
    this.logger.debug(`Fetching user by id: ${id}`, {
      context: UsersService.name,
    });

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      this.logger.warn(`User not found with id: ${id}`, {
        context: UsersService.name,
      });
      throw new NotFoundException('User not found');
    }

    this.logger.info(`User found: id=${id} email=${user.email}`, {
      context: UsersService.name,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    this.logger.debug(`Finding user by email: ${email}`, {
      context: UsersService.name,
    });

    const user = await this.userRepository.findOne({ where: { email } });

    if (user) {
      this.logger.info(`User found by email: ${email}`, {
        context: UsersService.name,
      });
    } else {
      this.logger.warn(`User not found by email: ${email}`, {
        context: UsersService.name,
      });
    }

    return user;
  }
}
