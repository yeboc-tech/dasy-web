# Chapter Services

This directory contains service functions for fetching chapters from the database.

## Structure

- **`services.ts`** - Base service functions that work with any Supabase client
- **`clientServices.ts`** - Client-side wrapper functions (for use in components)
- **`serverServices.ts`** - Server-side wrapper functions (for use in API routes, Server Components)
- **`index.ts`** - Exports all functions with proper naming to avoid conflicts

## Usage

### Client-side (React Components)

```typescript
import { getChapterTree } from '@/lib/supabase/services/clientServices';
import { useChapters } from '@/lib/hooks/useChapters';

// In a component
function MyComponent() {
  const { chapters, loading, error } = useChapters();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {chapters.map(chapter => (
        <div key={chapter.id}>{chapter.label}</div>
      ))}
    </div>
  );
}
```

### Server-side (API Routes, Server Components)

```typescript
import { getChapterTreeServer } from '@/lib/supabase/services/serverServices';

// In an API route or Server Component
export async function GET() {
  try {
    const chapters = await getChapterTreeServer();
    return Response.json(chapters);
  } catch (error) {
    return Response.json({ error: 'Failed to fetch chapters' }, { status: 500 });
  }
}
```

## Data Structure

### Chapter Interface
```typescript
interface Chapter {
  id: string;
  name: string;
  chapter_number: number;
  parent_id: string | null;
  subject_id: string;
}
```

### ChapterTreeItem Interface
```typescript
interface ChapterTreeItem {
  id: string;
  label: string;
  type: 'category' | 'item';
  expanded: boolean;
  children?: ChapterTreeItem[];
}
```

## Available Functions

### Base Services (`services.ts`)
- `fetchChapters(supabase)` - Fetch all chapters
- `fetchSubjects(supabase)` - Fetch all subjects
- `fetchChapterTree(supabase)` - Fetch and build complete tree structure

### Client Services (`clientServices.ts`)
- `getChapters()` - Fetch all chapters (client-side)
- `getSubjects()` - Fetch all subjects (client-side)
- `getChapterTree()` - Fetch complete tree (client-side)
- `getChaptersBySubject(subjectName)` - Fetch chapters for specific subject

### Server Services (`serverServices.ts`)
- `getChapters()` - Fetch all chapters (server-side)
- `getSubjects()` - Fetch all subjects (server-side)
- `getChapterTree()` - Fetch complete tree (server-side)
- `getChaptersBySubject(subjectName)` - Fetch chapters for specific subject

## Tree Structure

The `fetchChapterTree` function builds a hierarchical structure that matches the original `contentTree`:

```
통합사회 1
├── I. 통합적 관점
│   ├── 01. 인간, 사회, 환경을 바라보는 다양한 관점
│   └── 02. 통합적 관점의 필요성과 적용
├── II. 인간, 사회, 환경과 행복
│   ├── 01. 행복의 기준과 의미
│   └── 02. 행복한 삶을 실현하기 위한 조건
└── ...
```

## Error Handling

All functions include proper error handling and will throw descriptive errors if:
- Database connection fails
- Required data is missing
- Subject not found
- Invalid chapter structure

## Performance

- Functions use efficient database queries with proper ordering
- Tree building is optimized to minimize database calls
- Client-side hook includes caching and loading states
