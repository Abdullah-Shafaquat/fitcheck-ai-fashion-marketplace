export const metadata = {
  title: "Terms & Conditions | FitCheck",
  description: "FitCheck terms and conditions of use.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <p className="eyebrow-light mb-3">FitCheck</p>

          <h1 className="editorial-title text-4xl md:text-5xl text-secondary">Terms & Conditions</h1>
          <p className="text-gray-500 mt-2 text-sm">Last updated: January 2026</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto prose prose-gray text-sm text-gray-600 leading-relaxed space-y-8">
          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">1. Acceptance of Terms</h2>
            <p>By accessing and using the FitCheck website and services, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">2. Account Registration</h2>
            <p>To access certain features, you may need to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">3. Products and Pricing</h2>
            <p>All product descriptions, images, and prices are as accurate as possible. We reserve the right to modify prices without prior notice. In the event of a pricing error, we may cancel the order and issue a full refund.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">4. Orders and Payment</h2>
            <p>Placing an order constitutes an offer to purchase. We reserve the right to accept or decline any order. Payment must be received in full before order processing begins.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">5. Shipping and Delivery</h2>
            <p>Delivery times are estimates and not guaranteed. FitCheck is not responsible for delays caused by shipping carriers or customs processing. Risk of loss passes to you upon delivery.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">6. Returns and Refunds</h2>
            <p>Returns are accepted within 30 days of delivery for items in original condition. Refunds are processed within 5-7 business days of receiving the return. Shipping costs are non-refundable.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">7. Intellectual Property</h2>
            <p>All content on this website, including text, graphics, logos, and images, is the property of FitCheck and protected by copyright laws. Unauthorized use is prohibited.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">8. Limitation of Liability</h2>
            <p>FitCheck shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">9. Changes to Terms</h2>
            <p>We reserve the right to update these terms at any time. Continued use of our services constitutes acceptance of any changes.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">10. Contact</h2>
            <p>For questions about these Terms, contact us at support@fitcheck.com.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
