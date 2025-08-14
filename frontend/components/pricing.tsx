"use client";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { motion } from "framer-motion";

export default function Pricing() {
  // Pricing content updated for SaaS URL. Design unchanged intentionally.
  const plans = [
    {
      name: "Free",
      desc: "For personal projects and testing",
      price: 0,
      isMostPop: false,
      features: [
        "100 links / month",
        "Basic analytics (clicks per link)",
        "QR codes",
        "Community support",
      ],
    },
    {
      name: "Pro",
      desc: "For creators and small teams",
      price: 12,
      isMostPop: true,
      features: [
        "Unlimited links",
        "Real-time analytics (devices, countries, referrers)",
        "Custom slugs & branded links",
        "Export CSV",
        "Email support",
      ],
    },
    {
      name: "Enterprise",
      desc: "For scale and compliance",
      price: 49,
      isMostPop: false,
      features: [
        "SLA & priority support",
        "SSO & role-based access",
        "Audit logs",
        "Custom retention & security review",
        "Dedicated onboarding",
      ],
    },
  ];

  return (
    <motion.section
      id="pricing"
      initial={{ y: 20, opacity: 0 }}
      whileInView={{
        y: 0,
        opacity: 1,
      }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.5, type: "spring", bounce: 0 }}
      className="max-w-screen-xl w-full mx-auto px-4 py-28 gap-5 md:px-8 flex flex-col justify-center items-center"
    >
      <div className="flex flex-col gap-3">
        <h3 className="text-xl font-semibold sm:text-2xl bg-gradient-to-b from-foreground to-muted-foreground text-transparent bg-clip-text">
          Pricing Plans for your business
        </h3>
        <p className="max-w-xl text-muted-foreground text-center">
          Select the plan that best suits your needs.
        </p>
      </div>
      <div className="mt-16 gap-10 grid lg:grid-cols-3 place-content-center">
        {plans.map((item, idx) => (
          <Card
            key={idx}
            shadow="none"
            className={`relative rounded-[20px] p-[3px] will-change-transform ${
              item.isMostPop ? "sm:scale-110" : ""
            }`}
          >
            {item.isMostPop ? (
              <span className="absolute inset-[-1000%] animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#016FEE_70%,#C7DBFB_100%)]" />
            ) : (
              <span className="absolute inset-[-1000%] bg-border" />
            )}
            <div className="z-[2] flex flex-col justify-between w-full h-full bg-card rounded-[18px] p-5">
              <CardBody className="w-full flex items-start gap-3">
                <div className="flex flex-col">
                  <h4 className="text-xl font-light">{item.name}</h4>
                  <span className="text-muted-foreground text-sm font-light">
                    {item.desc}
                  </span>
                </div>
                <span className="text-2xl font-light">
                  {item.price.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </span>

                <Divider />

                <div className="flex flex-col gap-5 pb-5">
                  <span className="text-muted-foreground text-sm font-light">
                    Includes
                  </span>
                  <ul className="flex flex-col gap-2">
                    {item.features.map((feature, index) => (
                      <li key={index} className="text-sm font-light">
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardBody>
              <CardFooter className="p-0">
                <Button
                  className="w-full"
                  variant="solid"
                  color={item.isMostPop ? "primary" : "default"}
                >
                  Get Started
                </Button>
              </CardFooter>
            </div>
          </Card>
        ))}
      </div>
    </motion.section>
  );
}
