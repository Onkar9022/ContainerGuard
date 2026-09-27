# ContainerGuard — CloudWatch Observability & Logging Architecture

This document defines the observability design, logging standards, and the manual AWS/EC2 configuration procedure for **Phase 25.1** of the ContainerGuard project.

---

## 1. Observability Architecture

ContainerGuard employs a **12-factor cloud-native logging pattern**:

```
Application (Express/Node.js)
   │ (Single-line JSON via logger.js & morgan)
   ▼
stdout / stderr
   │ (Captured by Docker Engine)
   ▼
Docker json-file Log Driver
   │ (Rotated: max-size 10MB, max-file 3)
   ▼
Host Filesystem (/var/lib/docker/containers/<id>/<id>-json.log)
   │ (Tailed by Amazon CloudWatch Agent)
   ▼
AWS CloudWatch Logs
   ├── /containerguard/prod/backend
   ├── /containerguard/prod/frontend
   ├── /containerguard/prod/nginx
   └── /containerguard/prod/postgres
```

### Key Architectural Decisions:
1. **Zero Application Coupling with AWS SDK:**
   The backend container does not directly talk to the CloudWatch API. This keeps the application container lightweight, portable, testable locally without AWS mocks, and free of AWS credentials.
2. **Stdout/Stderr as Single Source of Truth:**
   All application and access logs are written directly to standard output and standard error streams.
3. **No Persistent In-Container Log Files:**
   Logs never accumulate inside container filesystems. Disk space is guarded via Docker log rotation.
4. **CloudWatch Agent on EC2 Host:**
   Log ingestion into AWS CloudWatch is delegated to the host-level Amazon CloudWatch Agent running under an EC2 IAM Instance Profile.

---

## 2. Project-Side Configuration (Implemented)

### A. Structured JSON Logging (`BackEnd/src/utils/logger.js`)
In production (`NODE_ENV=production`), the application emits single-line JSON with the following structure:
```json
{
  "timestamp": "2026-09-27T14:40:00.123Z",
  "level": "INFO",
  "service": "containerguard-backend",
  "message": "Database connection established successfully",
  "context": {
    "service": "postgres",
    "database": "containerguard"
  }
}
```

In development (`NODE_ENV=development`), the logger outputs clean, human-readable terminal lines with color-coded severity icons.

### B. Automatic Secret & Credential Redaction
The logger includes a recursive `sanitize()` pipeline that automatically redacts:
- Embedded database passwords in connection strings (`postgresql://user:***@host:5432/db`)
- Sensitive object keys matching `password`, `token`, `secret`, `jwt`, `cookie`, `auth`, `authorization`, `apikey`, `key`
- Stack traces are logged internally in server logs, but sanitized client-facing error responses are returned to callers.

### C. Application Lifecycle Logging
The backend produces structured logs for all critical lifecycle events:
- **Server Startup:** Service name, port, node environment, version
- **Database Connection:** Verified on startup before HTTP listen
- **Socket.IO Real-Time Engine:** Handlers bound for live container logs
- **Graceful Shutdown:** `SIGTERM` / `SIGINT` signals initiate orderly termination of workers, HTTP server, and database connection pools.
- **Process Errors:** Uncaught exceptions and unhandled promise rejections are logged with severity `FATAL` / `ERROR`.

### D. Subsystem Error & Event Logging
- **Docker Integration:** Socket connection errors, engine timeouts, and inspect failures are logged with context.
- **Vulnerability Scanning (Trivy):** Image scan starts, completions, vulnerability counts, and scan failures are logged.
- **Metrics Worker:** Metric collection cycles and persistence batch errors are tracked.
- **Alert Worker:** Rule evaluations (`AL001` to `AL006`) and state changes (open, resolved) are logged with container metadata.

