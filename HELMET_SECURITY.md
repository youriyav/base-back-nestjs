# Helmet Security Configuration

This guide explains the Helmet security middleware implementation in the Fitness Backend API.

## Overview

Helmet helps secure your Express/NestJS applications by setting various HTTP security headers. It's a collection of 15 smaller middleware functions that set security-related HTTP headers.

## Installation

Helmet is already installed in this project:

```bash
npm install helmet
```

## Configuration

Helmet is configured in `src/main.ts`:

```typescript
import helmet from 'helmet';

async function bootstrap() {
  // ...
  const configService = app.get(ConfigService);

  // Helmet security headers
  const isProduction = configService.get('NODE_ENV') === 'production';
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: isProduction ? undefined : false,
    }),
  );
  // ...
}
```

## Environment-Based Configuration

The security headers are configured differently based on the `NODE_ENV` environment variable:

### Development Mode (`NODE_ENV=dev`)

- **Content Security Policy (CSP)**: Disabled for easier development
- **Cross-Origin Embedder Policy (COEP)**: Disabled to allow Swagger UI and other dev tools

### Production Mode (`NODE_ENV=production`)

- **All security headers enabled** with default secure settings
- **Strict CSP and COEP policies** enforced

## Security Headers Applied

When Helmet is enabled, it sets the following HTTP security headers:

### 1. Content-Security-Policy (CSP)

**Production Only**

Helps prevent XSS attacks by controlling which resources can be loaded.

```
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;...
```

### 2. Cross-Origin-Embedder-Policy (COEP)

**Production Only**

Prevents a document from loading cross-origin resources that don't explicitly grant permission.

```
Cross-Origin-Embedder-Policy: require-corp
```

### 3. Cross-Origin-Opener-Policy (COOP)

**Always Enabled**

Isolates your document from other origins.

```
Cross-Origin-Opener-Policy: same-origin
```

### 4. Cross-Origin-Resource-Policy (CORP)

**Always Enabled**

Controls which origins can read the response.

```
Cross-Origin-Resource-Policy: same-origin
```

### 5. X-DNS-Prefetch-Control

**Always Enabled**

Controls browser DNS prefetching.

```
X-DNS-Prefetch-Control: off
```

### 6. X-Frame-Options

**Always Enabled**

Prevents clickjacking attacks by controlling whether the page can be embedded in frames.

```
X-Frame-Options: SAMEORIGIN
```

### 7. Strict-Transport-Security (HSTS)

**Always Enabled**

Forces HTTPS connections.

```
Strict-Transport-Security: max-age=15552000; includeSubDomains
```

### 8. X-Content-Type-Options

**Always Enabled**

Prevents MIME-sniffing attacks.

```
X-Content-Type-Options: nosniff
```

### 9. Origin-Agent-Cluster

**Always Enabled**

Provides origin-keyed agent clusters in browsers.

```
Origin-Agent-Cluster: ?1
```

### 10. X-Permitted-Cross-Domain-Policies

**Always Enabled**

Controls Adobe Flash and PDF cross-domain policies.

```
X-Permitted-Cross-Domain-Policies: none
```

### 11. Referrer-Policy

**Always Enabled**

Controls how much referrer information is included with requests.

```
Referrer-Policy: no-referrer
```

### 12. X-XSS-Protection

**Always Enabled** (Legacy)

Legacy XSS protection (mostly superseded by CSP).

```
X-XSS-Protection: 0
```

## Environment Variables

| Variable   | Required | Default | Values              | Description                         |
| ---------- | -------- | ------- | ------------------- | ----------------------------------- |
| `NODE_ENV` | No       | `dev`   | `dev`, `production` | Controls helmet security strictness |

## Custom Helmet Configuration

To customize Helmet settings, modify `src/main.ts`:

### Example: Custom CSP for Production

```typescript
app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        }
      : false,
    crossOriginEmbedderPolicy: isProduction ? undefined : false,
  }),
);
```

### Example: Allow Specific Origins in CORP

