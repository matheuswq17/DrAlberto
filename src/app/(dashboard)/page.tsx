import { NextSlotsCard } from "@/components/next-slots-card";

export const dynamic = "force-dynamic";

export default function TodayPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">Hoje</h1>
      <NextSlotsCard />
      <p className="text-sm text-muted-foreground">
        Agenda do dia — em construção (Marco 4).
      </p>
    </div>
  );
}
