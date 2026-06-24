import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

export async function generateStaticParams() {
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) return [];
  const files = fs.readdirSync(docsDir).filter(file => file.endsWith('.md'));

  return files.map((file) => ({
    slug: file.replace(/\.md$/, ''),
  }));
}

export default function DocPage({ params }: { params: { slug: string } }) {
  const docsDir = path.join(process.cwd(), 'docs');
  const filePath = path.join(docsDir, `${params.slug}.md`);

  if (!fs.existsSync(filePath)) {
    return <div className="p-10 text-center text-xl">Document not found</div>;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="mb-8">
        <Link href="/docs" className="text-blue-500 hover:underline">
          &larr; Back to Documentation
        </Link>
      </div>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
