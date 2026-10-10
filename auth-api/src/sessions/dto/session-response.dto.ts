import { ApiProperty } from '@nestjs/swagger';

export class GeoLocationDto {
  @ApiProperty({ nullable: true, example: 'Brazil' })
  country: string | null;

  @ApiProperty({ nullable: true, example: 'BR' })
  countryCode: string | null;

  @ApiProperty({ nullable: true, example: 'São Paulo' })
  city: string | null;

  @ApiProperty({ nullable: true, example: 'São Paulo' })
  region: string | null;
}

export class SessionItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  isCurrent: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ nullable: true })
  createdAt: string;

  @ApiProperty({ nullable: true })
  lastUsedAt: string | null;

  @ApiProperty()
  expiresAt: string;

  @ApiProperty({ nullable: true })
  revokedAt: string | null;

  @ApiProperty({ nullable: true, example: 'rotated' })
  revokedReason: string | null;

  @ApiProperty({ nullable: true })
  userAgent: string | null;

  @ApiProperty({ nullable: true })
  ipAddress: string | null;

  @ApiProperty({ type: GeoLocationDto })
  geo: GeoLocationDto;
}

export class SessionChainDto {
  @ApiProperty()
  chainId: string;

  @ApiProperty({ type: [SessionItemDto] })
  sessions: SessionItemDto[];

  @ApiProperty({
    enum: ['none', 'warn', 'danger'],
    description:
      'warn = IP mudou em <15min na mesma cadeia. danger = país mudou em <6h.',
  })
  anomalyLevel: 'none' | 'warn' | 'danger';

  @ApiProperty({ nullable: true })
  anomalyReason: string | null;
}

export class SessionsListResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty({ type: [SessionChainDto] })
  chains: SessionChainDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  activeCount: number;
}