'use client';

import { useCompletion } from '@ai-sdk/react';
import { useEffect, useRef, useState } from 'react';
import { Streamdown } from 'streamdown';
import { mdxComponents } from './mdx-components-list';

export function LandingContent() {
  const { completion, complete, isLoading, error } = useCompletion({
    api: '/api/generate',
    onError: (err) => console.error('Completion error:', err),
    onFinish: (text) => console.log('Completion finished:', text),
  });

  const hasStartedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (inputRef.current?.value.trim()) {
      complete(inputRef.current.value);
      inputRef.current.value = '';
    }
  };

  return (
    <div className="mt-8">
      {completion ? (
        <Streamdown components={mdxComponents}>{completion}</Streamdown>
      ) : (
        <div 
          className="animate-pulse" 
          role="status" 
          aria-live="polite"
          aria-label="Generating content"
        >
          Thinking...
        </div>
      )}

      {(completion && !isLoading) && (
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-muted mb-4 text-sm">
            This content is fully AI generated. Try it by yourself!
          </p>
          <form
            onSubmit={handleSubmit}
            className="w-full"
            aria-label="Generate AI content form"
          >
            <div className="flex flex-col gap-2">
              <label 
                htmlFor="userInput" 
                className="sr-only"
              >
                Enter your name and social media handles
              </label>
              <div className="flex items-center px-4 py-2 bg-surface border border-border rounded-lg focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-background">
                <input
                  ref={inputRef}
                  type="text"
                  id="userInput"
                  name="userInput"
                  placeholder="What is your name?"
                  className="flex-1 bg-surface border-none outline-none text-base text-foreground placeholder:text-muted py-2"
                  autoComplete="name"
                  aria-describedby="userInputHint"
                  aria-required="true"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="ml-4 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                  aria-label="Generate my page"
                >
                  {isLoading ? 'Generating...' : 'Generate my page'}
                </button>
              </div>
              <p 
                id="userInputHint" 
                className="text-muted text-xs"
              >
                *Hint: You can put your Twitter/X handle, GitHub handle, LinkedIn handle and Substack handle to make sure AI finds you on the web
              </p>
            </div>
          </form>
          {error && (
            <div 
              role="alert" 
              aria-live="assertive"
              className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200"
            >
              An error occurred while generating content. Please try again.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
