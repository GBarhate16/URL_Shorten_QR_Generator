"use client";
import { motion } from "framer-motion";
import { safeMap } from "@/lib/safe-arrays";

export default function Testimonials() {
  const testimonials = [
    {
      name: "Ava Patel",
      role: "Marketing Lead, BrightLabs",
      avatar: "",
      content:
        "Shortend made it effortless to create branded short links and QR codes for our campaigns. Our click-through rates jumped by 30%, and tracking scans in real time is a game changer.",
      rating: 5,
    },
    {
      name: "Leo Kim",
      role: "Founder, NudgeAI",
      avatar: "",
      content:
        "We use Shortend to generate QR codes for all our print materials and events. The analytics dashboard shows exactly where and when people scan, helping us optimize our outreach.",
      rating: 5,
    },
    {
      name: "Mia Garcia",
      role: "Product Manager, StreamWave",
      avatar: "",
      content:
        "The link shortening and QR code features are super intuitive. Our team loves the ability to customize URLs and monitor performance instantly during launches.",
      rating: 5,
    },
    {
      name: "Noah Fischer",
      role: "CTO, StackFlow",
      avatar: "",
      content:
        "Shortend's API is reliable and easy to integrate. We generate thousands of short links and QR codes every week with zero downtime. Perfect for scaling.",
      rating: 5,
    },
  ];

  const StarIcon = () => (
    <svg
      className="w-4 h-4 text-yellow-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );

  return (
    <section id="testimonials" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-20 flex flex-col gap-3"
        >
          <h2 className="text-xl font-semibold sm:text-2xl bg-gradient-to-b from-foreground to-muted-foreground text-transparent bg-clip-text">
            Loved by Teams Worldwide
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {safeMap(testimonials, (testimonial, index) => (
            <motion.div
              key={index}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: index * 0.05,
                ease: "easeOut",
              }}
              className="h-full"
            >
              <div className="p-6 h-full rounded-xl bg-card border border-border transition-colors duration-300 flex flex-col">
                <div className="flex mb-4">
                  {safeMap([...Array(testimonial.rating)], (_, i) => (
                    <StarIcon key={i} />
                  ))}
                </div>

                <p className="text-muted-foreground mb-6 leading-relaxed text-sm flex-1">
                  &ldquo;{testimonial.content}&rdquo;
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center text-sm font-medium border border-primary/20">
                    {safeMap(testimonial.name.split(" "), (n) => n[0]).join("")}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">
                      {testimonial.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
