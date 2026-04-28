"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyEmailRedirect() {
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

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f3f7fb] p-6 text-slate-600">
          Dang xu ly xac thuc email...
        </div>
      }
    >
      <VerifyEmailRedirect />
    </Suspense>
  );
}
