import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

/**
 * Auto-service : chaque membre peut mettre à jour ses propres informations
 * personnelles (hors statut, rôle, code membre — réservés à l'administration).
 */
export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2)
  firstName?: string;

  @IsOptional() @IsString() @MinLength(2)
  lastName?: string;

  @IsOptional() @IsString()
  phone?: string;

  // Champ vide = pas d'email (sinon IsEmail rejette "" et l'email devient obligatoire en pratique).
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional() @IsEmail()
  email?: string | null;

  @IsOptional() @IsString()
  address?: string;

  /** AAAA-MM-JJ. Les vœux d'anniversaire partent ce jour-là. */
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date de naissance invalide.' })
  birthDate?: string;

}
