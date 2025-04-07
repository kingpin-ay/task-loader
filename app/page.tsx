"use client";
import { useState } from "react";
import VimEditor from "./components/VimEditor";

export default function Home() {
  const [mainTaskList, setMainTaskList] = useState<string[]>([]);

  return (
    <main className="flex h-screen flex-col items-center justify-between p-24">
      <VimEditor />
    </main>
  );
}
