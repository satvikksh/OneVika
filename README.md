<div align="center">

# 🚀 OrbitByte

### A modern, real-time social collaboration platform built for fast, responsive, and intelligent web experiences.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=000)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=fff)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socketdotio)](https://socket.io/)

**Live Demo:** [https://orbitbyte.in/](https://orbitbyte.in/) · **Repository:** [https://github.com/satvikksh/OneVika](https://github.com/satvikksh/OneVika)

</div>

---

## ✨ Introduction

**OrbitByte** is a full-stack, responsive web application designed for community, messaging, collaboration, and intelligent digital interaction. It combines a polished social experience with secure authentication, real-time chat, analytics, media sharing, notifications, premium workflows, and API-powered features.

The project is built with a startup-ready architecture: modern UI/UX, server-side API routes, MongoDB persistence, Socket.IO real-time messaging, cloud media storage, notification support, and scalable deployment options.

---

## 📌 Overview

OrbitByte brings together the core building blocks of a production-grade social platform:

| Area | Description |
| --- | --- |
| 🔐 Authentication | Email/password auth, Google OAuth support, OTP/reset-password flows, and protected user sessions. |
| 💬 Real-time Chat | Direct messaging, group conversations, typing states, message status, starred messages, unread counts, and socket delivery. |
| 🤖 AI Integration | Backend-only AI API integration support for secure assistant-style chat experiences. |
| 📊 Analytics | User-facing analytics dashboard and insight APIs for tracking platform activity. |
| 🖼️ Media | Avatar uploads, posts, stories, gallery-style content, and Cloudinary-ready media handling. |
| 📱 Responsive UI | Mobile-friendly layouts, modern navigation, adaptive chat screens, and smooth transitions. |
| 🔔 Notifications | In-app notifications and Firebase Cloud Messaging token support. |
| 💳 Premium | Payment-ready premium subscription APIs with Stripe/Razorpay style configuration. |

---

## 🌟 Features

- 🔑 **Secure authentication** with NextAuth, credentials, Google OAuth, OTP, and password reset flows.
- 💬 **Real-time messaging** powered by Socket.IO for direct and group chat experiences.
- 👥 **Social graph features** including profiles, following, followers, discovery, and search.
- 📝 **Posts and comments** with likes, profile feeds, and interactive content APIs.
- 📸 **Stories and daily drops** for lightweight, time-based user engagement.
- 📊 **Analytics dashboard** for activity insights and product visibility.
- 🤖 **AI-ready chat architecture** using backend-secured API keys and conversation context.
- 🔔 **Push notification support** with Firebase Admin and FCM token registration.
- ☁️ **Cloud media support** via Cloudinary configuration and upload routes.
- 💎 **Premium workflows** with checkout, activation, status, and webhook endpoints.
- 🎨 **Modern UI/UX** using Tailwind CSS, Framer Motion, Lucide icons, and responsive components.
- 🧱 **Scalable backend structure** with API routes, Mongoose models, service utilities, and a standalone socket server.
- 🛡️ **Security-conscious environment handling** with server-only secrets and public variable separation.

---

## 🧰 Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS 4, Framer Motion, Lucide React, React Icons |
| Language | TypeScript |
| Authentication | NextAuth.js, bcryptjs, Google OAuth |
| Database | MongoDB, Mongoose |
| Realtime | Socket.IO, Socket.IO Client |
| AI/API | Qwen/OpenAI-compatible backend API integration |
| Charts & Analytics | Recharts, D3 |
| Media | Cloudinary, Multer |
| Notifications | Firebase Admin, Firebase Client SDK |
| Payments | Stripe/Razorpay-ready environment configuration |
| Tooling | ESLint, Nodemon, ts-node, TypeScript |
| Deployment | Vercel/Railway compatible |

---

## 🗂️ Folder Structure

```txt
OrbitByte/
├── app/
│   ├── api/                 # Server API routes
│   ├── analytics/           # Analytics dashboard pages
│   ├── chat/                # Real-time chat UI
│   ├── components/          # Shared UI components
│   ├── context/             # React context providers
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Database, auth, crypto, utility helpers
│   ├── login/               # Login page
│   ├── models/              # Mongoose schemas and models
│   ├── notifications/       # Notification UI
│   ├── profile/             # Profile pages and edit flows
│   ├── register/            # Registration page
│   ├── room/                # Room/calling related pages
│   ├── settings/            # User settings
│   └── types/               # Shared TypeScript types
├── public/                  # Static assets and icons
├── dist/                    # Compiled socket server output
├── server.ts                # Express + Socket.IO realtime server
├── next.config.ts           # Next.js configuration
├── tsconfig.json            # TypeScript configuration
├── tsconfig.socket.json     # Socket server TypeScript configuration
├── package.json             # Scripts and dependencies
└── README.md                # Project documentation
```

---

## ⚙️ Installation Guide

### 1. Clone the repository

```bash
git clone https://github.com/satvikksh/OneVika
cd OneVika
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local environment file:

```bash
cp .env.example .env.local
```

If an example file is not available yet, create `.env.local` manually using the variables below.

### 4. Run the development server

This project includes a custom Socket.IO server. Use the combined development command:

```bash
npm run dev
```

Or run Next.js separately if needed:

```bash
npm run dev-next
```

Open the app at:

```txt
http://localhost:3000
```

---

## 🔐 Environment Variables

> Never commit real secrets to GitHub. Keep server-only keys in `.env` or `.env.local`, and expose only safe `NEXT_PUBLIC_*` values to the browser.

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | ✅ | MongoDB connection string. |
| `NEXTAUTH_SECRET` | ✅ | Secret used by NextAuth session signing. |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Public base URL of the web app. |
| `NEXT_PUBLIC_SOCKET_URL` | ✅ | Public URL for the Socket.IO server. |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret. |
| `JWT_SECRET` | ✅ | JWT signing secret for custom auth flows. |
| `COOKIE_SECRET` | ✅ | Cookie encryption/signing secret. |
| `DEEPSEEK_API_KEY` | Optional | Server-only AI assistant API key. |
| `OPENAI_API_KEY` | Optional | Server-only OpenAI-compatible API key if used. |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary cloud name for media storage. |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary API secret. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Optional | Public Cloudinary cloud name. |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Optional | Public unsigned upload preset, if used. |
| `FIREBASE_PROJECT_ID` | Optional | Firebase project ID. |
| `FIREBASE_CLIENT_EMAIL` | Optional | Firebase service account client email. |
| `FIREBASE_PRIVATE_KEY` | Optional | Firebase service account private key. |
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key for premium checkout. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Stripe publishable key. |
| `RAZORPAY_KEY_ID` | Optional | Razorpay key ID. |
| `RAZORPAY_KEY_SECRET` | Optional | Razorpay key secret. |
| `PORT` | Optional | Custom server port. Defaults depend on runtime configuration. |

### Example `.env.local`

```env
MONGODB_URI="mongodb+srv://your-project name and password@cluster0.jwd2ykt.mongodb.net/project name?retryWrites=true&w=majority&appName=OneVika"
NEXTAUTH_SECRET="Cr32uuP8FAKilbnJ5A0Rudo349fj9fj3409"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"

GOOGLE_CLIENT_ID="3482034824c-c3220e23cmwiwn.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="dfcm4939ru329jdwcjd9cmjfnsk"

DEEPSEEK_API_KEY="cm4jf9mh348hc9wjdwod"

CLOUDINARY_CLOUD_NAME="cdmr9sdkjnw"
CLOUDINARY_API_KEY="47295720527"
CLOUDINARY_API_SECRET="cdhrnfij3m9orwjro"

FIREBASE_PROJECT_ID=project id
FIREBASE_CLIENT_EMAIL=email given@orbitbytein.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\cmu83v98r y39c29cn28jm9dc2jrc92jdnwuc38w2ccasamc2rcny8rh\n-----END PRIVATE KEY-----\n

```

---

## 🚀 Usage Instructions

### Development

```bash
npm run dev
```

Runs the custom server with Socket.IO support and watches TypeScript/JSON files.

### Next.js only

```bash
npm run dev-next
```

Runs only the Next.js application server.

### Lint

```bash
npm run lint
```

### Build the web app

```bash
npm run build
```

### Build the socket server

```bash
npm run build:socket
```

### Start production Next.js server

```bash
npm run start
```

### Start compiled socket server

```bash
npm run start:socket
```

---

## 🔌 API Endpoints

OrbitByte uses Next.js API routes under `app/api`.

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/register` | Register a new user. |
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth authentication handlers. |
| `GET` | `/api/auth/me` | Get the current authenticated user. |
| `POST` | `/api/auth/send-otp` | Send OTP for verification/reset flows. |
| `POST` | `/api/auth/reset-password` | Reset a user password. |

### Users & Profiles

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/user` | Fetch users. |
| `GET` | `/api/user/search` | Search users. |
| `PATCH` | `/api/user/update` | Update current user profile. |
| `POST` | `/api/user/upload-avatar` | Upload or update user avatar. |
| `GET` | `/api/user/profile` | Fetch current profile. |
| `GET` | `/api/user/profile/[userId]` | Fetch another user profile. |
| `POST` | `/api/user/profile/[userId]/follow` | Follow or unfollow a user. |
| `GET` | `/api/user/profile/[userId]/followers` | Fetch followers. |
| `GET` | `/api/user/profile/[userId]/following` | Fetch following. |

### Chat & Messages

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/user/chat` | Fetch chat list and conversations. |
| `POST` | `/api/messages/send` | Send and persist a message. |
| `GET` | `/api/messages/by-user/[userId]` | Fetch messages with a user. |
| `GET` | `/api/messages/by-user/[userId]/conversation` | Fetch conversation metadata. |
| `POST` | `/api/messages/by-user/[userId]/read` | Mark messages as read. |
| `GET` | `/api/messages/by-message/[messageId]` | Fetch a message by ID. |
| `POST` | `/api/messages/by-message/[messageId]/star` | Star or unstar a message. |
| `GET/POST` | `/api/user/chat/groups` | List or create group chats. |
| `GET/PATCH/DELETE` | `/api/user/chat/groups/[groupId]` | Manage a specific group chat. |
| `POST` | `/api/user/chat/mark-all-read` | Mark all chat messages as read. |
| `GET` | `/api/user/chat/starred` | Fetch starred chat messages. |

### Social Content

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/posts` | Fetch posts. |
| `POST` | `/api/posts/create` | Create a post. |
| `GET/PATCH/DELETE` | `/api/posts/[id]` | Read, update, or delete a post. |
| `POST` | `/api/posts/[id]/like` | Like or unlike a post. |
| `GET/POST` | `/api/posts/[id]/comments` | Fetch or add comments. |
| `POST` | `/api/posts/[id]/add-comment` | Add a comment to a post. |
| `POST` | `/api/stories/create` | Create a story. |
| `GET` | `/api/stories/today` | Fetch current stories. |
| `POST` | `/api/stories/seen/[id]` | Mark a story as seen. |
| `DELETE` | `/api/stories/delete/[id]` | Delete a story. |

### Analytics, Notifications & Premium

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/analytics` | Fetch analytics dashboard data. |
| `GET/POST` | `/api/notifications` | Fetch or create notifications. |
| `PATCH/DELETE` | `/api/notifications/[notificationId]` | Update or delete a notification. |
| `POST` | `/api/save-fcm-token` | Save a Firebase Cloud Messaging token. |
| `POST` | `/api/premium/create-checkout-session` | Create a premium checkout session. |
| `POST` | `/api/premium/activate` | Activate premium access. |
| `GET` | `/api/premium/status` | Check premium status. |
| `POST` | `/api/premium/webhook` | Handle premium payment webhooks. |

---

## 🖼️ Screenshots

Add screenshots to `public/screenshots` and update the links below.

| Home | Chat | Analytics |
| --- | --- | --- |
| ![Home Screenshot](public/screenshots/home.png) | ![Chat Screenshot](public/screenshots/chat.png) | ![Analytics Screenshot](public/screenshots/analytics.png) |

| Mobile UI | Profile | Settings |
| --- | --- | --- |
| ![Mobile Screenshot](public/screenshots/mobile.png) | ![Profile Screenshot](public/screenshots/profile.png) | ![Settings Screenshot](public/screenshots/settings.png) |

---

## 🧪 Testing Checklist

Before shipping a change, verify:

- [ ] Users can register, log in, log out, and restore sessions.
- [ ] Google OAuth redirect URIs are configured for local and production domains.
- [ ] Direct and group messages send, receive, and persist correctly.
- [ ] Socket.IO events work across multiple browser sessions.
- [ ] Chat unread counts, read receipts, and typing indicators behave correctly.
- [ ] Media uploads work with configured Cloudinary credentials.
- [ ] Protected routes reject unauthenticated requests.
- [ ] Mobile layouts work on common viewport sizes.
- [ ] Server-only secrets are not exposed in client bundles.

---

## ☁️ Deployment

### Deploy the Next.js app

Recommended hosting options:

- [Vercel](https://vercel.com/) for the Next.js frontend/API routes.
- [Railway](https://railway.app/) or a Node-compatible host for the custom Socket.IO server.
- [MongoDB Atlas](https://www.mongodb.com/atlas) for managed MongoDB.

### Production steps

1. Create a production MongoDB database.
2. Configure all required environment variables on your hosting provider.
3. Add production Google OAuth redirect URIs:



4. Build the application:

```bash
npm run build
npm run build:socket
```

5. Start production services:

```bash
npm run start
npm run start:socket
```

6. Set `NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_SOCKET_URL` to production URLs.
7. Verify authentication, realtime chat, media uploads, notifications, and premium flows.

---

## 🧭 Future Improvements

- 🤖 Dedicated AI assistant conversation with streaming replies and long-term memory.
- 🔍 Full-text search across users, posts, projects, and chat history.
- 🧵 Threaded replies and message reactions in chat.
- 🧑‍💼 Organization/team workspaces for business collaboration.
- 📈 Advanced analytics with cohort, retention, and engagement reporting.
- 🧪 Automated unit, integration, and end-to-end test coverage.
- 🌍 Internationalization and localization support.
- 🛡️ Rate limiting, audit logs, and advanced abuse protection.
- 📦 Dockerized deployment workflow.
- ♿ Deeper accessibility improvements and keyboard-first navigation.

---

## 🤝 Contributing

Contributions are welcome. If you want to improve OrbitByte, please follow this workflow:

1. Fork the repository.
2. Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

3. Commit your changes:

```bash
git commit -m "feat: add your feature"
```

4. Push to your branch:

```bash
git push origin feature/your-feature-name
```

5. Open a pull request with a clear description, screenshots if relevant, and testing notes.

### Contribution Guidelines

- Keep code readable, typed, and consistent with the existing architecture.
- Do not commit real `.env` secrets.
- Add or update documentation when behavior changes.
- Prefer small, focused pull requests.
- Test authentication, chat, and responsive UI changes before submitting.

---

## 📄 License

This project is licensed under the **MIT License**.

```txt
MIT License

Copyright (c) 2026 OrbitByte

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, subject to the conditions of the MIT License.
```

> If your project uses a different license, replace this section and add a `LICENSE` file at the repository root.

---

## 👤 Author

**OrbitByte Team**

- Website: [https://orbitbyte.in/](https://orbitbyte.in/)
- GitHub: [https://github.com/satvikksh/OneVika](https://github.com/satvikksh/OneVika)
- LinkedIn: [https://www.linkedin.com/in/satvik-kushwaha-343452237/](https://www.linkedin.com/in/satvik-kushwaha-343452237/)
- Email: [satvikksh@gmail.com](satvikksh@gmail.com)

---

## 💬 Support

Need help or want to report an issue?

- 📧 Email: [satvikksh@gmail.com](satvikksh@gmail.com)
- 🐛 Issues: [https://github.com/satvikksh/OneVika/issues](https://github.com/satvikksh/OneVikaissues)
- 💡 Feature Requests: [https://github.com/satvikksh/OneVika/discussions](https://github.com/satvikksh/OneVika/discussions)

If OrbitByte helps your work, consider starring the repository ⭐ and sharing feedback.

---

<div align="center">

Built with care for fast, secure, and responsive digital communities.

**OrbitByte — connect, collaborate, and scale.**

</div>
