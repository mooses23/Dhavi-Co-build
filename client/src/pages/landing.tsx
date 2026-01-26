import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Truck, Wheat } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md gold-gradient flex items-center justify-center">
                <span className="font-serif text-lg font-bold text-black">D</span>
              </div>
              <span className="font-serif text-xl tracking-wide text-gold">D'havi.co</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/order">
                <Button variant="outline" data-testid="link-order">
                  Order Now
                </Button>
              </Link>
              <a href="/api/login">
                <Button variant="ghost" data-testid="link-admin-login">
                  Admin
                </Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/30" />
          <div className="relative max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  <Wheat className="h-4 w-4 text-gold" />
                  <span className="text-sm font-medium text-gold">Premium Small-Batch</span>
                </div>
                <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                  Artisan Spelt
                  <span className="block text-gold">Bagels</span>
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-xl">
                  Crafted with care, baked with intention. Our small-batch spelt bagels bring 
                  old-world tradition to your table, one perfectly boiled and baked ring at a time.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/order">
                    <Button size="lg" className="w-full sm:w-auto gap-2" data-testid="button-order-hero">
                      Order Now
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/track">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto" data-testid="button-track-order">
                      Track Order
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-muted to-accent overflow-hidden ring-1 ring-border">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4 p-8">
                      <div className="w-32 h-32 mx-auto rounded-full gold-gradient opacity-20" />
                      <p className="font-serif text-2xl text-muted-foreground">Fresh Daily</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-xl gold-gradient opacity-10 blur-xl" />
                <div className="absolute -top-6 -right-6 w-32 h-32 rounded-xl gold-gradient opacity-10 blur-xl" />
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card border-y border-border">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
                Why <span className="text-gold">D'havi.co</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Every bagel tells a story of quality ingredients, time-honored techniques, 
                and a commitment to excellence.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="group p-8 rounded-xl bg-background border border-border hover-elevate">
                <div className="w-12 h-12 rounded-lg gold-gradient flex items-center justify-center mb-6">
                  <Wheat className="h-6 w-6 text-black" />
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3">Spelt Flour</h3>
                <p className="text-muted-foreground">
                  Ancient grain, modern craft. Our spelt flour creates a nutty, 
                  slightly sweet flavor with better digestibility.
                </p>
              </div>
              <div className="group p-8 rounded-xl bg-background border border-border hover-elevate">
                <div className="w-12 h-12 rounded-lg gold-gradient flex items-center justify-center mb-6">
                  <Clock className="h-6 w-6 text-black" />
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3">Small Batch</h3>
                <p className="text-muted-foreground">
                  We bake in small quantities to ensure every bagel receives 
                  the attention it deserves. Quality over quantity, always.
                </p>
              </div>
              <div className="group p-8 rounded-xl bg-background border border-border hover-elevate">
                <div className="w-12 h-12 rounded-lg gold-gradient flex items-center justify-center mb-6">
                  <Truck className="h-6 w-6 text-black" />
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3">Local Delivery</h3>
                <p className="text-muted-foreground">
                  Fresh bagels delivered right to your door.
                  We bring our artisan creations directly to you.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-6">
              Ready to Taste the Difference?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Order your fresh bagels today and experience artisan quality.
            </p>
            <Link href="/order">
              <Button size="lg" className="gap-2" data-testid="button-order-cta">
                Place Your Order
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded gold-gradient flex items-center justify-center">
              <span className="font-serif text-sm font-bold text-black">D</span>
            </div>
            <span className="font-serif text-gold">D'havi.co</span>
          </div>
          <p className="text-sm text-muted-foreground">
            2024 D'havi.co. Premium Spelt Bagels.
          </p>
        </div>
      </footer>
    </div>
  );
}
