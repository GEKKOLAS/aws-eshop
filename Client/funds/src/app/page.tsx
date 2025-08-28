"use client";
import { useState } from "react";

import { FondSelector } from "@/components/fondSelector";
import { SideMenu } from "@/components/sideMenu";
import { Balance } from "@/components/balance";

export default function Home() {
  const [open, setOpen] = useState(true);

  return (
    <section className="p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="flex flex-col overflow-hidden rounded-md gap-4">
          <SideMenu open={open} onToggle={() => setOpen((v) => !v)} />
          <div>
        <Balance />
          </div>
        </div>

        <main id="funds" className="flex-1">
          <FondSelector />
        </main>
      </div>
    </section>
  );
}