```typescript
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
```

### Example: Disable Specific Headers

```typescript
app.use(
  helmet({
    xFrameOptions: false, // Disable X-Frame-Options
    contentSecurityPolicy: false, // Disable CSP
  }),
);
```

## Common Use Cases

### 1. API with Swagger UI (Development)

Current configuration automatically handles this:

```typescript
const isProduction = configService.get('NODE_ENV') === 'production';
app.use(
  helmet({
    contentSecurityPolicy: isProduction ? undefined : false, // Allows Swagger
    crossOriginEmbedderPolicy: isProduction ? undefined : false,
  }),
);
```

### 2. API with Frontend on Different Domain

Combine with CORS configuration:

```typescript
// CORS allows frontend domain
app.enableCors({
  origin: ['https://app.example.com'],
  credentials: true,
});

// Helmet with relaxed CORP for cross-origin requests
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
```

### 3. Serving Static Files

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'", "'unsafe-inline'"], // For inline scripts
      },
    },
  }),
);
```

## Testing Security Headers

### Using cURL

```bash
# Test security headers
curl -I http://localhost:3333/api

# Should return headers like:
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN
# Strict-Transport-Security: max-age=15552000; includeSubDomains
# X-DNS-Prefetch-Control: off
# Referrer-Policy: no-referrer
# etc.
```

### Using Browser DevTools

1. Open your API in browser (e.g., `http://localhost:3333/api`)
2. Open Developer Tools (F12)
3. Go to Network tab
4. Refresh the page
5. Click on the request
6. View Response Headers

### Online Security Headers Checker

Use online tools like:

- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

## Troubleshooting

### Issue: Swagger UI not loading in development

**Cause**: CSP is enabled in development mode

**Solution**: Ensure `NODE_ENV=dev` in your `.env` file:

```env
NODE_ENV=dev
```

### Issue: Frontend can't load API resources

**Cause**: Strict CORP policy blocking cross-origin requests

**Solution**: Adjust `crossOriginResourcePolicy`:

```typescript
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
```

### Issue: Inline scripts not working

**Cause**: CSP blocking inline scripts

**Solution**: Update CSP directives or use nonces:

```typescript
contentSecurityPolicy: {
  directives: {
    scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts
  },
}
```

### Issue: Images from CDN not loading

**Cause**: CSP blocking external image sources

**Solution**: Add CDN to CSP directives:

```typescript
contentSecurityPolicy: {
  directives: {
    imgSrc: ["'self'", 'https://cdn.example.com'],
  },
}
```

## Security Best Practices

### 1. Always Use Helmet in Production

```env
# .env.production
NODE_ENV=production
```

### 2. Use HTTPS in Production

Helmet's HSTS header requires HTTPS:

- Set up SSL/TLS certificates
- Use a reverse proxy (Nginx, Apache) with SSL
- Or use a platform with SSL support (Heroku, AWS)

### 3. Test Your Headers

Before deploying to production:

```bash
# Build and test
npm run build
NODE_ENV=production npm start

# Check headers
curl -I http://localhost:3333/api
```

### 4. Review CSP Violations

In production, monitor CSP violations:

```typescript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    reportUri: ['/csp-violation-report'],
  },
}
```

### 5. Keep Helmet Updated

```bash
# Check for updates
npm outdated helmet

# Update
npm update helmet
```

## Migration from Old Configuration

If you had manual header setting before Helmet:

### Before (Manual)

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
```

### After (With Helmet)

```typescript
app.use(helmet()); // Handles all security headers automatically
```

## Additional Resources

- [Helmet.js Documentation](https://helmetjs.github.io/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [Content Security Policy Reference](https://content-security-policy.com/)

## Summary

Helmet provides a robust set of security headers with minimal configuration. The current implementation:

✅ Automatically adapts to development vs production environments
✅ Allows Swagger UI in development
✅ Enforces strict security in production
✅ Compatible with CORS configuration
✅ Easy to customize for specific needs

Always test your security headers before deploying to production!
