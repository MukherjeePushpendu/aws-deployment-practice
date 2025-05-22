# AWS Deployment Guide for Flask Backend and Express Frontend

This guide covers three different deployment strategies for your Flask backend and Express frontend application on AWS.

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. Docker installed (for container deployment)
4. Basic knowledge of AWS services
5. Your application code ready for deployment

## 1. Single EC2 Instance Deployment

### Step 1: Launch an EC2 Instance
1. Go to AWS Console → EC2
2. Click "Launch Instance"
3. Choose Amazon Linux 2023 AMI
4. Select t2.micro (free tier eligible)
5. Configure Security Group:
   - Allow SSH (Port 22)
   - Allow HTTP (Port 80)
   - Allow HTTPS (Port 443)
   - Allow custom TCP (Port 3000 for Express)
   - Allow custom TCP (Port 5000 for Flask)

### Step 2: Connect to EC2 Instance
```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

### Step 3: Install Dependencies
```bash
# Update system
sudo yum update -y

# Install Node.js and npm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 16

# Install Python and pip
sudo yum install python3 python3-pip -y

# Install PM2 for Node.js process management
npm install -g pm2

# Install Nginx
sudo yum install nginx -y
```

### Step 4: Deploy Backend (Flask)
```bash
# Create directory for backend
mkdir ~/backend
cd ~/backend

# Clone your repository or copy files
# Install Python dependencies
pip3 install -r requirements.txt

# Start Flask with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Step 5: Deploy Frontend (Express)
```bash
# Create directory for frontend
mkdir ~/frontend
cd ~/frontend

# Clone your repository or copy files
# Install dependencies
npm install

# Build the application
npm run build

# Start with PM2
pm2 start npm --name "frontend" -- start
```

### Step 6: Configure Nginx
```bash
sudo nano /etc/nginx/conf.d/app.conf
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo systemctl restart nginx
```

## 2. Separate EC2 Instances Deployment

### Step 1: Launch Two EC2 Instances
1. Follow the same steps as above but create two instances:
   - Backend Instance (Flask)
   - Frontend Instance (Express)

### Step 2: Backend Instance Setup
1. Connect to backend instance
2. Install Python and dependencies
3. Deploy Flask application
4. Configure security group to allow traffic from frontend instance

### Step 3: Frontend Instance Setup
1. Connect to frontend instance
2. Install Node.js and dependencies
3. Deploy Express application
4. Update API endpoint in frontend code to point to backend instance

### Step 4: Configure Nginx on Frontend Instance
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://backend-instance-ip:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 3. Docker Container Deployment using ECR, ECS, and VPC

### Step 1: Create ECR Repositories
```bash
# Create repositories for both services
aws ecr create-repository --repository-name flask-backend
aws ecr create-repository --repository-name express-frontend
```

### Step 2: Create Dockerfiles

Backend Dockerfile:
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

Frontend Dockerfile:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Step 3: Build and Push Docker Images
```bash
# Login to ECR
aws ecr get-login-password --region your-region | docker login --username AWS --password-stdin your-account-id.dkr.ecr.your-region.amazonaws.com

# Build and push backend
docker build -t flask-backend .
docker tag flask-backend:latest your-account-id.dkr.ecr.your-region.amazonaws.com/flask-backend:latest
docker push your-account-id.dkr.ecr.your-region.amazonaws.com/flask-backend:latest

# Build and push frontend
docker build -t express-frontend .
docker tag express-frontend:latest your-account-id.dkr.ecr.your-region.amazonaws.com/express-frontend:latest
docker push your-account-id.dkr.ecr.your-region.amazonaws.com/express-frontend:latest
```

### Step 4: Create VPC and Security Groups
1. Create a VPC with public and private subnets
2. Create security groups for ECS tasks
3. Configure NAT Gateway for private subnet access

### Step 5: Create ECS Cluster and Services
1. Create ECS Cluster
2. Create Task Definitions for both services
3. Create Services:
   - Backend service in private subnet
   - Frontend service in public subnet
4. Configure Application Load Balancer

### Step 6: Update Frontend Configuration
Update the frontend environment variables to point to the backend service:
```javascript
REACT_APP_API_URL=http://your-alb-dns/api
```

## Monitoring and Maintenance

1. Set up CloudWatch alarms for:
   - CPU utilization
   - Memory usage
   - Request latency
   - Error rates

2. Configure auto-scaling policies based on metrics

3. Set up logging:
   - CloudWatch Logs for containers
   - Application logs
   - Access logs

## Security Best Practices

1. Use AWS Secrets Manager for sensitive data
2. Implement IAM roles with least privilege
3. Enable VPC Flow Logs
4. Use AWS WAF for web application firewall
5. Regular security updates and patches
6. Enable AWS Shield for DDoS protection

## Cost Optimization

1. Use appropriate instance sizes
2. Implement auto-scaling
3. Use Spot Instances where possible
4. Monitor and optimize resource usage
5. Use AWS Cost Explorer for tracking expenses

## Backup and Disaster Recovery

1. Regular EBS snapshots
2. Cross-region replication
3. Database backups
4. Document recovery procedures
5. Regular testing of recovery processes 