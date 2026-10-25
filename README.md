# TeamConnect

TeamConnect helps students find campus projects that match their skills, form teams, and coordinate work in a shared project workspace. Institution email domains keep each campus community scoped to its institution.

## Features

- Student registration, login, profile setup, skill and interest onboarding.
- Project creation and moderation, role applications, invitations, and notifications.
- Skill-based project and role matching with match scores and gap charts.
- Team workspaces with an overview, task board, milestones, announcements, and real-time chat.
- Admin project approval, rejection, and archiving.

## Tech stack

- **Client:** React 18, Vite, Tailwind CSS, React Router, Framer Motion, Recharts, Lucide, Socket.IO client.
- **Server:** Node.js, Express, Prisma, SQLite for local development, Socket.IO.
- **Authentication:** bcrypt password hashes and JWT sessions.

## Setup

Requirements: Node.js 18 or newer and npm 9 or newer.

1. Install and configure the server:

   ```powershell
   cd server
   npm install
   Copy-Item .env.example .env # only if .env does not already exist
   ```

   Set a private `JWT_SECRET` in `server/.env`. The example uses SQLite at `server/prisma/dev.db`; adjust `DATABASE_URL` only if you use a different database.

2. Create the local database and demo data:

   ```powershell
   npx prisma generate
   npx prisma db push
   npm run seed
   ```

3. Start the API in this terminal:

   ```powershell
   npm run dev
   ```

   The API listens on `http://localhost:5000`; verify it at `/api/health`.

4. In a second terminal, install and start the client:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. The current client API and Socket.IO endpoints target `localhost:5000`.

## Tests and build

Run the server test suite:

```powershell
cd server
npm test -- --runInBand
```

Build the client for production:

```powershell
cd client
npm run build
```

To refresh the demo records, run `npm run seed` from `server`; the seed uses upserts and checks existing workspace records to avoid duplicates.

## Demo credentials

All listed passwords are for local demo use only. Student emails must match the seeded institution domain when registering.
The DYP DPU demo institution is Dr. D. Y. Patil Vidyapeeth, Pune.

| Role | Email | Password | Notes |
|---|---|---|---|
| Student | `bob@dpu.edu.in` | `demo1234` | DYP DPU student account |
| Workspace owner | `alice@dpu.edu.in` | `demo1234` | Owns the seeded CampusConnect workspace |
| Workspace member | `frank@dpu.edu.in` | `demo1234` | Accepted Backend Developer on CampusConnect |
| Same-institution non-member | `sam@dpu.edu.in` | `demo1234` | Cannot access the CampusConnect workspace |
| Other-institution student | `henry@stanford.edu` | `demo1234` | Used to check institution boundaries |
| Admin | `admin@dpu.edu.in` | `admin1234` | DYP DPU project moderation |

## Folder structure

```text
client/                 React application and shared UI
  src/pages/             Public, student, and admin pages
  src/components/        Shared layout, project, notification, and chart UI
  src/lib/api.js         Client API wrapper
server/                 Express API and Socket.IO server
  prisma/schema.prisma   Database schema
  prisma/seed.js         Idempotent local demo seed
  src/routes/            API routes
  src/services/          Matching and workspace policies
README.md                Project setup and feature guide
```

## Known limitations

- The admin interface currently exposes project moderation only; dedicated student, skills, recommendation, challenge, report, and audit pages are not implemented in the client.
- Teacher recommendation delivery is a demo flow: it returns a link, but does not send email. Configure an email provider and delivery service before production use.
- The automated Jest suite is service-level coverage; it does not yet exercise every full HTTP/socket flow end to end.
- The client currently targets the local API at `http://localhost:5000`; production deployments need an environment-aware API URL and matching CORS configuration.
