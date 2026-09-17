import { SnippetDefinition } from '../extensionTypes'

// 1. Terraform / HCL Snippets
export const TERRAFORM_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'terraform-module-aws',
    detail: 'Terraform (HCL): Modern AWS VPC & Container Cluster Module',
    documentation: 'Terraform configuration with terraform block, required_providers, locals, and resources',
    insertText: 'terraform {\n  required_version = ">= 1.9.0"\n  required_providers {\n    aws = {\n      source  = "hashicorp/aws"\n      version = "~> 5.60"\n    }\n  }\n}\n\nprovider "aws" {\n  region = var.aws_region\n}\n\nvariable "aws_region" {\n  type    = string\n  default = "us-east-1"\n}\n\nvariable "environment" {\n  type    = string\n  default = "production"\n}\n\nlocals {\n  name_prefix = "indoctrinated-\${var.environment}"\n}\n\nresource "aws_vpc" "main" {\n  cidr_block           = "10.0.0.0/16"\n  enable_dns_hostnames = true\n  enable_dns_support   = true\n\n  tags = {\n    Name        = "\${local.name_prefix}-vpc"\n    Environment = var.environment\n  }\n}\n\noutput "vpc_id" {\n  description = "ID of the provisioned VPC"\n  value       = aws_vpc.main.id\n}\n$0',
  },
  {
    label: 'terraform-s3-bucket-secure',
    detail: 'Terraform: Secure S3 Bucket with SSE, Versioning & Public Block',
    documentation: 'Hardened cloud storage bucket with encryption and public access block',
    insertText: 'resource "aws_s3_bucket" "artifacts" {\n  bucket        = "\${local.name_prefix}-build-artifacts"\n  force_destroy = false\n}\n\nresource "aws_s3_bucket_versioning" "artifacts" {\n  bucket = aws_s3_bucket.artifacts.id\n  versioning_configuration {\n    status = "Enabled"\n  }\n}\n\nresource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {\n  bucket = aws_s3_bucket.artifacts.id\n  rule {\n    apply_server_side_encryption_by_default {\n      sse_algorithm = "AES256"\n    }\n  }\n}\n\nresource "aws_s3_bucket_public_access_block" "artifacts" {\n  bucket = aws_s3_bucket.artifacts.id\n  block_public_acls       = true\n  block_public_policy     = true\n  ignore_public_acls      = true\n  restrict_public_buckets = true\n}\n$0',
  },
]

// 2. Docker / Containerfile Snippets
export const DOCKER_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'dockerfile-multistage-node',
    detail: 'Dockerfile: Multi-Stage Production Build with Non-Root User',
    documentation: 'Optimized production Dockerfile with alpine base, build stage, non-root user, and dumb-init',
    insertText: '# --- Build Stage ---\nFROM node:22-alpine AS builder\nWORKDIR /app\nRUN apk add --no-cache libc6-compat\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\n# --- Production Runner Stage ---\nFROM node:22-alpine AS runner\nWORKDIR /app\nENV NODE_ENV=production\nRUN addgroup --system --gid 1001 nodejs && \\\n    adduser --system --uid 1001 appuser\n\nCOPY --from=builder /app/dist ./dist\nCOPY --from=builder /app/node_modules ./node_modules\nCOPY --from=builder /app/package.json ./package.json\n\nUSER appuser\nEXPOSE 3000\nENV PORT=3000\n\nCMD ["node", "dist/main.js"]\n$0',
  },
  {
    label: 'docker-compose-app',
    detail: 'Docker Compose: Full-Stack App with Database & Redis',
    documentation: 'Docker Compose v2 configuration with healthchecks, volumes, and networks',
    insertText: 'services:\n  app:\n    build:\n      context: .\n      dockerfile: Dockerfile\n    ports:\n      - "3000:3000"\n    environment:\n      - NODE_ENV=production\n      - DATABASE_URL=postgres://appuser:secret@postgres:5432/appdb\n      - REDIS_URL=redis://redis:6379\n    depends_on:\n      postgres:\n        condition: service_healthy\n    restart: unless-stopped\n\n  postgres:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_USER: appuser\n      POSTGRES_PASSWORD: secret\n      POSTGRES_DB: appdb\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]\n      interval: 5s\n      timeout: 5s\n      retries: 5\n\nvolumes:\n  pgdata:\n$0',
  },
]

// 3. Kubernetes Manifests
export const KUBERNETES_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'k8s-deployment-service',
    detail: 'Kubernetes: Deployment & ClusterIP Service Manifest',
    documentation: 'Production Kubernetes Deployment with resource limits, liveness probe, and Service',
    insertText: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ${1:indoctrinated-service}\n  labels:\n    app: ${1:indoctrinated-service}\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: ${1:indoctrinated-service}\n  template:\n    metadata:\n      labels:\n        app: ${1:indoctrinated-service}\n    spec:\n      containers:\n        - name: app\n          image: ${2:ghcr.io/org/service:v1.0.0}\n          ports:\n            - containerPort: 3000\n          resources:\n            limits:\n              cpu: "500m"\n              memory: "512Mi"\n            requests:\n              cpu: "100m"\n              memory: "128Mi"\n          livenessProbe:\n            httpGet:\n              path: /health\n              port: 3000\n            initialDelaySeconds: 15\n            periodSeconds: 20\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: ${1:indoctrinated-service}\nspec:\n  selector:\n    app: ${1:indoctrinated-service}\n  ports:\n    - port: 80\n      targetPort: 3000\n  type: ClusterIP\n$0',
  },
  {
    label: 'k8s-ingress-tls',
    detail: 'Kubernetes: Ingress with TLS Cert-Manager Annotation',
    documentation: 'Ingress routing rules with automatic Let\'s Encrypt SSL certificate provisioning',
    insertText: 'apiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: ${1:indoctrinated-ingress}\n  annotations:\n    cert-manager.io/cluster-issuer: "letsencrypt-prod"\n    nginx.ingress.kubernetes.io/ssl-redirect: "true"\nspec:\n  ingressClassName: nginx\n  tls:\n    - hosts:\n        - ${2:api.example.com}\n      secretName: ${2:api.example.com}-tls\n  rules:\n    - host: ${2:api.example.com}\n      http:\n        paths:\n          - path: /\n            pathType: Prefix\n            backend:\n              service:\n                name: ${1:indoctrinated-service}\n                port:\n                  number: 80\n$0',
  },
]

export const DEVOPS_SNIPPETS: SnippetDefinition[] = [
  ...TERRAFORM_SNIPPETS,
  ...DOCKER_SNIPPETS,
  ...KUBERNETES_SNIPPETS,
]

export const devopsSnippets = DEVOPS_SNIPPETS
