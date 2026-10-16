import { loadSession } from "@/lib/session-data";
import { PageHeader } from "@/components/page-header";
import { SentimentPanel } from "@/components/sentiment-panel";

export const dynamic = "force-dynamic";

export default async function SentimentPage() {
  // Same cached query the layout already ran — this page costs no extra trip.
  const session = await loadSession();
  const stocks = (session?.stocks ?? []).map((s) => ({ ticker: s.ticker, name: s.name }));

  return (
    <>
      <PageHeader title="Sentiment" subtitle="News and Reddit mood around any NSE stock" />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <SentimentPanel stocks={stocks} />
      </div>
    </>
  );
}
