"use client";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { motion } from "framer-motion";
import { safeMap } from "@/lib/safe-arrays";

export default function Faq() {
  const accordionItems = [
    {
      title: "How accurate is your link and QR code analytics?",
      content: (
        <div className="text-muted-foreground">
          We track every short link redirect and QR code scan on the server, providing real-time analytics including device, browser, referrer, and approximate location. For best results, enable <code>CF-Connecting-IP</code> or <code>X-Forwarded-For</code> headers to improve IP-based geolocation accuracy.
        </div>
      ),
    },
    {
      title: "Can I use my own domain or customize short URLs?",
      content: (
        <div className="text-muted-foreground">
          Absolutely! You can set up your own branded domain for short links and choose custom slugs for both URLs and QR codes, making your links memorable and on-brand.
        </div>
      ),
    },
    {
      title: "Can I export my links and analytics data?",
      content: (
        <div className="text-muted-foreground">
          Yes, you can export your short links, QR codes, and analytics as CSV files on Pro and Enterprise plans. You can also access all your data programmatically via our REST API.
        </div>
      ),
    },
    {
      title: "Do you offer an API for link and QR code management?",
      content: (
        <div className="text-muted-foreground">
          Yes! Our platform provides a fully documented REST API to create and manage short links, generate QR codes, and fetch analytics. Perfect for automation and integration into your own apps.
        </div>
      ),
    },
    {
      title: "How do you handle privacy and security?",
      content: (
        <div className="text-muted-foreground">
          We collect only essential data for analytics and never share your information. All links and QR codes are served securely over HTTPS. Enterprise customers can enable role-based access and request a Data Processing Agreement (DPA) or security review.
        </div>
      ),
    },
  ];

  return (
    <motion.section
      initial={{ y: 20, opacity: 0 }}
      whileInView={{
        y: 0,
        opacity: 1,
      }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.5, type: "spring", bounce: 0 }}
      className="relative w-full max-w-screen-xl mx-auto px-4 py-28 gap-5 md:px-8 flex flex-col justify-center items-center"
    >
      <div className="flex flex-col gap-3 justify-center items-center">
        <h4 className="text-2xl font-bold sm:text-3xl bg-gradient-to-b from-foreground to-muted-foreground text-transparent bg-clip-text">
          FAQ
        </h4>
        <p className="max-w-xl text-muted-foreground text-center">
          Here are some of our frequently asked questions.
        </p>
      </div>
      <div className="flex w-full max-w-lg">
        <Accordion
          fullWidth
          selectionMode="multiple"
          variant="splitted"
          motionProps={{
            variants: {
              enter: {
                y: 0,
                opacity: 1,
                height: "auto",
                transition: {
                  height: {
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    duration: 1,
                  },
                  opacity: {
                    easings: "ease",
                    duration: 1,
                  },
                },
              },
              exit: {
                y: -10,
                opacity: 0,
                height: 0,
                transition: {
                  height: {
                    easings: "ease",
                    duration: 0.25,
                  },
                  opacity: {
                    easings: "ease",
                    duration: 0.3,
                  },
                },
              },
            },
          }}
        >
          {safeMap(accordionItems, (item, index) => (
            <AccordionItem
              key={index}
              aria-label={item.title}
              title={item.title}
              className="text-muted-foreground"
            >
              {item.content}
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </motion.section>
  );
}
