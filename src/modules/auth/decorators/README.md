# Custom Decorators

This folder contains custom NestJS param decorators for extracting data from authenticated requests.

## Available Decorators

### @User() Decorator

Extracts the current authenticated user from the request.

**Usage:**
```typescript
import { User } from './decorators';
import { User as UserEntity } from '@modules/users/users.entity';

@Controller('profile')
export class ProfileController {
  @UseGuards(JwtAuthGuard)
  @Get()
  async getProfile(@User() user: Partial<UserEntity>) {
    return user;
  }
}
```

