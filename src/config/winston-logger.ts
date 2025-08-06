import { ClsServiceManager } from 'nestjs-cls';
import { addColors, createLogger, format, transports } from 'winston';
import stripAnsi from 'strip-ansi';
import { TransformableInfo } from 'logform';

addColors({
  error: 'bold red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
});

export const injectTraceIdFormat = format((info) => {
  const cls = ClsServiceManager.getClsService();
  const traceId = cls.get('x-trace-id');
  const ip = cls.get('ip');

  if (traceId) {
    info['trace.id'] = traceId;
  }
  if (ip) {
    info['client.ip'] = ip;
  }

  return info;
});

const localConsoleFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  injectTraceIdFormat(),
  format.printf(
    ({
      timestamp,
      level,
      message,
      stack,
      context = '',
      ['trace.id']: traceId,
      ['client.ip']: clientIp,
      ...meta
    }: TransformableInfo & {
      ['trace.id']?: string;
      ['client.ip']?: string;
    }) => {
      const metaString = Object.keys(meta).length
        ? `\n${JSON.stringify(meta, null, 2)}`
        : '';
      const ctx = context ? `\x1b[36m[${context}]\x1b[0m` : '';
      return `${timestamp} - ${level.padEnd(7)} ${ctx} ${
        stack || ''
      } ${message} ${traceId ? `[trace.id=${traceId}]` : ''} ${
        clientIp ? `[ip=${clientIp}]` : ''
      }${metaString}`;
    },
  ),
);

const consoleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  injectTraceIdFormat(),
  format.errors({ stack: true }),
  format.printf((info: TransformableInfo) => {
    const { timestamp, level, message, context = '', stack, ...meta } = info;

    const safeMessage =
      typeof message === 'string'
        ? message
        : typeof message === 'object'
          ? JSON.stringify(message)
          : String(message);

    const safeStack =
      typeof stack === 'string'
        ? stack
        : typeof stack === 'object'
          ? JSON.stringify(stack)
          : stack
            ? String(stack)
            : undefined;

    return JSON.stringify({
      timestamp,
      level: typeof level === 'string' ? stripAnsi(level) : level,
      context: typeof context === 'string' ? stripAnsi(context) : context,
      message: stripAnsi(safeStack || safeMessage),
      ...meta,
    });
  }),
);

const isTerminal = process.stdout.isTTY;

const local = () => ({
  level: 'debug',
  format: localConsoleFormat,
  transports: [
    new transports.Console({ level: 'debug' }),
    new transports.File({
      filename: '/var/log/nest/app.log',
      level: 'info',
      format: consoleFormat,
    }),
  ],
});

const buildProd = () => ({
  level: 'info',
  format: isTerminal ? localConsoleFormat : consoleFormat,
  transports: [
    new transports.Console({ level: 'info' }),
    new transports.File({
      filename: '/var/log/nest/app.log',
      level: 'info',
      format: consoleFormat,
    }),
  ],
});

const buildDev = () => ({
  level: 'debug',
  format: isTerminal ? localConsoleFormat : consoleFormat,
  transports: [
    new transports.Console({ level: 'debug' }),
    new transports.File({
      filename: '/var/log/nest/app.log',
      level: 'info',
      format: consoleFormat,
    }),
  ],
});

const builders: Record<string, () => ReturnType<typeof buildDev>> = {
  production: buildProd,
  development: buildDev,
  local: local,
};

const env = (process.env.NODE_ENV ?? 'development').toLowerCase();
const config = (builders[env] ?? buildDev)();

export const instance = createLogger(config);
