import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { USER_ROLES } from '@shared/enums/user-roles';
import { TenantScopedBaseService } from '@shared/services/tenant-scoped-base.service';
import { TenantContextService } from '@shared/tenant-context/tenant-context.service';

const MOBILE_PIN_ROLES: USER_ROLES[] = [USER_ROLES.SERVER, USER_ROLES.CASHIER];

// Roles that get a 4-digit mobile access code generated at creation. Wider
// than MOBILE_PIN_ROLES: OWNER also logs into the mobile app via phone+code
// now, but (unlike SERVER/CASHIER) still requires email+password too, since
// OWNER also uses the web app — so this must stay a separate constant from
// MOBILE_PIN_ROLES, which drives the email/password optionality below.
const ACCESS_CODE_ROLES: USER_ROLES[] = [USER_ROLES.OWNER, USER_ROLES.SERVER, USER_ROLES.CASHIER];

function stripPassword(user: User): Partial<User> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...result } = user;
  return result;
}

/** Same as stripPassword, plus the access code — used everywhere except the
 * one-time create() response and the dedicated getAccessCode() reveal. */
function stripSensitive(user: User): Partial<User> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, accessCode, ...result } = user;
  return result;
}

function generateAccessCode(): string {
  return crypto.randomInt(0, 10000).toString().padStart(4, '0');
}

@Injectable()
export class UsersService extends TenantScopedBaseService<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    tenantContext: TenantContextService,
  ) {
    super(userRepository, tenantContext);
  }

  async findAll(): Promise<Partial<User>[]> {
    const users = await this.findAllScoped();
    return users.map(stripSensitive);
  }

  /**
   * Cross-tenant path for SUPER_ADMIN only — bypasses TenantScopedBaseService
   * entirely via the raw repository. Exposed only behind GET /users/all,
   * marked @CrossTenant() + @Roles(SUPER_ADMIN) on the controller.
   */
  async findAllAcrossAllRestaurants(): Promise<Partial<User>[]> {
    const users = await this.userRepository.find();
    return users.map(stripSensitive);
  }

  async create(createUserDto: CreateUserDto): Promise<Partial<User>> {
    const isMobilePinRole = createUserDto.role && MOBILE_PIN_ROLES.includes(createUserDto.role);

    let email = createUserDto.email;
    if (isMobilePinRole) {
      // SERVER/CASHIER only ever authenticate via phone + access code on the
      // mobile app — email is never collected for them. `email` still gets
      // a value to satisfy the column's NOT NULL constraint, but it's a
      // random, unique, never-shown placeholder, so no uniqueness check is
      // needed for this branch.
      email = `${crypto.randomUUID()}@mobile.local`;
    } else {
      // Email stays intentionally globally unique across all restaurants (a
      // confirmed product decision), so this lookup is not restaurant-scoped.
      const existingUser = await this.userRepository.findOne({
        where: { email: createUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException(`User with email ${createUserDto.email} already exists`);
      }
    }

    // SERVER/CASHIER accounts log into the mobile app with a 4-digit access
    // code, generated here rather than chosen by the admin. `password` still
    // gets a value to satisfy the column's NOT NULL constraint, but it's a
    // random, undisclosed string — never usable for an actual login.
    const password = isMobilePinRole ? crypto.randomBytes(24).toString('hex') : createUserDto.password;
    const hasAccessCode = createUserDto.role && ACCESS_CODE_ROLES.includes(createUserDto.role);
    const accessCode = hasAccessCode ? generateAccessCode() : undefined;
    const hashedPassword = await bcrypt.hash(password as string, 10);
    // saveScoped always overrides restaurantId from tenant context after
    // spreading the input, so a client-supplied restaurantId in the body
    // (CreateUserDto declares none, but nothing else needs to be trusted
    // here) can never win.
    const savedUser = await this.saveScoped({
      ...createUserDto,
      email,
      password: hashedPassword,
      accessCode,
    });

    // One-time exposure: the admin needs to see the generated code right
    // after creation, unlike every other read path (which strips it).
    return stripPassword(savedUser);
  }

  async findOne(id: string): Promise<Partial<User>> {
    const user = await this.findOneScopedOrFail(id);
    return stripSensitive(user);
  }

  async getAccessCode(id: string): Promise<{ accessCode: string | null }> {
    const user = await this.findOneScopedOrFail(id);
    if (!user.accessCode) {
      throw new NotFoundException('No access code for this user.');
    }
    return { accessCode: user.accessCode };
  }

  /**
   * Used by AuthService at login, before any tenant context exists — must
   * stay unscoped. Not a tenant-isolation gap: email is intentionally
   * globally unique across all restaurants (confirmed product decision), so
   * there is only ever one account to find per email regardless of tenant.
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<Partial<User>> {
    const user = await this.findOneScopedOrFail(id);

    // If email is being updated, check if it's already taken by another user
    // (globally, per the same confirmed uniqueness decision as create()).
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(`User with email ${updateUserDto.email} already exists`);
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updated = await this.updateScoped(id, updateUserDto);
    return stripSensitive(updated);
  }

  async remove(id: string): Promise<void> {
    await this.softDeleteScoped(id);
  }
}
