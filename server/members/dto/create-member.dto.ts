import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { PaymentMethod, RoleCode } from '@prisma/client';

export class CreateMemberDto {
  @IsString() @MinLength(2)
  firstName!: string;

  @IsString() @MinLength(2)
  lastName!: string;

  @IsOptional() @IsString()
  phone?: string;

  /** false = membre suivi sans compte (pas encore inscrit dans l'appli) : on pourra lui créer son accès plus tard. */
  @IsOptional() @IsBoolean()
  withAccount?: boolean;

  // Champ vide = pas d'email (sinon IsEmail rejette "" et l'email devient obligatoire en pratique).
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional() @IsEmail()
  email?: string | null;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsString()
  birthDate?: string;


  /**
   * Rôle additionnel à attribuer dès la création (en plus de MEMBRE).
   * Président/Admin : seul un Président/Admin peut l'attribuer (vérifié dans MembersController.create).
   */
  @IsOptional() @IsEnum(RoleCode)
  role?: RoleCode;

  /** Montant versé pour l'inscription, s'il a payé en s'inscrivant (entre en caisse avec reçu). */
  @IsOptional() @IsInt() @Min(1) @Max(100_000_000)
  inscriptionAmount?: number;

  @IsOptional() @IsEnum(PaymentMethod)
  inscriptionMethod?: PaymentMethod;
}
