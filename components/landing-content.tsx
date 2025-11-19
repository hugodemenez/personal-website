'use client';

import { useCompletion } from '@ai-sdk/react';
import { useEffect, useRef, useState } from 'react';
import { Streamdown } from 'streamdown';
import { mdxComponents } from './mdx-components-list';

export function LandingContent() {
  const { completion, complete, isLoading } = useCompletion({
    api: '/api/generate',
    onError: (err) => console.error('Completion error:', err),
    onFinish: (text) => console.log('Completion finished:', text),
  });

  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      const hugoPrompt = `
      Generate a summary about Hugo Demenez.
      Twitter/X handle: @hugodemenez
      GitHub handle: hugodemenez
      LinkedIn handle: hugodemenez
      Substack handle: hugodemenez`;
      complete(hugoPrompt);
    }
  }, [complete]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const userInput = document.getElementById('userInput') as HTMLInputElement;
    complete(userInput.value);
  };

  return (
    <div className="mt-8">
      {completion ? (
        <Streamdown components={mdxComponents}>{completion}</Streamdown>
      ) : (
        <div className="animate-pulse">Thinking...</div>
      )}

      {!isLoading && (
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-muted mb-4 text-sm">
            This content is fully AI generated. Try it by yourself!
          </p>
            <form
              onSubmit={handleSubmit}
              className="w-full flex items-center px-4 py-2 bg-surface border border-border rounded-lg"
            >
              <input
                type="text"
                id="userInput"
                placeholder="What is your name? you can put extra information to make sure AI finds you on the web"
                className="flex-1 bg-surface border-none outline-none text-base text-foreground placeholder:text-muted py-2"
              />
              <button
                type="submit"
                className="ml-4 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate my page
              </button>
            </form>
            <span className="text-muted text-xs">*Hint: You can put your Twitter/X handle, GitHub handle, LinkedIn handle and Substack handle to make sure AI finds you on the web</span>
        </div>
      )}

    </div>
  );
}
