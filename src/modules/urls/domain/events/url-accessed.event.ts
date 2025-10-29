export class UrlAccessedEvent {
  constructor(
    public readonly shortCode: string,
    public readonly timestamp: Date,
    public readonly ip?: string,
    public readonly userAgent?: string,
  ) {}
}
