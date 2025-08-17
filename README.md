# 통합사회 학습지 제작 도구 (Dasy Web)

This is a [Next.js](https://nextjs.org) project for creating educational worksheets for integrated social studies.

## Prerequisites

This application requires:
- Supabase account and project
- AWS S3 bucket for image storage

## Getting Started

### 1. Set up environment variables

Run the setup script to create your `.env.local` file:

```bash
npm run setup
```

Then edit `.env.local` and add your actual values:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `NEXT_PUBLIC_S3_BUCKET_NAME` - Your AWS S3 bucket name
- `NEXT_PUBLIC_AWS_REGION` - Your AWS region (default: us-east-1)

For detailed setup instructions, see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md).

### 2. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 3. Usage

1. Navigate to `/build` to select problems and configure your worksheet
2. Click "PDF 생성" to generate a PDF worksheet
3. The PDF will be displayed in the `/configure` page

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
