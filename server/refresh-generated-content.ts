'use server';
import { updateTag, refresh } from "next/cache";

export async function refreshGeneratedContent() {
    updateTag("generated-content");
    refresh();
}