import { ApiProperty } from '@nestjs/swagger';

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  ResponseGetUserWithoutPassword,
  RequestRegisterUser,
} from '../interfaces';
import { IsStrongPassword } from '../validators';

export class RegisterUserModel implements RequestRegisterUser {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João da Silva',
    minLength: 3,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @IsString({ message: 'O nome deve ser uma string.' })
  @MinLength(3, { message: 'O nome deve ter no mínimo 3 caracteres.' })
  @MaxLength(100, { message: 'O nome não pode ter mais de 100 caracteres.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'joao.silva@exemplo.com.br',
    maxLength: 255,
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
    description:
      'Senha do usuário (mínimo 8 caracteres, com letra maiúscula, minúscula, número e caractere especial)',
    example: 'Senha@123',
    minLength: 8,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @IsString({ message: 'A senha deve ser uma string.' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  @MaxLength(100, {
    message: 'A senha não pode ter mais de 100 caracteres.',
  })
  @IsStrongPassword({
    message:
      'A senha deve ter no mínimo 8 caracteres, incluindo pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial.',
  })
  password: string;
}

export class GetUserModel implements ResponseGetUserWithoutPassword {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt: Date;

  json(): ResponseGetUserWithoutPassword {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }
}
