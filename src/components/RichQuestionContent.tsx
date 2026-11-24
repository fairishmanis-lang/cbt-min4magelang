import React, { useMemo } from 'react';
import katex from 'katex';
import DOMPurify from 'dompurify';
import 'katex/dist/katex.min.css';

interface RichQuestionContentProps {
  content?: string | null;
  className?: string;
}

export default function RichQuestionContent({
  content = '',
  className = '',
}: RichQuestionContentProps) {
  const htmlSiapTampil = useMemo(() => {
    if (!content) return '';

    let olahan = String(content);

    // Render rumus blok $$...$$
    olahan = olahan.replace(/\$\$([\s\S]+?)\$\$/g, (_, rumus: string) => {
      try {
        return katex.renderToString(rumus.trim(), {
          displayMode: true,
          throwOnError: false,
        });
      } catch {
        return rumus;
      }
    });

    // Render rumus sebaris $...$ (termasuk \frac{a}{b})
    olahan = olahan.replace(/\$([^$\n]+?)\$/g, (_, rumus: string) => {
      try {
        return katex.renderToString(rumus.trim(), {
          displayMode: false,
          throwOnError: false,
        });
      } catch {
        return rumus;
      }
    });

    // Bersihkan tag berbahaya, tapi izinkan gambar, tabel, dan rumus
    return DOMPurify.sanitize(olahan, {
      ADD_TAGS: [
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'img',
        'br',
        'span',
        'div',
      ],
      ADD_ATTR: ['src', 'alt', 'class', 'style', 'colspan', 'rowspan'],
    });
  }, [content]);

  return (
    <div
      className={`rich-soal-box ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlSiapTampil }}
    />
  );
}
