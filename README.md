# Recipe Store

A self-hosted personal recipe management application with AI-powered recipe import. Store, organize, and manage your recipes with a clean, modern interface.

## Features

- **AI-Powered Import** - Import recipes from URLs (websites, YouTube), screenshots/photos, or pasted text using Google Gemini
- **Full CRUD** - Create, read, update, and delete recipes
- **Categories & Tags** - Organize recipes by categories (Meat, Vegetarian, Seafood, Air Fryer, etc.)
- **Search & Filter** - Find recipes by title, ingredients, or category
- **Cooking Notes** - Log feedback after cooking: ratings, notes, and modifications
- **Recipe Sharing** - Generate public links to share individual recipes with friends/family
- **Meal Planner** - Plan meals for the week with a visual calendar and auto-generated shopping lists
- **Image Upload** - Upload recipe photos from your device (stored locally)
- **Password Protected** - Simple password authentication with JWT sessions
- **SQLite Database** - All data stored in a single file, easy to backup
- **Docker Ready** - Single container deployment, perfect for Unraid

## Quick Start with Docker

### 1. Clone the repository

```bash
git clone https://github.com/narendraparihar/recipe-store.git
cd recipe-store
```

### 2. Create your environment file

```bash
cp .env.example .env
```

Edit `.env` and set your values:

```
APP_PASSWORD=your-secure-password
JWT_SECRET=some-random-string-here
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Build and run

```bash
docker compose up -d --build
```

The app will be available at `http://localhost:3000`

## Unraid Deployment

### Option A: Docker Compose (Recommended)

1. Install the **Docker Compose Manager** plugin from Community Applications
2. Create a new stack called `recipe-store`
3. Paste the contents of `docker-compose.yml`
4. Set the environment variables in the Unraid UI
5. Start the stack

### Option B: Manual Docker Container

In the Unraid Docker tab, click **Add Container** and configure:

| Field | Value |
|---|---|
| Name | `recipe-store` |
| Repository | Build from GitHub or use pre-built image |
| Network Type | `bridge` |
| Port Mapping | Host: `3000` → Container: `3000` |
| Volume Mapping | Host: `/mnt/user/appdata/recipe-store` → Container: `/app/data` |
| Variable: `APP_PASSWORD` | Your chosen password |
| Variable: `JWT_SECRET` | A random secret string |
| Variable: `GEMINI_API_KEY` | Your Google Gemini API key |
| WebUI | `http://[IP]:[PORT:3000]` |

### Setting up with Cloudflare + Let's Encrypt

To access your Recipe Store at `recipes.narendraparihar.net`:

1. **Unraid Nginx Proxy Manager** (or Swag):
   - Install Nginx Proxy Manager from Community Applications
   - Add a new proxy host:
     - Domain: `recipes.narendraparihar.net`
     - Forward to: `http://<unraid-ip>:3000`
     - Enable SSL with Let's Encrypt

2. **Cloudflare DNS**:
   - Add an `A` record pointing `recipes` to your public IP
   - Or use Cloudflare Tunnel for zero-port-forwarding setup

3. **Cloudflare Tunnel (Alternative)**:
   - Install `cloudflared` on Unraid
   - Create a tunnel pointing to `http://localhost:3000`
   - Add DNS route for `recipes.narendraparihar.net`

## Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy the key and add it to your `.env` file or Unraid container variable

The Gemini API has a generous free tier that should cover personal recipe import usage.

## Data Storage

All persistent data is stored in the `/app/data` Docker volume:

- `recipes.db` - SQLite database with all recipes, categories, notes, meal plans
- `uploads/` - Uploaded recipe images

If you mapped the volume to `/mnt/user/appdata/recipe-store`, simply back up that directory.

```bash
# Manual backup
cp -r /mnt/user/appdata/recipe-store ~/backups/recipe-store-$(date +%Y%m%d)
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, Lucide Icons, Sonner (toasts)
- **Backend**: Express 4, better-sqlite3, multer (uploads)
- **AI**: Google Gemini 2.0 Flash
- **Auth**: JWT with cookie-based sessions
- **Build**: Vite, esbuild
