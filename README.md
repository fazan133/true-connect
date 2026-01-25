# True-Connect 🌐

A modern social networking application built with Next.js, Supabase, TailwindCSS, and TanStack Query.

![True-Connect](https://img.shields.io/badge/True--Connect-Social%20Network-blue)

## Features ✨

### Authentication
- Email/Password authentication with Supabase Auth
- OAuth providers (Google, GitHub)
- User profile setup with avatar, bio, and username

### Posts & Feed
- Create posts with text and images
- Infinite scrolling feed
- Real-time updates
- TanStack Query for data fetching and caching

### Interactions
- Like posts with optimistic UI updates
- Comment on posts with threaded replies
- Dynamic like/comment counts

### Direct Messaging
- Real-time private chat
- Supabase subscriptions for instant updates
- Bubble-style message UI

### Profile
- User profile pages with posts and stats
- Edit profile functionality
- Follow/unfollow users

### UI/UX
- Dark/light mode toggle
- Responsive design (mobile-first)
- Smooth transitions and animations
- Sidebar navigation

## Tech Stack 🛠️

- **Frontend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Subscriptions
- **Styling**: TailwindCSS
- **Data Fetching**: TanStack Query (React Query)
- **State Management**: Zustand
- **Icons**: Lucide React

## Getting Started 🚀

### Prerequisites

- Node.js 18+ installed
- Supabase account

### 1. Clone and Install

```bash
cd true-connect
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Enable the following Auth providers in Authentication > Providers:
   - Email (enabled by default)
   - Google (optional)
   - GitHub (optional)

### 3. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

You can find these values in your Supabase project settings.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure 📁

```
src/
├── app/                    # Next.js App Router pages
│   ├── (protected)/        # Protected routes (feed, profile, etc.)
│   ├── (messages)/         # Messages routes
│   ├── auth/               # Auth callback
│   ├── login/              # Login page
│   └── signup/             # Signup page
├── components/
│   ├── auth/               # Authentication components
│   ├── layout/             # Layout components (sidebar, header)
│   ├── messages/           # Messaging components
│   ├── posts/              # Post-related components
│   ├── profile/            # Profile components
│   └── ui/                 # Reusable UI components
├── hooks/                  # Custom React hooks
│   ├── queries.ts          # TanStack Query hooks
│   ├── use-messages.ts     # Messaging hooks
│   └── use-debounce.ts     # Utility hooks
├── lib/
│   ├── api.ts              # API functions
│   ├── messages-api.ts     # Messaging API
│   ├── utils.ts            # Utility functions
│   └── supabase/           # Supabase client configuration
└── types/
    └── database.ts         # TypeScript types
```

## Database Schema 📊

- **profiles**: User profiles (username, full_name, bio, avatar_url)
- **posts**: User posts (content, image_url)
- **likes**: Post likes
- **comments**: Post comments with threaded replies
- **follows**: User follow relationships
- **conversations**: Direct message conversations
- **conversation_participants**: Conversation members
- **messages**: Chat messages

## Features Overview

### TanStack Query Features
- Infinite queries for feed pagination
- Optimistic updates for likes
- Query invalidation for real-time feel
- Background revalidation

### Real-time Features
- Supabase subscriptions for new messages
- Automatic message reading status updates

### Security
- Row Level Security (RLS) policies
- Protected routes with middleware
- Secure file uploads

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

MIT License - feel free to use this project for your own purposes.