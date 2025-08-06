import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestSignIn, SignIn } from '../interfaces';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestSignInModel implements RequestSignIn {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class SignInModel implements SignIn {
  @ApiPropertyOptional()
  accessToken?: string;

  json(): SignIn {
    return {
      accessToken: this.accessToken,
    };
  }
}
