import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsSafeUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string, args: ValidationArguments) {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      const parsedUrl = new URL(url);

      // Lista de protocolos bloqueados
      const blockedProtocols = ['file:', 'ftp:', 'data:', 'javascript:'];
      if (blockedProtocols.includes(parsedUrl.protocol)) {
        return false;
      }

      // Apenas HTTP e HTTPS são permitidos
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false;
      }

      // Bloquear IPs privados e localhost
      const hostname = parsedUrl.hostname.toLowerCase();
      const privateIpPatterns = [
        /^localhost$/i,
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^::1$/,
        /^fc00:/,
        /^fe80:/,
      ];

      for (const pattern of privateIpPatterns) {
        if (pattern.test(hostname)) {
          return false;
        }
      }

      // Bloquear URLs com credenciais
      if (parsedUrl.username || parsedUrl.password) {
        return false;
      }

      // Validar comprimento máximo
      if (url.length > 2048) {
        return false;
      }

      return true;
    } catch (error) {
      // URL inválida
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return 'A URL fornecida não é válida ou contém elementos inseguros. Use apenas URLs HTTP/HTTPS públicas.';
  }
}

export function IsSafeUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeUrlConstraint,
    });
  };
}
