export function UserPrompt({ prompt }: { prompt: string }) {
  return (
    <div className="bg-muted ml-auto max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap">
      {prompt}
    </div>
  );
}
