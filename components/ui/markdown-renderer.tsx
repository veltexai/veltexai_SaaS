'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];
    let listType: 'ul' | 'ol' | null = null;
    let listCounter = 1;
    let elementCounter = 0; // Add unique counter

    const flushList = () => {
      if (currentList.length > 0) {
        if (listType === 'ul') {
          elements.push(
            <ul key={`ul-${elementCounter++}`} className="list-disc list-inside mb-3 ml-4 space-y-1">
              {currentList}
            </ul>
          );
        } else if (listType === 'ol') {
          elements.push(
            <ol key={`ol-${elementCounter++}`} className="list-decimal list-inside mb-3 ml-4 space-y-1">
              {currentList}
            </ol>
          );
        }
        currentList = [];
        listType = null;
        listCounter = 1;
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines but add spacing
      if (!trimmedLine) {
        flushList();
        return;
      }

      // Headers
      if (trimmedLine.startsWith('###')) {
        flushList();
        const text = trimmedLine.replace(/^###\s*/, '');
        elements.push(
          <h3 key={`h3-${index}`} className="text-base font-semibold mb-2 mt-4 text-gray-800">
            {parseInlineMarkdown(text)}
          </h3>
        );
      } else if (trimmedLine.startsWith('##')) {
        flushList();
        const text = trimmedLine.replace(/^##\s*/, '');
        elements.push(
          <h2 key={`h2-${index}`} className="text-lg font-bold mb-3 mt-4 text-gray-900">
            {parseInlineMarkdown(text)}
          </h2>
        );
      } else if (trimmedLine.startsWith('#')) {
        flushList();
        const text = trimmedLine.replace(/^#\s*/, '');
        elements.push(
          <h1 key={`h1-${index}`} className="text-xl font-bold mb-4 mt-4 text-gray-900">
            {parseInlineMarkdown(text)}
          </h1>
        );
      }
      // Bullet points
      else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        const text = trimmedLine.replace(/^[-*]\s*/, '');
        currentList.push(
          <li key={`li-${index}-${currentList.length}`} className="text-sm text-gray-700">
            {parseInlineMarkdown(text)}
          </li>
        );
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(trimmedLine)) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
          listCounter = 1;
        }
        const text = trimmedLine.replace(/^\d+\.\s*/, '');
        currentList.push(
          <li key={`li-${index}-${currentList.length}`} className="text-sm text-gray-700">
            {parseInlineMarkdown(text)}
          </li>
        );
        listCounter++;
      }
      // Regular paragraphs
      else {
        flushList();
        elements.push(
          <p key={`p-${index}`} className="text-sm text-gray-700 mb-2 leading-relaxed">
            {parseInlineMarkdown(trimmedLine)}
          </p>
        );
      }
    });

    // Flush any remaining list
    flushList();

    return elements;
  };

  const parseInlineMarkdown = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    
    // Handle bold text (**text** or __text__)
    const boldRegex = /(\*\*|__)(.*?)\1/g;
    let match;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(text.slice(currentIndex, match.index));
      }
      
      // Add the bold text
      parts.push(
        <strong key={`bold-${match.index}`} className="font-semibold text-gray-900">
          {match[2]}
        </strong>
      );
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {parseMarkdown(content)}
    </div>
  );
}