### E. Docker Log Rotation (`docker-compose.prod.yml`)
All production containers (`postgres`, `backend`, `frontend`, `nginx`) are configured with:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```
This guarantees that container logs cannot exceed 30MB per container, eliminating the risk of EC2 disk exhaustion.

### F. Observability Health Route (`GET /api/health`)
Safe service status information is exposed without leaking internal credentials:
```json
{
  "status": "ok",
  "service": "containerguard-api",
  "version": "1.0.0",
  "environment": "production",
  "database": "connected",
  "uptime": 12450,
  "timestamp": "2026-09-27T14:40:00.000Z"
}
```

---

## 3. Log Hygiene & Security Rules

### What Must NEVER Be Logged:
- PostgreSQL passwords or raw `DATABASE_URL` strings
- JWT secret tokens or user authorization bearer tokens
- AWS IAM credentials, session tokens, or secret access keys
- Docker socket authentication credentials
- Full HTTP request bodies that could contain authentication payloads
- Raw environment variable dumps (`process.env`)

---

## 4. Recommended CloudWatch Log Structure

| Service | Recommended Log Group Name | Recommended Retention |
| :--- | :--- | :--- |
| **Backend API** | `/containerguard/prod/backend` | 30 days |
| **Nginx Gateway** | `/containerguard/prod/nginx` | 14 days |
| **PostgreSQL Database** | `/containerguard/prod/postgres` | 30 days |
| **Frontend Web** | `/containerguard/prod/frontend` | 7 days |

**Log Stream Naming Convention:**
`{instance_id}-{container_name}` (e.g. `i-0196fe146e9708f8e-containerguard-prod-backend`)

---

## 5. AWS-Side Manual Configuration Guide

Follow these steps manually on AWS and the EC2 instance (`i-0196fe146e9708f8e`) to enable CloudWatch collection.

### Step 1: Verify EC2 IAM Instance Profile Permissions

The EC2 instance needs permission to push log streams to CloudWatch Logs.

1. Ensure the IAM Role attached to the EC2 instance (e.g., `ContainerGuardEC2Role` or similar instance profile) has the AWS managed policy:
   - `CloudWatchAgentServerPolicy`

2. **Or attach a custom least-privilege IAM policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:ap-south-1:461415799543:log-group:/containerguard/prod/*"
    }
  ]
}
```

### Step 2: Connect to EC2 via AWS Systems Manager (SSM)

Open AWS Systems Manager Session Manager or run via AWS CLI:
```bash
aws ssm start-session --target i-0196fe146e9708f8e --region ap-south-1
```

### Step 3: Install the Amazon CloudWatch Agent on EC2

On Amazon Linux 2023:
```bash
sudo dnf install -y amazon-cloudwatch-agent
```

On Ubuntu / Debian:
```bash
sudo wget https://s3.ap-south-1.amazonaws.com/amazoncloudwatch-agent-ap-south-1/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
rm -f ./amazon-cloudwatch-agent.deb
```

### Step 4: Configure CloudWatch Agent to Ingest Docker Container Logs

Create the CloudWatch Agent configuration file at `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json`:

```bash
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null << 'EOF'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/lib/docker/containers/*/*-json.log",
            "log_group_name": "/containerguard/prod/containers",
            "log_stream_name": "{instance_id}-all-containers",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S.%fZ",
            "multi_line_start_pattern": "^{\"log\":",
            "retention_in_days": 30
          }
        ]
      }
    }
  }
}
EOF
```

> **Tip for Container-Specific Log Groups:**
> If you prefer individual log groups per container (`/containerguard/prod/backend`, etc.), Docker can forward logs to the host syslog daemon (`rsyslog`), or you can point CloudWatch Agent directly to symlinks or named log tags via Docker's `--log-opt tag="{{.Name}}"`.

### Step 5: Start and Enable the CloudWatch Agent

Apply the configuration and restart the agent service:

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

Verify the agent status:
```bash
sudo systemctl status amazon-cloudwatch-agent
```

Check the agent's internal operational logs for connection issues:
```bash
sudo tail -n 50 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
```

---

## 6. Verification Commands

From your local machine or administrator workstation (with AWS CLI configured):

### A. List Created Log Groups
```bash
aws logs describe-log-groups \
  --log-group-name-prefix /containerguard/prod \
  --region ap-south-1
```

### B. Verify Log Streams
```bash
aws logs describe-log-streams \
  --log-group-name /containerguard/prod/containers \
  --order-by LastEventTime \
  --descending \
  --region ap-south-1
```

### C. Inspect Live Log Events
```bash
aws logs filter-log-events \
  --log-group-name /containerguard/prod/containers \
  --limit 20 \
  --region ap-south-1
```

---

## 7. CloudWatch Logs Insights Useful Queries

Once logs are streaming into CloudWatch, use CloudWatch Logs Insights in the AWS Console to run operational queries:

### 1. Find Application & Worker Errors
```sql
fields @timestamp, @message
| filter @message like /"level":"ERROR"/ or @message like /"level":"FATAL"/
| sort @timestamp desc
| limit 50
```

### 2. Slow HTTP Requests (> 500ms)
```sql
fields @timestamp, context.method, context.url, context.status, context.responseTimeMs
| filter context.type = "HTTP_REQUEST" and context.responseTimeMs > 500
| sort context.responseTimeMs desc
| limit 20
```

### 3. Track Trivy Security Scans
```sql
fields @timestamp, context.image, context.totalVulnerabilities, message
| filter context.context = "Security"
| sort @timestamp desc
| limit 25
```

### 4. Alert Worker Trigger Events
```sql
fields @timestamp, context.alertCode, context.containerName, message
| filter context.context = "AlertService" or context.context = "AlertWorker"
| sort @timestamp desc
| limit 30
```
