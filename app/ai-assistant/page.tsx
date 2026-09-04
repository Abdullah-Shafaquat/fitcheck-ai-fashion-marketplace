import type { Metadata } from "next";
import AiAssistant from "@/Components/AI/AiAssistant";

export const metadata: Metadata = {
  title: "AI Assistant",
  description:
    "Chat with FitCheck's AI style assistant to find products, build outfits, and track your orders.",
};

export default function AiAssistantPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <AiAssistant variant="page" />
    </main>
  );
}
