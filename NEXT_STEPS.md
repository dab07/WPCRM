# Next Steps After Migration

## 1. Install Dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

## 2. Update Environment Variables

The `.env.local` file has been created with your Supabase credentials. If you have additional environment variables (Gemini API, n8n, WhatsApp), add them with the `NEXT_PUBLIC_` prefix:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://iclfujxgvdjqyjsmwumd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
```

## 3. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your app.

## 4. Verify Everything Works

- [ ] Dashboard loads correctly
- [ ] Supabase connection works
- [ ] All components render properly
- [ ] No console errors

## 5. Optional Cleanup

Once you verify everything works, you can remove old Vite files:

```bash
rm -f index.html vite.config.ts tsconfig.app.json tsconfig.node.json
rm -f src/main.tsx src/App.tsx src/index.css eslint.config.js
rm -f .env  # Keep .env.local instead
```

## 6. Build for Production

Test the production build:

```bash
npm run build
npm start
```

## Key Differences to Remember

1. **Port**: Development server now runs on port 3000 (was 5173 with Vite)
2. **Environment Variables**: Use `NEXT_PUBLIC_` prefix for client-side variables
3. **Imports**: Use `@/` alias for imports from `src/` directory
4. **Client Components**: Components using hooks need `'use client'` directive

## Deployment Options

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms
- Build: `npm run build`
- Start: `npm start`
- Requires Node.js runtime

## Need Help?

- See `MIGRATION_GUIDE.md` for detailed migration information
- Check Next.js docs: https://nextjs.org/docs
- Supabase with Next.js: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
