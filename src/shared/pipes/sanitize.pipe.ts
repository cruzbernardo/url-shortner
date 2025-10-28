import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

@Injectable()
export class SanitizePipe implements PipeTransform {
  /**
   * Sanitiza inputs para prevenir XSS, SQL Injection e outros ataques
   */
  transform(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Se for objeto, sanitizar recursivamente
    if (typeof value === 'object' && !Array.isArray(value)) {
      return this.sanitizeObject(value);
    }

    // Se for array, sanitizar cada item
    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item));
    }

    // Se for string, aplicar sanitização
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    // Outros tipos (number, boolean) retornam sem modificação
    return value;
  }

  /**
   * Sanitiza objeto recursivamente
   */
  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Sanitiza a chave também (previne prototype pollution)
        const sanitizedKey = this.sanitizeKey(key);
        sanitized[sanitizedKey] = this.transform(obj[key]);
      }
    }

    return sanitized;
  }

  /**
   * Sanitiza chaves de objetos (previne prototype pollution)
   */
  private sanitizeKey(key: string): string {
    // Remove __proto__, constructor, prototype
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    if (dangerousKeys.includes(key.toLowerCase())) {
      throw new BadRequestException(
        `Chave inválida detectada: ${key}. Possível tentativa de ataque.`,
      );
    }
    return key;
  }

  /**
   * Sanitiza strings
   */
  private sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') {
      return str;
    }

    let sanitized = str;

    // 1. Remove tags HTML perigosas (XSS)
    sanitized = this.removeHtmlTags(sanitized);

    // 2. Remove caracteres de controle (null bytes, etc)
    sanitized = this.removeControlCharacters(sanitized);

    // 3. Remove operadores SQL/NoSQL perigosos
    sanitized = this.removeSqlInjectionPatterns(sanitized);

    // 4. Limita tamanho (previne DoS)
    sanitized = this.limitLength(sanitized);

    return sanitized.trim();
  }

  /**
   * Remove tags HTML e JavaScript
   */
  private removeHtmlTags(str: string): string {
    // Remove scripts
    str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers (onclick, onload, etc)
    str = str.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Remove tags HTML completas (exceto em URLs válidas)
    // Permite <http://example.com> mas remove <script>
    str = str.replace(/<(?!https?:\/\/)[^>]+>/gi, '');

    // Remove javascript: protocol
    str = str.replace(/javascript:/gi, '');

    // Remove data: protocol (pode carregar scripts)
    str = str.replace(/data:text\/html/gi, '');

    return str;
  }

  /**
   * Remove caracteres de controle perigosos
   */
  private removeControlCharacters(str: string): string {
    // Remove null bytes
    str = str.replace(/\0/g, '');

    // Remove caracteres de controle perigosos (exceto \n, \r, \t)
    str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return str;
  }

  /**
   * Remove padrões de SQL/NoSQL Injection
   */
  private removeSqlInjectionPatterns(str: string): string {
    // Remove operadores MongoDB perigosos
    const mongoOperators = [
      '$gt',
      '$gte',
      '$lt',
      '$lte',
      '$ne',
      '$eq',
      '$in',
      '$nin',
      '$or',
      '$and',
      '$not',
      '$nor',
      '$exists',
      '$type',
      '$mod',
      '$regex',
      '$text',
      '$where',
    ];

    mongoOperators.forEach((op) => {
      const regex = new RegExp(`["']?\\${op}["']?\\s*:`, 'gi');
      if (regex.test(str)) {
        throw new BadRequestException(
          `Operador MongoDB perigoso detectado: ${op}`,
        );
      }
    });

    // Remove comentários SQL
    str = str.replace(/--/g, '');
    str = str.replace(/\/\*/g, '');
    str = str.replace(/\*\//g, '');

    // Remove ponto-e-vírgula múltiplos (SQL injection)
    str = str.replace(/;{2,}/g, ';');

    return str;
  }

  /**
   * Limita tamanho da string (previne DoS)
   */
  private limitLength(str: string, maxLength: number = 10000): string {
    if (str.length > maxLength) {
      throw new BadRequestException(
        `Input muito longo. Máximo ${maxLength} caracteres.`,
      );
    }
    return str;
  }
}