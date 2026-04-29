import { Link } from "react-router";

import GitHubIcon from "#assets/github-mark.svg?react";
import { Button } from "#components/ui/button.js";

export default function Route() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <div className="border-border/60 bg-card flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border px-8 py-10 shadow-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight">
          Sign in to Kill The Backlog
        </h1>
        <Button asChild size="lg" variant="outline">
          <Link to="/auth/github">
            <GitHubIcon />
            Continue with GitHub
          </Link>
        </Button>
      </div>
    </div>
  );
}
