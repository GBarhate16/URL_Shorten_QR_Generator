"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { getApiUrl } from "@/config/api";

export default function RedirectPage() {
  const params = useParams();
  const shortCode = params.shortCode as string;

  useEffect(() => {
    if (!shortCode) return;
    // Let the backend handle click logging and a 302 redirect
    const target = `${getApiUrl('URL_REDIRECT')}${shortCode}/`;
    window.location.replace(target);
  }, [shortCode]);

  return null;
}
