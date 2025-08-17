"use client";
import { motion } from "framer-motion";
import { safeMap } from "@/lib/safe-arrays";

export default function Stats() {
  const stats = [
    { number: "10K+", label: "Short URLs Generated" },
    { number: "5K+", label: "QR Codes Created" },
    { number: "15K+", label: "Tracked Clicks & Scans" },
    { number: "99.99%", label: "Uptime for Redirects" },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {safeMap(stats, (stat, index) => (
            <motion.div
              key={index}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: index * 0.1,
                ease: "easeOut",
              }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold mb-2">
                {stat.number}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
