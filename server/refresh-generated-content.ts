'use server';
import { updateTag } from "next/cache";

export async function refreshGeneratedContent() {
    updateTag("generated-content");
}