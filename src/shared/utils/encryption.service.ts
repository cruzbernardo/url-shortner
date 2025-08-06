import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash } from 'crypto';
import { IEnvironmentVariables } from 'src/config/enviorment-config.validation';
import { Logger } from 'winston';

@Injectable()
export class EncryptionService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<IEnvironmentVariables>,

    @Inject('winston')
    private readonly logger: Logger,
  ) {
    this.logger.info('Initializing Encryption service', {
      context: EncryptionService.name,
    });

    this.ALGORITHM = this.configService.get('ALGORITHM', {
      infer: true,
    })!;
    this.ENCRYPT_SECRET_KEY = this.configService.get('ENCRYPT_SECRET_KEY', {
      infer: true,
    })!;
    this.ENCRYPT_IV = this.configService.get('ENCRYPT_IV', {
      infer: true,
    })!;
  }

  private readonly ALGORITHM: string;
  private readonly ENCRYPT_SECRET_KEY: string;
  private readonly ENCRYPT_IV: string;

  public encprypt(dataToEncrypt: string): string {
    const cipher = createCipheriv(
      this.ALGORITHM,
      Buffer.from(this.ENCRYPT_SECRET_KEY, 'hex'),
      Buffer.from(this.ENCRYPT_IV, 'hex'),
    );
    let encryptedPayload = cipher.update(dataToEncrypt, 'utf8', 'hex');
    return (encryptedPayload += cipher.final('hex'));
  }

  public decrypt(encryptedData: string): string {
    try {
      const decipher = createDecipheriv(
        this.ALGORITHM,
        Buffer.from(this.ENCRYPT_SECRET_KEY, 'hex'),
        Buffer.from(this.ENCRYPT_IV, 'hex'),
      );
      let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
      decryptedData += decipher.final('utf8');
      return decryptedData;
    } catch (error) {
      this.logger.error(`Error decrypting: ${error.message || error}`, {
        context: EncryptionService.name,
        stack: error.stack,
      });
      throw new BadRequestException('Something went wrong decrypting');
    }
  }

  public generateMd5Hash(data: string): string {
    const hash = createHash('md5');
    hash.update(data);
    return hash.digest('hex');
  }
}
