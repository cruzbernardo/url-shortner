import { Module } from '@nestjs/common';
import { AuthenticationService } from './domain/authentication.service';
import { AuthenticationController } from './http/authentication.controller';
import { EncryptionService } from 'src/shared/utils/encryption.service';
import { JwtService } from '@nestjs/jwt';
import { UsersModule } from 'src/modules/users/users.module';

@Module({
  imports: [UsersModule],
  providers: [AuthenticationService, EncryptionService, JwtService],
  controllers: [AuthenticationController],
})
export class AuthenticationModule {}
