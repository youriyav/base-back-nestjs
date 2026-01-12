# CORS Configuration Guide

This guide explains how CORS (Cross-Origin Resource Sharing) is configured in the Fitness Backend API.

## Overview

CORS is now configured dynamically using environment variables, allowing you to control which origins can access your API without modifying code.

## Configuration

### Environment Variable

Add the `CORS_ORIGINS` variable to your `.env` file:

```env
CORS_ORIGINS=http://localhost:4200,http://localhost:3000
```

### Format

- **Single origin**: `CORS_ORIGINS=http://localhost:4200`
- **Multiple origins**: Comma-separated list `CORS_ORIGINS=http://localhost:4200,http://localhost:3000,https://app.example.com`

### Default Behavior

If `CORS_ORIGINS` is not set in the `.env` file, the API will default to allowing:

- `http://localhost:4200` (Angular development server default port)

## CORS Settings

The following CORS settings are configured in `src/main.ts`:

```typescript
app.enableCors({
  origin: allowedOrigins, // From CORS_ORIGINS env variable
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### Settings Explained

| Setting          | Value                                    | Description                                         |
| ---------------- | ---------------------------------------- | --------------------------------------------------- |
| `origin`         | From `CORS_ORIGINS`                      | List of allowed origins that can access the API     |
| `credentials`    | `true`                                   | Allows cookies and authorization headers to be sent |
| `methods`        | `GET, POST, PUT, PATCH, DELETE, OPTIONS` | Allowed HTTP methods                                |
| `allowedHeaders` | `Content-Type, Authorization`            | Allowed request headers                             |

## Environment-Specific Configuration

### Development

```env
# .env (development)
CORS_ORIGINS=http://localhost:4200,http://localhost:3000
```

Allows:

- Angular dev server (port 4200)
- Alternative frontend dev server (port 3000)

### Production

```env
# .env (production)
CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
```

Allows:

- Production frontend application
- Production admin panel

### Multiple Environments

You can create different `.env` files for different environments:

- `.env.development`
- `.env.staging`
- `.env.production`

Then load the appropriate file based on your deployment environment.

## Implementation Details

### main.ts

```typescript
async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);

  // Get ConfigService
  const configService = app.get(ConfigService);

  // CORS configuration from environment
  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  const allowedOrigins = corsOrigins
    ? corsOrigins.split(',').map((origin) => origin.trim())
    : ['http://localhost:4200'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ... rest of bootstrap
}
```

### How It Works

1. **Load Environment**: `dotenv.config()` loads variables from `.env`
2. **Get ConfigService**: Access NestJS ConfigService
3. **Read CORS_ORIGINS**: Get the comma-separated list of origins
4. **Parse Origins**: Split by comma and trim whitespace
5. **Apply CORS**: Configure Express CORS middleware with allowed origins

## Testing CORS Configuration

### Test with cURL

```bash
# Test from allowed origin
curl -H "Origin: http://localhost:4200" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:3333/auth/profile

# Should return CORS headers allowing the request
```

### Test from Browser

Open your browser console and run:

```javascript
fetch('http://localhost:3333/auth/profile', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
})
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error('CORS Error:', error));
```

## Security Best Practices

### 1. Never Use Wildcard in Production

❌ **Bad** (Development only):

```typescript
app.enableCors({
  origin: '*', // Allows ALL origins - NEVER use in production!
});
```

✅ **Good**:

```env
CORS_ORIGINS=https://app.yourdomain.com
```

### 2. Use HTTPS in Production

❌ **Bad**:

```env
CORS_ORIGINS=http://app.yourdomain.com
```

✅ **Good**:

```env
CORS_ORIGINS=https://app.yourdomain.com
```

### 3. Be Specific with Origins

❌ **Bad**:

```env
# Too permissive
CORS_ORIGINS=http://localhost:*,*.yourdomain.com
```

✅ **Good**:

```env
# Explicit allowed origins
CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
```

### 4. Limit Origins

Only add origins that actually need access to your API:

```env
# Only necessary origins
CORS_ORIGINS=https://app.yourdomain.com
```

## Troubleshooting

### Issue: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause**: The requesting origin is not in `CORS_ORIGINS`

**Solution**: Add the origin to your `.env` file:

```env
CORS_ORIGINS=http://localhost:4200,http://your-new-origin.com
```

### Issue: "CORS policy: credentials mode 'include' not supported"

**Cause**: `credentials: true` is set but the origin doesn't match

**Solution**: Ensure the exact origin (including protocol and port) is in `CORS_ORIGINS`

### Issue: Changes to CORS_ORIGINS not taking effect

**Solution**:

1. Stop the server
2. Update `.env` file
3. Restart the server: `npm run start:dev`

### Issue: Preflight (OPTIONS) requests failing

**Cause**: CORS preflight requests are blocked

**Solution**: The configuration already includes `OPTIONS` method. Check that:

1. Your frontend is sending correct headers
2. The origin is in `CORS_ORIGINS`
3. Server is restarted after `.env` changes

## Adding Additional CORS Options

To add more CORS options, modify `src/main.ts`:

```typescript
app.enableCors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'], // Add custom headers
  exposedHeaders: ['X-Total-Count'], // Expose additional headers
  maxAge: 3600, // Preflight cache time (1 hour)
});
```

## Environment Variables Reference

| Variable       | Required | Default                 | Example                                         |
| -------------- | -------- | ----------------------- | ----------------------------------------------- |
| `CORS_ORIGINS` | No       | `http://localhost:4200` | `http://localhost:4200,https://app.example.com` |

## Related Documentation

- [NestJS CORS Documentation](https://docs.nestjs.com/security/cors)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS Middleware](https://expressjs.com/en/resources/middleware/cors.html)
