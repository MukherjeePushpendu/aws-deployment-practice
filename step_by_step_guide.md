# Step-by-Step AWS Deployment Guide for Beginners

This guide will walk you through deploying your Flask backend and Express frontend application using three different methods.

## Prerequisites

1. **AWS Account Setup**
   - Create an AWS account at https://aws.amazon.com
   - Set up billing information
   - Create an IAM user with programmatic access
   - Save your AWS Access Key ID and Secret Access Key

2. **Local Development Setup**
   - Install Git: https://git-scm.com/downloads
   - Install Node.js: https://nodejs.org
   - Install Python: https://www.python.org/downloads/
   - Install Docker: https://www.docker.com/products/docker-desktop
   - Install AWS CLI: https://aws.amazon.com/cli/

3. **AWS CLI Configuration**
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Enter your preferred region (e.g., us-east-1)
   # Enter output format (json)
   ```

## Method 1: Single EC2 Instance Deployment

### Step 1: Launch EC2 Instance
1. Go to AWS Console → EC2
2. Click "Launch Instance"
3. Choose "Amazon Linux 2023 AMI"
4. Select "t2.micro" (free tier)
5. Click "Next: Configure Instance Details"
6. Click "Next: Add Storage" (use default 8GB)
7. Click "Next: Add Tags"
8. Click "Next: Configure Security Group"
   - Add these rules:
     - SSH (Port 22) from anywhere
     - HTTP (Port 80) from anywhere
     - HTTPS (Port 443) from anywhere
     - Custom TCP (Port 3000) from anywhere
     - Custom TCP (Port 5000) from anywhere
9. Click "Review and Launch"
10. Create a new key pair, download it, and save it securely

### Step 2: Connect to EC2 Instance
```bash
# On Windows, use PowerShell
ssh -i path/to/your-key.pem ec2-user@your-instance-ip

# On Mac/Linux
chmod 400 path/to/your-key.pem
ssh -i path/to/your-key.pem ec2-user@your-instance-ip
```

### Step 3: Install Dependencies
```bash
# Update system
sudo yum update -y

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 16

# Install Python
sudo yum install python3 python3-pip -y

# Install PM2
npm install -g pm2

# Install Nginx
sudo yum install nginx -y
```

### Step 4: Clone Repository
```bash
git clone https://github.com/MukherjeePushpendu/aws-deployment-practice.git
cd aws-deployment-practice
```

### Step 5: Deploy Backend
```bash
cd backend
pip3 install -r requirements.txt
pm2 start gunicorn -- -w 4 -b 0.0.0.0:5000 app:app
```

### Step 6: Deploy Frontend
```bash
cd ../frontend
npm install
npm run build
pm2 start npm --name "frontend" -- start
```

### Step 7: Configure Nginx
```bash
sudo nano /etc/nginx/conf.d/app.conf
```

Add this configuration:
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

## Method 2: Separate EC2 Instances

### Step 1: Launch Two EC2 Instances
1. Follow the same steps as Method 1, but create two instances:
   - Backend Instance
   - Frontend Instance

### Step 2: Backend Instance Setup
1. Connect to backend instance
2. Install Python and dependencies
3. Clone repository
4. Deploy backend:
```bash
cd aws-deployment-practice/backend
pip3 install -r requirements.txt
pm2 start gunicorn -- -w 4 -b 0.0.0.0:5000 app:app
```

### Step 3: Frontend Instance Setup
1. Connect to frontend instance
2. Install Node.js and dependencies
3. Clone repository
4. Update backend URL in frontend:
```bash
cd aws-deployment-practice/frontend
npm install
# Edit .env file to point to backend instance
echo "BACKEND_URL=http://backend-instance-ip:5000" > .env
npm run build
pm2 start npm --name "frontend" -- start
```

### Step 4: Configure Nginx on Frontend Instance
```bash
sudo nano /etc/nginx/conf.d/app.conf
```

Add this configuration:
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

## Method 3: Docker Container Deployment

### Step 1: Create ECR Repositories
```bash
# Create repositories
aws ecr create-repository --repository-name flask-backend
aws ecr create-repository --repository-name express-frontend

