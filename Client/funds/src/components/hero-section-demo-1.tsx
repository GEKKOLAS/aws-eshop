"use client";


import { motion } from "framer-motion";
import Link from "next/link";

export default function HeroSectionOne() {
  return (
    <div className="relative mx-auto my-10 flex max-w-full flex-col items-center justify-center">
      
      <div className="px-4 py-10 md:py-20">
        <h1 className="relative z-10 mx-auto max-w-4xl text-center text-2xl font-bold text-slate-700 md:text-4xl lg:text-7xl dark:text-slate-300">
            {(() => {
              const sentence = "Puedes usar el Menu  lateral para navegar o consultar tu saldo actual.";
              return (
                <>
                  {/* Accessible plain text for screen readers */}
                  <>
                    <span className="sr-only">{sentence}</span>
                    <style>{`
                      /* Apply gradient text to the animated words only in light theme */
                      html:not(.dark) h1[class*="max-w-4xl"] span.inline-block {
                        background: linear-gradient(90deg,#06b6d4,#6366f1,#ec4899);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        color: transparent;
                      }
                    `}</style>
                  </>

                  {sentence.split(" ").filter(Boolean).map((word, i) => (
                    <motion.span
                      key={`${word}-${i}`}
                      aria-hidden="true"
                      initial={{ opacity: 0, y: 8, filter: "blur(6px)", scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
                      transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
                      className="mr-2 inline-block"
                    >
                      {word}
                    </motion.span>
                  ))}
                </>
              );
            })()}
        </h1>
        <motion.p
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            duration: 0.3,
            delay: 0.8,
          }}
          className="relative z-10 mx-auto max-w-xl py-4 text-center text-lg font-normal text-neutral-600 dark:text-neutral-400"
        >
          Administra y visualiza tus fondos en tiempo real. Obtén informes claros,
          herramientas de control de inversiones y alertas personalizadas para
          tomar decisiones más informadas y seguras.
        </motion.p>
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            duration: 0.3,
            delay: 1,
          }}
          className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4"
        >
            <Link
              href="/#funds"
              className="w-60 inline-block text-center transform rounded-lg bg-black px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-800 dark:bg-cyan-500 dark:text-black dark:hover:bg-gray-200"
            >
              Ir a Fondos
            </Link>
           
        </motion.div>
        
      </div>
    </div>
  );
}

// const Navbar = () => {
//   return (
//     <nav className="flex w-full items-center justify-between border-t border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
//       <div className="flex items-center gap-2">
//         <div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500" />
//         <h1 className="text-base font-bold md:text-2xl">Aceternity UI</h1>
//       </div>
//       <button className="w-24 transform rounded-lg bg-black px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-800 md:w-32 dark:bg-white dark:text-black dark:hover:bg-gray-200">
//         Login
//       </button>
//     </nav>
//   );
// };
