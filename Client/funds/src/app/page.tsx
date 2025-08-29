"use client";
import { useEffect, useState } from "react";

import { FondSelector } from "@/components/fondSelector";
import { SideMenu } from "@/components/sideMenu";
import { Balance } from "@/components/balance";
import { Home as HomeSection } from "@/components/home";
import { ThemeToggle } from "@/components/themeToggle";
import { Transactions } from "@/components/transactions";
import { Subscriptions } from "@/components/subscriptions";

export default function Home() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<"home" | "funds" | "transactions" | "subscriptions">("home");

  useEffect(() => {
    const readHash = () => {
  const h = (typeof window !== "undefined" ? window.location.hash : "") || "#home";
  const l = h.toLowerCase();
  if (l === "#funds") setSection("funds");
  else if (l === "#transactions") setSection("transactions");
  else if (l === "#subscriptions") setSection("subscriptions");
  else setSection("home");
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  return (
    <section className="p-6 space-y-4 min-h-screen bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="flex items-start gap-4">
        <div className="flex flex-col overflow-hidden rounded-md gap-4 sticky top-6 self-start z-40">
          <SideMenu open={open} onToggle={() => setOpen((v) => !v)} />
          {open && (
            <div>
              <Balance />
            </div>
          )}
        </div>

        <main className="flex-1 space-y-8">
          {section === "home" && (
            <section id="home">
              <HomeSection />
            </section>
          )}
          {section === "funds" && (
            <section id="funds">
              <FondSelector />
            </section>
          )}
          {section === "transactions" && (
            <section id="transactions">
              <Transactions />
            </section>
          )}
          {section === "subscriptions" && (
            <section id="subscriptions">
              <Subscriptions />
            </section>
          )}
        </main>
      </div>
  </section>
  );
}



