import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/users.entity';

/**
 * Password Reset Token Entity
 *
 * Stores hashed password reset tokens with expiration.
 * Tokens are single-use and time-limited for security.
 *
 * Security considerations:
 * - Token is stored as a hash (never plain text)
 * - Expires after 15 minutes
 * - Marked as used after successful reset
 * - One active token per user (previous tokens invalidated)
 */
@Entity({ name: 'password_reset_tokens' })
@Index(['userId', 'usedAt']) // Optimize queries for active tokens
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Hashed token using crypto.createHash('sha256')
   * The plain token is sent via email, this hash is stored for verification
   */
  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash: string;

  /**
   * Token expiration timestamp (15 minutes from creation)
   */
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  /**
   * Timestamp when token was used (null if unused)
   * Once set, the token cannot be used again
   */
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /**
   * Check if the token is still valid (not expired and not used)
   */
  isValid(): boolean {
    return !this.usedAt && new Date() < this.expiresAt;
  }
}
