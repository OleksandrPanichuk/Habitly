# Habitly - Habit Tracker

A modern, full-stack habit tracking application built with Next.js, focusing on building consistent daily habits through streaks and visual progress tracking.

## 🚀 Features

- **Habit Management** - Create, edit, and organize your daily habits
- **Daily Check-ins** - Simple interface to mark habits as complete
- **Streak Tracking** - Visualize your consistency with streak counters
- **Calendar Heatmap** - GitHub-style heatmap showing your progress over time
- **Progress Analytics** - Track completion rates and patterns
- **Secure Authentication** - User accounts with Better Auth

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Runtime**: [Bun](https://bun.sh/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL 17](https://www.postgresql.org/) (Docker)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **API**: [tRPC](https://trpc.io/)
- **Authentication**: [Better Auth](https://www.better-auth.com/)
- **UI Library**: [Hero UI](https://www.heroui.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Code Quality**: [Biome](https://biomejs.dev/)

## 📋 Prerequisites

- [Bun](https://bun.sh/) 1.0+
- Docker and Docker Compose
- Git

## 🚦 Getting Started

### 1. Clone the repository

```bash
git clone git@github.com:OleksandrPanichuk/Habitly.git
cd habitly
```

### 2. Install dependencies

```bash
bun install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@db:5432/habitly"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-here-generate-a-random-string"
BETTER_AUTH_URL="http://localhost:3000"

# Stripe Billing
NEXT_PUBLIC_APP_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_LIFETIME_PRICE_ID="price_..."
```

Create a `.env.db` file for the database:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=habitly
```

**Generate a secure secret:**
```bash
openssl rand -base64 32
```

To test billing locally, forward Stripe webhooks to the app:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Create two Stripe prices and set them in your environment:
- `STRIPE_PRO_PRICE_ID` for the recurring Pro subscription
- `STRIPE_LIFETIME_PRICE_ID` for the one-time Lifetime purchase

### 4. Start the application with Docker

The project uses Docker Compose to run both the database and Next.js application:

```bash
docker-compose up -d
```

This will:
- Start PostgreSQL 17 on port 5432
- Build and start the Next.js app on port 3000
- Set up a Docker network for communication between services

**Your Docker Compose setup** (`docker-compose.yml`):
```yaml
version: "3.8"
services:
  db:
     image: postgres:17
     env_file:
        - .env.db
     volumes:
        - pgdata:/var/lib/postgresql/data
     networks:
        - habitly-network
     ports:
        - "5432:5432"
  web:
     build:
       context: .
       dockerfile: Dockerfile
     env_file:
        - .env
     environment:
        - WATCHPACK_POLLING=true
        - CHOKIDAR_USEPOLLING=true
     ports:
       - "3000:3000"
     volumes:
       - ./:/app
       - /app/node_modules
       - /app/.next
     networks:
       - habitly-network
volumes:
  pgdata:
networks:
  habitly-network:
    driver: bridge
```

**Dockerfile** (using Bun):
```dockerfile
FROM oven/bun:latest as base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY . .
EXPOSE 3000
CMD ["bun", "run", "dev", "--", "-H", "0.0.0.0"]
```

### 5. Run database migrations

Wait a few seconds for the database to be ready, then run:

```bash
bunx drizzle-kit push
# or for migrations
bunx drizzle-kit migrate
```

**From within Docker container:**
```bash
docker-compose exec web bunx drizzle-kit push
```

**Note**: If running for the first time, the web service will start automatically. You can check logs with:
```bash
docker-compose logs -f web
```

### 6. Access the application

The application is now running at [http://localhost:3000](http://localhost:3000)

**Development workflow:**

- **With Docker** (recommended): `docker-compose up` - runs everything
- **Local development** (without Docker):
  ```bash
  # Make sure PostgreSQL is running
  docker-compose up db -d
  
  # Run Next.js locally
  bun run dev
  ```

## 📁 Project Structure

```
habitly/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── favicon.ico
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── index.ts          # Component exports
│   │   └── Providers.tsx     # App-wide providers (tRPC, Hero UI)
│   ├── db/                    # Database layer
│   │   ├── index.ts          # Database client
│   │   └── schema.ts         # Drizzle schema definitions
│   ├── lib/                  # Third-party integrations
│   │   ├── auth.ts           # Better Auth setup
│   │   └── auth-client.ts    # Better Auth client
│   └── trpc/                  # tRPC configuration
│       ├── routers/          # API routers
│       │   └── _app.ts       # Root router
│       ├── client.tsx        # tRPC React client
│       ├── init.ts           # tRPC initialization
│       ├── query-client.ts   # React Query setup
│       └── server.tsx        # tRPC server setup
├── public/                    # Static assets
├── .dockerignore             # Docker ignore rules
├── .env                      # Environment variables
├── .env.db                   # Database environment variables
├── .gitignore               # Git ignore rules
├── biome.json               # Biome configuration
├── bun.lock                 # Bun lockfile
├── docker-compose.yml       # Docker services
├── Dockerfile               # Container definition
├── drizzle.config.ts        # Drizzle Kit configuration
├── next-env.d.ts            # Next.js types
├── next.config.ts           # Next.js configuration
├── package.json             # Dependencies
├── postcss.config.mjs       # PostCSS config
├── README.md                # This file
├── tailwind.config.ts       # Tailwind configuration
└── tsconfig.json            # TypeScript configuration
```

## 🗄️ Database Schema

### Habits Table
```typescript
{
  id: serial
  userId: string (references users)
  name: string
  description: string (optional)
  frequency: 'daily' | 'weekly' | 'custom'
  color: string
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Completions Table
```typescript
{
  id: serial
  habitId: number (references habits)
  date: date
  note: string (optional)
  createdAt: timestamp
}
```

## 🔌 API Routes (tRPC)

### Habits Router
- `habits.create` - Create a new habit
- `habits.list` - Get all user habits
- `habits.getById` - Get single habit with history
- `habits.update` - Update habit details
- `habits.delete` - Delete a habit

### Completions Router
- `completions.toggle` - Mark habit as complete/incomplete
- `completions.getByDateRange` - Get completions for calendar view
- `completions.addNote` - Add note to a completion

### Stats Router
- `stats.getCurrentStreaks` - Get current streaks for all habits
- `stats.getCompletionRate` - Get completion percentage
- `stats.getLongestStreak` - Get longest streak per habit

## 🎨 UI Components (Hero UI)

Key components used:
- `Button`, `Input`, `Textarea` - Forms
- `Card`, `CardBody`, `CardHeader` - Content containers
- `Modal`, `ModalContent` - Dialogs
- `Checkbox` - Check-ins
- `Progress` - Completion rates
- `Chip` - Badges for streaks
- `Calendar` - Date selection

## 🔒 Authentication

Better Auth provides:
- Email/password authentication
- Session management
- Protected routes
- User profile management

Protected pages automatically redirect to login if user is not authenticated.

## 📝 Available Scripts

```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run Biome linter
bun run format       # Format code with Biome

# Database (using Drizzle Kit directly)
bunx drizzle-kit push       # Push schema changes to database
bunx drizzle-kit migrate    # Run migrations
bunx drizzle-kit studio     # Open Drizzle Studio (database GUI)
bunx drizzle-kit generate   # Generate migrations from schema

# Docker
docker-compose up         # Start all services
docker-compose up -d      # Start all services in background
docker-compose down       # Stop all services
docker-compose logs -f    # View logs
docker-compose restart    # Restart all services
```

## 🐳 Docker Commands

```bash
# Start all services (database + web app)
docker-compose up -d

# Start only database
docker-compose up db -d

# Stop all services
docker-compose down

# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f web
docker-compose logs -f db

# Rebuild web service after changes
docker-compose up --build web

# Reset database (careful! This deletes all data)
docker-compose down -v
docker-compose up -d

# Execute commands in containers
docker-compose exec web bunx drizzle-kit push
docker-compose exec db psql -U postgres -d habitly

# Restart services
docker-compose restart web
docker-compose restart db
```

## 🧪 Development Tips

### Database Management
- Use Drizzle Studio for visual database management: `bunx drizzle-kit studio`
- Check your database directly: `docker-compose exec db psql -U postgres -d habitly`
- View database logs: `docker-compose logs -f db`

### Docker Development
- Hot reload is enabled with volume mounts (changes reflect immediately)
- `WATCHPACK_POLLING` and `CHOKIDAR_USEPOLLING` ensure file changes are detected in Docker
- If you modify dependencies, rebuild: `docker-compose up --build web`

### Type Safety
- tRPC provides end-to-end type safety
- Run `bun run type-check` before committing
- Use the tRPC React Query hooks for automatic type inference

### Performance
- Bun is significantly faster than npm/yarn for installs and script execution
- First Docker build might take a few minutes; subsequent builds use cache

### Debugging
- View real-time Next.js logs: `docker-compose logs -f web`
- Access the container shell: `docker-compose exec web sh`
- Check environment variables: `docker-compose exec web printenv`

### Code Quality
- Biome handles both linting and formatting
- Run `bun run lint` to check for issues
- Configure rules in `biome.json`

## 🚀 Deployment

### Production Docker Build

For production, you'll want to create an optimized Dockerfile:

```dockerfile
FROM oven/bun:latest as dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:latest as builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:latest as runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["bun", "run", "start"]
```

### Database
Deploy your PostgreSQL database to:
- [Neon](https://neon.tech/) (Recommended - serverless Postgres)
- [Supabase](https://supabase.com/)
- [Railway](https://railway.app/)
- [Vercel Postgres](https://vercel.com/storage/postgres)

Update your `DATABASE_URL` in production environment variables.

### Application
Deploy to:

**Vercel** (Recommended for Next.js):
```bash
bun run build
vercel --prod
```

**Railway/Render** (with Docker):
- Push your code to GitHub
- Connect your repository
- Railway/Render will detect the Dockerfile and build automatically

**Environment Variables** (set in your deployment platform):
```env
DATABASE_URL=your-production-database-url
BETTER_AUTH_SECRET=your-production-secret
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Bun](https://bun.sh/) - Fast all-in-one JavaScript runtime
- [tRPC](https://trpc.io/) - End-to-end typesafe APIs
- [Drizzle](https://orm.drizzle.team/) - TypeScript ORM
- [Better Auth](https://www.better-auth.com/) - Authentication for TypeScript
- [Hero UI](https://www.heroui.com/) - Beautiful React components
- [Biome](https://biomejs.dev/) - Fast formatter and linter

---

Built with ❤️ for consistent habit building
