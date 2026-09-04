import { FiTruck, FiClock, FiGlobe, FiShield } from "react-icons/fi";

export const metadata = {
  title: "Shipping & Delivery | FitCheck",
  description: "Learn about FitCheck shipping options, delivery times, and policies.",
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <p className="eyebrow-light mb-3">FitCheck</p>

          <h1 className="editorial-title text-4xl md:text-5xl text-secondary">Shipping & Delivery</h1>
          <p className="text-gray-500 mt-2 text-sm">Fast, reliable shipping to your doorstep</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: FiTruck, title: "Free Shipping", desc: "On orders over Rs 5,000" },
              { icon: FiClock, title: "Fast Delivery", desc: "1-3 business days express" },
              { icon: FiGlobe, title: "Worldwide", desc: "50+ countries served" },
              { icon: FiShield, title: "Insured Packages", desc: "Full coverage protection" },
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
            <h2 className="text-xl font-bold text-secondary mb-4">Shipping Options</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                    <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase">Delivery Time</th>
                    <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase">Cost</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-50">
                    <td className="py-3">Standard Shipping</td>
                    <td className="py-3">5-7 business days</td>
                    <td className="py-3">Rs 250 (Free over Rs 5,000)</td>
                  </tr>
                  <tr className="border-b border-gray-50">
                    <td className="py-3">Express Shipping</td>
                    <td className="py-3">1-3 business days</td>
                    <td className="py-3">Rs 500</td>
                  </tr>
                  <tr className="border-b border-gray-50">
                    <td className="py-3">International Standard</td>
                    <td className="py-3">7-14 business days</td>
                    <td className="py-3">Rs 1,500</td>
                  </tr>
                  <tr>
                    <td className="py-3">International Express</td>
                    <td className="py-3">3-5 business days</td>
                    <td className="py-3">Rs 2,500</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-secondary mb-4">Additional Information</h2>
            <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
              <p>Orders are processed within 1-2 business days. You will receive a confirmation email with tracking details once your order ships.</p>
              <p>During peak seasons (holidays, sales events), processing may take an additional 1-2 days.</p>
              <p>If your package is delayed beyond the estimated delivery window, please contact our support team for assistance.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
