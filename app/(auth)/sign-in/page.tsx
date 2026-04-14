import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center p-8">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/unauthorized"
        forceRedirectUrl="/dashboard"
      />
    </main>
  );
}
