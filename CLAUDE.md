# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI lawyer chat application ("godin-lawyer") built with Next.js 15, React, and TypeScript. The application provides legal consultation services through an AI chat interface with support for case management, order tracking, and user authentication.

## Development Commands

### Core Commands
- `pnpm dev` - Start the development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint (configured to ignore build errors)

### Package Management
- Uses `pnpm` as the package manager
- Lock file: `pnpm-lock.yaml`

## Architecture Overview

### Framework & Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS with custom CSS variables and animations
- **UI Components**: Radix UI primitives with shadcn/ui components
- **State Management**: Zustand with persistence middleware
- **HTTP Client**: Axios with interceptors for authentication
- **AI Integration**: DeepSeek AI SDK and Vercel AI SDK
- **Real-time**: Socket.io client for chat functionality

### Project Structure
```
app/                    # Next.js App Router pages
├── api/chat/          # Chat API route
├── cases/             # Case management pages
├── chat/              # Chat interface pages
├── login/             # Authentication pages
├── orders/            # Order management pages
└── profile/           # User profile pages

components/            # React components
├── ui/               # shadcn/ui base components
├── chat/             # Chat-specific components
├── cases/            # Case management components
├── layout/           # Layout components (navigation, top bar)
└── [feature]/        # Feature-specific components

store/                # Zustand state stores
├── auth-store.ts     # Authentication state
└── chat-store.ts     # Chat state management

services/             # API and external services
├── api-service.ts    # HTTP API service with auth interceptors
└── socket-service.ts # WebSocket service for real-time chat

types/                # TypeScript type definitions
├── index.ts          # Core types (User, Case, Order, Conversation, Message)
└── chat.ts           # Chat-specific types
```

### Key Features
1. **Authentication**: Mock authentication system with persistent login state
2. **Chat Interface**: AI-powered legal consultation with message history
3. **Case Management**: Track legal cases with progress indicators
4. **Order Management**: Handle service orders and payments
5. **Responsive Design**: Mobile-first design with bottom navigation

### State Management Pattern
- Uses Zustand for client-side state management
- Persistent storage for authentication state
- Separate stores for different concerns (auth, chat)

### API Integration
- Mock API services for development
- Configured for external API at `NEXT_PUBLIC_API_URL`
- Authentication token handling via request/response interceptors
- Error handling with automatic logout on 401 responses

### Styling Approach
- Tailwind CSS with custom design system
- CSS variables for theme consistency
- shadcn/ui component library integration
- Custom animations and component styling

### Development Notes
- ESLint and TypeScript checks are disabled during builds (for rapid development)
- Images are unoptimized in Next.js config
- Uses absolute imports with `@/` prefix for clean import paths
- Supports both light and dark themes via CSS classes

### Type Safety
- Comprehensive TypeScript types defined in `types/` directory
- Strict TypeScript configuration with modern module resolution
- Type definitions for all major entities (User, Case, Order, Message, Conversation)

### Mock Data & Development
- Authentication uses mock login (any credentials work)
- API services return simulated data with delays
- Demo user data and conversation responses for testing