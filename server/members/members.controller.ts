import { S3Upload } from '../common/storage/s3-upload.interceptor';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RoleCode } from '@prisma/client';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @Roles(RoleCode.SECRETAIRE, RoleCode.TRESORIER, RoleCode.PRESIDENT_ADMIN, RoleCode.PASTEUR_ENCADREUR)
  list(@Query('search') search?: string, @Query('status') status?: string) {
    return this.members.list(search, status);
  }

  // La Secrétaire et le Président/Admin enregistrent les nouveaux avec leur rôle.
  // Seul un Président/Admin peut en créer un autre (sinon la Secrétaire pourrait se donner tous les droits).
  @Post()
  @Roles(RoleCode.SECRETAIRE, RoleCode.PRESIDENT_ADMIN)
  create(@Body() dto: CreateMemberDto, @CurrentUser() user: AuthenticatedUser) {
    if (dto.role === RoleCode.PRESIDENT_ADMIN && !user.roles.includes(RoleCode.PRESIDENT_ADMIN)) {
      throw new ForbiddenException('Seul le Président/Admin peut créer un compte Président/Admin.');
    }
    return this.members.create(dto, user.memberId);
  }

  // « Mon profil » — chaque membre gère ses propres informations.
  @Patch('me')
  updateOwnProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.members.updateProfile(user.memberId, dto);
  }

  // « Ma photo » — chaque membre peut changer sa photo de profil.
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }), S3Upload('avatar', 10 * 1024 * 1024))
  updateOwnAvatar(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: Express.Multer.File) {
    return this.members.updateAvatar(user.memberId, file);
  }

  // Mot de passe oublié : le Président/Admin génère un mot de passe provisoire, à changer à la connexion suivante.
  @Post(':id/reset-password')
  @Roles(RoleCode.PRESIDENT_ADMIN)
  resetPassword(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.members.resetPassword(id, user.memberId);
  }

  // Membre suivi sans compte qui s'inscrit : on lui crée son accès sur sa fiche existante.
  @Post(':id/account')
  @Roles(RoleCode.SECRETAIRE, RoleCode.PRESIDENT_ADMIN)
  createAccess(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.members.createAccess(id, user.memberId);
  }

  @Patch(':id/status')
  @Roles(RoleCode.SECRETAIRE, RoleCode.PRESIDENT_ADMIN)
  setStatus(@Param('id') id: string, @Body('status') status: string, @CurrentUser() user: AuthenticatedUser) {
    return this.members.setStatus(id, status, user.memberId);
  }
}
