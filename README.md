# Notes & Task Manager — React + Express + Amazon S3

A starter full-stack application with:
- Notes: create, edit, delete, search, pin/unpin
- Tasks: create, edit, delete, search, mark complete/incomplete, priority and due date
- Light/dark theme toggle (saved in browser)
- Amazon S3 object storage (one JSON object per note/task)
- React + Vite frontend; Node.js + Express backend

## Architecture

Browser → React (S3 static hosting + CloudFront) → Express API (EC2) → private S3 bucket

S3 is object storage, not a relational database. This starter stores each note/task as an individual JSON object. It is suitable for a small demo or low-volume personal project. For multi-user production use, add authentication and consider DynamoDB/RDS.

## Requirements

- Node.js 20+ and npm
- An AWS account
- An S3 bucket in the same AWS Region as your backend
- An EC2 instance for the API (or another Node.js host)

## Run locally

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

On Windows PowerShell, copy the environment file with:

```powershell
Copy-Item .env.example .env
```

Set `AWS_REGION` and `S3_BUCKET` in `.env`.

For local development, configure AWS credentials using `aws configure` or an AWS profile. Do not put AWS access keys in source code or commit them.

The API runs at `http://localhost:5000`.

### 2. Frontend

In another terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

The frontend runs at `http://localhost:5173`. `VITE_API_URL` defaults to `http://localhost:5000`.

## S3 setup

1. Create a **private** S3 bucket in your chosen AWS Region.
2. Keep Block Public Access enabled. The browser never accesses S3 directly.
3. Give the backend's EC2 instance an IAM role with the permissions below, scoped to your bucket.
4. Set `AWS_REGION` and `S3_BUCKET` in the backend environment.

Example IAM policy (replace `YOUR_BUCKET_NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListAppObjects",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME"
    },
    {
      "Sid": "ReadWriteAppObjects",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/notes-manager/*"
    }
  ]
}
```

Attach this policy to an IAM role and attach the role to EC2. The AWS SDK automatically uses the instance role. For local development, use an AWS CLI profile instead.

## Deploy overview

### Backend on EC2

1. Launch an EC2 instance that fits the current AWS Free Tier / credits eligibility shown in your account. AWS pricing and free offers change; check the AWS pricing page before launching.
2. Attach the S3 IAM role described above.
3. Install Node.js 20+, Git, and a process manager such as PM2.
4. Copy/clone the `backend` folder to the instance.
5. Set production environment variables (`NODE_ENV=production`, `PORT=5000`, `AWS_REGION`, `S3_BUCKET`, `FRONTEND_ORIGIN`).
6. Run `npm ci --omit=dev` and `npm start`, preferably under PM2.
7. Put the API behind HTTPS using a domain and a reverse proxy / load balancer, or use an HTTPS-capable hosting service. Do not leave a production API exposed over plain HTTP.

### Frontend on S3 + CloudFront

1. Set `VITE_API_URL` to your deployed HTTPS API URL in `frontend/.env.production`.
2. Run `npm install` and `npm run build`.
3. Create a private S3 bucket for frontend build files and use CloudFront Origin Access Control (OAC) to serve it. Do not make the bucket public.
4. Upload the contents of `frontend/dist` to the frontend bucket.
5. Configure CloudFront's default root object as `index.html`.

You can also use AWS Amplify Hosting for the frontend if that is easier.

## Important security / production notes

- Never commit `.env` files, AWS access keys, or database credentials.
- Keep the data bucket private and grant only the backend role access.
- Configure `FRONTEND_ORIGIN` to your exact frontend origin in production.
- Add authentication before allowing multiple people to use the app. This demo has no login; anyone who can reach the API may be able to access its data.
- S3 object-per-record is simple, but listing/searching requires listing objects and fetching JSON files. It is not optimized for large datasets.
- S3 is not a database transaction system. Concurrent edits to the same item can overwrite one another.
- Set an AWS Budget alert. EC2, public IPv4, CloudFront, S3 requests/storage, and data transfer may incur charges depending on account eligibility and usage.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/notes?search=` | List/search notes |
| POST | `/api/notes` | Create note |
| PUT | `/api/notes/:id` | Update note |
| PATCH | `/api/notes/:id/pin` | Toggle pinned |
| DELETE | `/api/notes/:id` | Delete note |
| GET | `/api/tasks?search=` | List/search tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| PATCH | `/api/tasks/:id/toggle` | Toggle completion |
| DELETE | `/api/tasks/:id` | Delete task |
