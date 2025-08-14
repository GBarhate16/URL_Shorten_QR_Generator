import dynamic from "next/dynamic";
const NavBar = dynamic(() => import("@/components/navbar"), { ssr: true });
const Hero = dynamic(() => import("@/components/hero"), { ssr: true });
const Stats = dynamic(() => import("@/components/stats"), { ssr: true });
const Testimonials = dynamic(() => import("@/components/testimonials"), { ssr: true });

const Faq = dynamic(() => import("@/components/faq"), { ssr: true });
const Footer = dynamic(() => import("@/components/footer"), { ssr: true });

export const revalidate = 300;

export default function Home() {
  return (
    <main className="flex flex-col min-h-dvh overflow-x-hidden">
      <NavBar />
      <div className="container-responsive">
        <Hero />
      </div>
      <div className="container-responsive">
        <section id="testimonials" className="scroll-mt-20">
          <div className="mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">Testimonials</h2>
            <Testimonials />
          </div>
        </section>
      </div>
      <div className="container-responsive">
        <Stats />
      </div>
      {/* Pricing section removed */}
      <div className="container-responsive">
        <Faq />
      </div>
      <Footer />
    </main>
  );
}
