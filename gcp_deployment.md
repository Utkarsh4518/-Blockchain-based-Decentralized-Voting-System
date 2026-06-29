# GCP Deployment and Submission Guide

This guide describes how to deploy the containerized Decentralized Voting System to the **Google Cloud Platform (GCP)** and prepare the final submission for the lecturer team.

---

## 1. Chosen GCP Product: Google Compute Engine (GCE)

For hosting a multi-container Docker Compose orchestration (PostgreSQL, Ganache node, backend, and frontend), **Google Compute Engine (VM)** is the most cost-effective and straightforward choice. It allows you to run your identical local docker setup on a remote public-facing VM instance.

---

## 2. Step-by-Step GCP Deployment

### Step A: Create and Configure a GCE VM Instance
1. Go to the **Google Cloud Console** and navigate to **Compute Engine > VM Instances**.
2. Click **Create Instance**.
3. Select configuration details:
   - **Machine Configuration**: `e2-medium` (2 vCPUs, 4 GB RAM is sufficient and stays within student grant limits).
   - **Boot Disk**: Ubuntu 22.04 LTS (x86/64), Size 20 GB.
   - **Firewall**: Enable **Allow HTTP traffic** and **Allow HTTPS traffic**.
4. Click **Create** and wait for the VM to start. Note down the **External IP** of your VM.

### Step B: Configure Firewall Rules (VPC Network)
By default, GCP blocks ports `4000` (backend) and `8545` (Ganache RPC). We must open them:
1. Go to the GCP console and search for **Firewall**.
2. Click **Create Firewall Rule**.
3. Configure the rule:
   - **Name**: `allow-voting-ports`
   - **Targets**: `All instances in the network`
   - **Source IPv4 Ranges**: `0.0.0.0/0` (Allows public browser connections)
   - **Protocols and Ports**: Check `Specified protocols and ports`, check `tcp`, and enter: `80, 4000, 8545`
4. Click **Create**.

### Step C: Install Docker and Docker Compose on the VM
SSH into your GCE VM (using the GCP console "SSH" button) and run the following setup scripts:

```bash
# Update package list and install prerequisites
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker’s official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the stable repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine & Docker Compose
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installations
sudo docker --version
sudo docker compose version
```

### Step D: Clone and Run the Application
On the GCE VM, clone your git repository and launch the production container structure:

```bash
# Clone the repository
git clone https://github.com/Utkarsh4518/-Blockchain-based-Decentralized-Voting-System.git
cd -Blockchain-based-Decentralized-Voting-System

# Define the build-time public IP address so the client browser calls the remote server instead of localhost
export VITE_API_BASE_URL=http://<YOUR_GCP_VM_EXTERNAL_IP>:4000

# Build and run the containers in detached (background) mode
sudo -E docker compose up --build -d
```

Your system is now live!
- **Frontend**: Access at `http://<YOUR_GCP_VM_EXTERNAL_IP>`
- **Backend API**: Accessible at `http://<YOUR_GCP_VM_EXTERNAL_IP>:4000`
- **Ganache Node**: Listening on `http://<YOUR_GCP_VM_EXTERNAL_IP>:8545`

---

## 3. Uploading Docker Images to DockerHub

To make the containers accessible to the lecturer team:

1. Create an account on [DockerHub](https://hub.docker.com/).
2. Build and tag your backend and frontend images:
   ```bash
   # Log in to DockerHub in your terminal
   docker login

   # Build and tag the backend
   docker build -t <YOUR_DOCKERHUB_USERNAME>/voting-backend:latest ./backend
   docker push <YOUR_DOCKERHUB_USERNAME>/voting-backend:latest

   # Build and tag the frontend (injecting the correct GCP external URL)
   docker build --build-arg VITE_API_BASE_URL=http://<YOUR_GCP_VM_EXTERNAL_IP>:4000 -t <YOUR_DOCKERHUB_USERNAME>/voting-frontend:latest ./frontend
   docker push <YOUR_DOCKERHUB_USERNAME>/voting-frontend:latest
   ```

---

## 4. Submission Email Format

When submitting your lab solution, send an email to `avik.banerjee@tuhh.de` before **July 7th, 2024, 23:59** containing:

```text
Subject: Advanced Internet Computing - Project Topic A Submission (Group XX)

Dear Lecturer Team,

Please find our submission for Project Topic A (Blockchain-based Decentralized Voting System) below.

1. GitLab Repository:
   https://collaborating.tuhh.de/your-group/topic-a

2. Live GCP Deployment:
   http://<YOUR_GCP_VM_EXTERNAL_IP>

3. DockerHub Public Container Images:
   - Frontend: docker pull <YOUR_DOCKERHUB_USERNAME>/voting-frontend:latest
   - Backend:  docker pull <YOUR_DOCKERHUB_USERNAME>/voting-backend:latest

4. Default Seed/Credentials:
   - Admin Login User: admin@example.com
   - Local Ganache RPC Node: http://<YOUR_GCP_VM_EXTERNAL_IP>:8545
   (The backend logs contain a pre-generated Admin JWT token for easy portal login).

Best regards,
[Names of Team Members]
```
