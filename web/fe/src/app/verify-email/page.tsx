"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      router.replace(`/login?token=${encodeURIComponent(token)}`);
      return;
    }

    router.replace("/login");
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f7fb] p-6 text-slate-600">
      Dang xu ly xac thuc email...
    </div>
  );
}
