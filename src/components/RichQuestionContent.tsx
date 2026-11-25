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

    let olahan = String(content).replace(/\r\n/g, '\n');

    // Lindungi blok $$...$$ sementara agar karakter di dalamnya tidak terganggu
    const mathBlocks: string[] = [];
    olahan = olahan.replace(/\$\$([\s\S]+?)\$\$/g, (_, rumus: string) => {
      let rendered = rumus;
      try {
        rendered = katex.renderToString(rumus.trim(), {
          displayMode: true,
          throwOnError: false,
        });
      } catch {
        rendered = rumus;
      }
      const token = `@@MATHBLOCK_${mathBlocks.length}@@`;
      mathBlocks.push(rendered);
      return token;
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

    // Ubah Enter (\n) menjadi <br /> agar baris baru tampil rapi di soal & opsi
    olahan = olahan.replace(/\n/g, '<br />');

    // Kembalikan blok rumus $$...$$
    olahan = olahan.replace(/@@MATHBLOCK_(\d+)@@/g, (_, idx: string) => {
      return mathBlocks[Number(idx)] ?? '';
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
