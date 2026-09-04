import { FiArrowLeft, FiCheckCircle, FiClock, FiPackage } from "react-icons/fi";

export const metadata = {
  title: "Returns & Exchanges | FitCheck",
  description: "Learn about our hassle-free return and exchange policy.",
};

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <p className="eyebrow-light mb-3">FitCheck</p>

          <h1 className="editorial-title text-4xl md:text-5xl text-secondary">Returns & Exchanges</h1>
          <p className="text-gray-500 mt-2 text-sm">Hassle-free returns within 30 days</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: FiClock, title: "30-Day Window", desc: "Return within 30 days of delivery" },
              { icon: FiPackage, title: "Original Condition", desc: "Items must be unworn with tags attached" },
              { icon: FiCheckCircle, title: "Easy Process", desc: "Simple online return request" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="text-center p-6 bg-gray-50 rounded-2xl">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Icon size={22} className="text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-secondary">{item.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <section>
            <h2 className="text-xl font-bold text-secondary mb-4">How to Return</h2>
            <div className="space-y-4">
              {[
                { step: "1", title: "Request a Return", desc: "Log into your account and select the order you want to return. Choose your reason and submit the request." },
                { step: "2", title: "Pack Your Item", desc: "Place the item(s) in the original packaging or a secure mailer. Include the return slip inside." },
                { step: "3", title: "Ship It Back", desc: "Use the prepaid shipping label we email you, or drop off at any authorized location." },
                { step: "4", title: "Get Your Refund", desc: "Once we receive and inspect your return, your refund will be processed within 5-7 business days." },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-8 h-8 bg-primary text-white text-sm font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-secondary">{item.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-secondary mb-4">Exchanges</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Want a different size or color? We&apos;re happy to exchange your item. Contact our support team within 30 days of delivery to initiate an exchange. Exchanges are subject to product availability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-secondary mb-4">Non-Returnable Items</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <FiArrowLeft size={14} className="text-gray-400" />
                Items worn, washed, or altered
              </li>
              <li className="flex items-center gap-2">
                <FiArrowLeft size={14} className="text-gray-400" />
                Items without original tags
              </li>
              <li className="flex items-center gap-2">
                <FiArrowLeft size={14} className="text-gray-400" />
                Final sale and clearance items
              </li>
              <li className="flex items-center gap-2">
                <FiArrowLeft size={14} className="text-gray-400" />
                Accessories (earrings, hats, scarves)
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
