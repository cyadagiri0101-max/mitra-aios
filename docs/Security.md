# MITRA AIOS Security Guide

## Overview

MITRA provides comprehensive security features including authentication, authorization, encryption, and audit logging. This guide covers configuration and best practices.

## Authentication

### Enabling Authentication

```bash
# Environment variable
export AIOS_AUTH_ENABLED=true

# Or in config.toml
[security]
auth_enabled = true
```

### JWT Tokens

```python
# Create a token
POST /api/v1/security/tokens/create
{
  "principal": "user-123",
  "token_type": "access",
  "expires_in": 3600
}

# Validate a token
POST /api/v1/security/tokens/validate
token=<jwt_token>

# Use in requests
Authorization: Bearer <jwt_token>
```

### API Keys

For service-to-service communication, use API keys:

```bash
# Set API key
aios config set security.api_key <generated_key>

# Use in requests
X-API-Key: <api_key>
```

## Authorization

### Permission Model

MITRA uses Role-Based Access Control (RBAC) with hierarchical permissions:

```
admin
├── read
├── write
├── execute
├── delete
└── manage

user
├── read
├── write
└── execute

viewer
└── read
```

### Granting Permissions

```bash
# Grant permission
POST /api/v1/security/permissions/grant
{
  "principal": "user-123",
  "resource": "agents",
  "level": "write"
}

# Check permission
POST /api/v1/security/permissions/check
{
  "principal": "user-123",
  "resource": "agents",
  "level": "write"
}
```

### Resource Permissions

| Resource | Read | Write | Execute | Delete | Manage |
|----------|------|-------|---------|--------|--------|
| agents | View agents | Create/modify | Run agents | Remove agents | Full control |
| tools | List tools | Register | Execute | Unregister | Full control |
| memory | Recall | Store | - | Forget | Full control |
| config | View | Modify | - | - | Full control |
| secrets | - | Store | - | - | Full control |

## Encryption

### Data at Rest

```python
# Encrypt sensitive data
POST /api/v1/security/encrypt
{
  "data": "sensitive information"
}

# Decrypt
POST /api/v1/security/decrypt
{
  "data": "encrypted_data_base64"
}
```

### Secrets Management

```python
# Store a secret
POST /api/v1/security/secrets/store
{
  "name": "api_key",
  "value": "secret_value"
}

# Retrieve a secret
GET /api/v1/security/secrets/api_key
```

### Best Practices

1. **Never store secrets in code** - Use the secrets manager
2. **Rotate secrets regularly** - Set up automated rotation
3. **Use environment variables** - For configuration secrets
4. **Encrypt at rest** - Enable encryption for stored secrets
5. **Limit access** - Use least privilege principle

## Network Security

### CORS Configuration

```toml
[api]
cors_origins = "https://yourdomain.com"
cors_methods = "GET,POST,PUT,DELETE"
cors_headers = "Authorization,Content-Type"
```

### Rate Limiting

```toml
[api]
rate_limit_rpm = 60
rate_limit_burst = 10
```

### TLS/SSL

For production deployments:

```nginx
server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

## Docker Security

The Docker configuration includes security hardening:

```yaml
services:
  backend:
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
    read_only: true
    tmpfs:
      - /tmp
```

## Audit Logging

All security events are logged via the event bus:

```bash
# View security events
GET /api/v1/observability/events?event_type=SECURITY

# Event types
- AUTHENTICATION_SUCCESS
- AUTHENTICATION_FAILURE
- PERMISSION_GRANTED
- PERMISSION_DENIED
- SECRET_ACCESSED
- ENCRYPTION_USED
```

## Security Checklist

### Development

- [ ] Use environment variables for secrets
- [ ] Enable authentication in development
- [ ] Test with different permission levels
- [ ] Review audit logs regularly

### Production

- [ ] Enable authentication and authorization
- [ ] Configure rate limiting
- [ ] Enable TLS/SSL
- [ ] Set up secret rotation
- [ ] Configure CORS for your domain
- [ ] Enable audit logging
- [ ] Regular security scans
- [ ] Monitor for suspicious activity

### Deployment

- [ ] Use Docker security hardening
- [ ] Run containers as non-root
- [ ] Limit container resources
- [ ] Use network segmentation
- [ ] Enable container scanning
- [ ] Implement pod security policies

## Compliance

MITRA supports compliance requirements for:

- **GDPR**: Data encryption, access controls, audit trails
- **SOC 2**: Security monitoring, access logging, encryption
- **HIPAA**: Data protection, access controls, audit logging
- **PCI DSS**: Encryption, access controls, monitoring

## Security Updates

Subscribe to security notifications:

```bash
# Check for updates
aios config show security

# Update dependencies
pip install --upgrade aios
```

## Reporting Security Issues

Report security vulnerabilities to: security@mitra-ai.com

Do not disclose security issues publicly until a fix is available.
