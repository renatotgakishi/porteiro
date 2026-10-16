"use client";

import { Card } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-base font-semibold">Dashboard</h1>
      <div className="grid grid-cols-3 gap-3 mt-4">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">Tenants</p>
          <p className="text-xl font-bold mt-1">4</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">Usuários</p>
          <p className="text-xl font-bold mt-1">2</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">Papéis</p>
          <p className="text-xl font-bold mt-1">4</p>
        </Card>
      </div>
    </div>
  );
}