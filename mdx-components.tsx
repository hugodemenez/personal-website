import type { MDXComponents } from 'mdx/types';
import { mdxComponents as sharedComponents } from './app/_components/mdx-components-list';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...sharedComponents,
    ...components,
  };
}
