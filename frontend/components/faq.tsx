"use client";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { motion } from "framer-motion";

export default function Faq() {
  const accordionItems = [
    {
      title: "How accurate are your analytics?",
      content: (
        <div className="text-muted-foreground">
          We count every redirect server-side and enrich with device, browser, referrer and best-effort geolocation. In production, enable <code>CF-Connecting-IP</code> (or <code>X-Forwarded-For</code>) so we can resolve public IPs behind proxies.
        </div>
      ),
    },
    {
      title: "Do you support branded links and custom slugs?",
      content: (
        <div className="text-muted-foreground">
          Yes. You can define custom slugs on creation, and configure a custom domain for fully branded short links.
        </div>
      ),
    },
    {
      title: "Can I export my data?",
      content: (
        <div className="text-muted-foreground">
          Pro and Enterprise plans include CSV export for links and click metrics. You can also query the REST API directly.
        </div>
      ),
    },
    {
      title: "Is there an API?",
      content: (
        <div className="text-muted-foreground">
          Absolutely. The platform is built on a documented REST API. Create links, fetch stats, and manage your account programmatically.
        </div>
      ),
    },
    {
      title: "What about privacy and security?",
      content: (
        <div className="text-muted-foreground">
          We store minimal data, honor <code>robots</code> and cache headers where applicable, and provide role-based access on Enterprise. Contact us for a security review and DPA.
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
          {accordionItems.map((item, index) => (
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
