import { Test, TestingModule } from '@nestjs/testing';
import { ExceptionModel, HttpExceptionFilter, HttpExceptionModel } from '.';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

describe('IneligibleExceptionFilter', () => {
  let service: HttpExceptionFilter;

  const mockJson = jest.fn();

  let mockUrl = 'url-test-2';

  const mockStatus = jest.fn().mockImplementation(() => ({
    json: mockJson,
  }));

  const mockGetRequest = jest.fn().mockImplementation(() => ({
    url: mockUrl,
  }));

  const mockGetResponse = jest.fn().mockImplementation(() => ({
    status: mockStatus,
  }));

  const mockHttpArgumentsHost = jest.fn().mockImplementation(() => ({
    getResponse: mockGetResponse,
    getRequest: mockGetRequest,
  }));

  const mockArgumentsHost = {
    switchToHttp: mockHttpArgumentsHost,
    getArgByIndex: jest.fn(),
    getArgs: jest.fn(),
    getType: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  };

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockedDate = new Date(2023, 5, 1, 0, 0, 0, 0);
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(mockedDate);
    jest.spyOn(Logger.prototype as any, 'error').mockImplementation(() => ({}));
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpExceptionFilter,
        {
          provide: 'winston',
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<HttpExceptionFilter>(HttpExceptionFilter);
  });

  afterAll(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockArgumentsHost.switchToHttp.mockClear();
    mockArgumentsHost.getArgByIndex.mockClear();
    mockArgumentsHost.getArgs.mockClear();
    mockArgumentsHost.getType.mockClear();
    mockArgumentsHost.switchToRpc.mockClear();
    mockArgumentsHost.switchToWs.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('Http exception', () => {
    mockUrl = 'url-test';
    service.catch(
      new HttpException('Http exception', HttpStatus.BAD_REQUEST),
      mockArgumentsHost,
    );

    const exeption = new HttpExceptionModel(
      400,
      new BadRequestException('Http exception'),
      mockUrl,
    );
    expect(mockJson).toHaveBeenCalledWith(exeption);
  });

  it('Exception', () => {
    mockUrl = 'url-test';
    service.catch(new Error('A exception'), mockArgumentsHost);

    const exeption = new ExceptionModel(500, null, mockUrl);
    expect(mockJson).toHaveBeenCalledWith(exeption);
  });

  it('Exception Unprocessable entity', () => {
    mockUrl = 'url-test';
    service.catch({ response: {} }, mockArgumentsHost);

    const exeption = new ExceptionModel(422, { response: {} }, mockUrl);
    expect(mockJson).toHaveBeenCalledWith(exeption);
  });
});
