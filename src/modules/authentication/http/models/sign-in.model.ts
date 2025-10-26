import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestSignIn, SignIn } from '../interfaces';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RequestSignInModel implements RequestSignIn {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'joao.silva@exemplo.com.br',
  })
  @IsNotEmpty({ message: 'O email é obrigatório.' })
  @IsString({ message: 'O email deve ser uma string.' })
  @IsEmail({}, { message: 'O email deve ser um endereço de email válido.' })
  @MaxLength(255, {
    message: 'O email não pode ter mais de 255 caracteres.',
  })
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'O email deve estar em um formato válido.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'Senha@123',
  })
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @IsString({ message: 'A senha deve ser uma string.' })
  @MaxLength(100, {
    message: 'A senha não pode ter mais de 100 caracteres.',
  })
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
