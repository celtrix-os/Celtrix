# Next.js + Express + MongoDB App

This is a [Next.js](https://nextjs.org/) project bootstrapped with JavaScript, TailwindCSS, and MongoDB integration.

## Getting Started

First, make sure your backend server is running on `http://localhost:5000` (or update the `NEXT_PUBLIC_BACKEND_URL` environment variable).

Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Create a `.env.local` file based on `.env.local.example`:

```bash
cp .env.local.example .env.local
```

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- ⚡ **Next.js 15** with App Router
- 🎨 **TailwindCSS** for styling
- 📱 **Responsive design**
- 🟨 **JavaScript** for dynamic functionality
- 🌐 **API integration** with Express backend
- ✨ **ESLint & Prettier** for code quality

## Project Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.js
│   └── page.js
└── components/
    ├── AddUserForm.js
    └── UserCard.js
```

## Environment Variables

- `NEXT_PUBLIC_BACKEND_URL` - Backend API URL (default: http://localhost:5000)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.