# Get login command
aws ecr get-login-password --region your-region | docker login --username AWS --password-stdin your-account-id.dkr.ecr.your-region.amazonaws.com
```

### Step 2: Build and Push Docker Images
```bash
# Build backend
cd backend
docker build -t flask-backend .
docker tag flask-backend:latest your-account-id.dkr.ecr.your-region.amazonaws.com/flask-backend:latest
docker push your-account-id.dkr.ecr.your-region.amazonaws.com/flask-backend:latest

# Build frontend
cd ../frontend
docker build -t express-frontend .
docker tag express-frontend:latest your-account-id.dkr.ecr.your-region.amazonaws.com/express-frontend:latest
docker push your-account-id.dkr.ecr.your-region.amazonaws.com/express-frontend:latest
```

### Step 3: Create VPC
1. Go to AWS Console → VPC
2. Click "Create VPC"
3. Select "VPC and more"
4. Configure:
   - VPC name: app-vpc
   - Number of AZs: 2
   - Number of public subnets: 2
   - Number of private subnets: 2
   - NAT gateways: 1
   - VPC endpoints: None

### Step 4: Create ECS Cluster
1. Go to AWS Console → ECS
2. Click "Create Cluster"
3. Choose "Networking only"
4. Name: app-cluster
5. Select your VPC
6. Click "Create"

### Step 5: Create Task Definitions
1. Go to ECS → Task Definitions
2. Create task definition for backend:
   - Name: backend-task
   - Container: flask-backend
   - Image: your-ecr-url/flask-backend:latest
   - Port mappings: 5000
3. Create task definition for frontend:
   - Name: frontend-task
   - Container: express-frontend
   - Image: your-ecr-url/express-frontend:latest
   - Port mappings: 3000

### Step 6: Create Services
1. In your ECS cluster, click "Create Service"
2. For backend:
   - Launch type: FARGATE
   - Task definition: backend-task
   - Service name: backend-service
   - Number of tasks: 1
   - VPC: your-vpc
   - Subnets: private subnets
3. For frontend:
   - Launch type: FARGATE
   - Task definition: frontend-task
   - Service name: frontend-service
   - Number of tasks: 1
   - VPC: your-vpc
   - Subnets: public subnets

### Step 7: Create Application Load Balancer
1. Go to EC2 → Load Balancers
2. Click "Create Load Balancer"
3. Choose "Application Load Balancer"
4. Configure:
   - Name: app-alb
   - Scheme: internet-facing
   - IP address type: ipv4
   - VPC: your-vpc
   - Subnets: public subnets
5. Add listeners:
   - HTTP:80
6. Add target groups:
   - Frontend: port 3000
   - Backend: port 5000

## Testing Your Deployment

1. **Single EC2 Instance**:
   - Visit: http://your-ec2-ip
   - Health check: http://your-ec2-ip/health
   - API test: http://your-ec2-ip/api/data

2. **Separate EC2 Instances**:
   - Visit: http://frontend-ec2-ip
   - Health check: http://frontend-ec2-ip/health
   - API test: http://frontend-ec2-ip/api/data

3. **Docker Container**:
   - Visit: http://your-alb-dns
   - Health check: http://your-alb-dns/health
   - API test: http://your-alb-dns/api/data

## Troubleshooting

1. **Check Logs**:
   ```bash
   # PM2 logs
   pm2 logs

   # Nginx logs
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log

   # ECS logs
   aws logs get-log-events --log-group-name /ecs/your-service
   ```

2. **Check Security Groups**:
   - Ensure ports are open
   - Check inbound/outbound rules

3. **Check VPC Settings**:
   - Verify subnet configurations
   - Check route tables
   - Verify NAT gateway

## Clean Up

1. **EC2 Instances**:
   - Terminate instances
   - Delete security groups
   - Release elastic IPs

2. **ECS Resources**:
   - Delete services
   - Delete task definitions
   - Delete cluster

3. **VPC Resources**:
   - Delete load balancer
   - Delete NAT gateway
   - Delete VPC

4. **ECR Repositories**:
   - Delete repositories
   - Remove images

Remember to always clean up resources when you're done to avoid unnecessary charges! 