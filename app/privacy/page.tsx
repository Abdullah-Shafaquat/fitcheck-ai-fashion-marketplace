export const metadata = {
  title: "Privacy Policy | FitCheck",
  description: "How FitCheck collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <p className="eyebrow-light mb-3">FitCheck</p>

          <h1 className="editorial-title text-4xl md:text-5xl text-secondary">Privacy Policy</h1>
          <p className="text-gray-500 mt-2 text-sm">Last updated: January 2026</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto prose prose-gray text-sm text-gray-600 leading-relaxed space-y-8">
          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly, such as name, email, shipping address, and payment details. We also collect usage data including browsing behavior, device information, and IP addresses.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To process and fulfill your orders</li>
              <li>To communicate order updates and promotions</li>
              <li>To improve our website and services</li>
              <li>To personalize your shopping experience</li>
              <li>To detect and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">3. Information Sharing</h2>
            <p>We do not sell your personal information. We may share data with trusted service providers who assist in operating our website, processing payments, and delivering orders.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">4. Data Security</h2>
            <p>We implement industry-standard security measures including SSL encryption, secure payment processing, and regular security audits to protect your information.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">5. Cookies</h2>
            <p>We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, and personalize content. You can control cookie settings through your browser.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">6. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. Contact us at privacy@fitcheck.com to exercise these rights.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">7. Data Retention</h2>
            <p>We retain your information for as long as your account is active or as needed to provide services. We will delete your data upon request or when it is no longer necessary.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">8. Children&apos;s Privacy</h2>
            <p>Our services are not intended for children under 13. We do not knowingly collect information from children.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">9. Changes to This Policy</h2>
            <p>We may update this policy periodically. We will notify you of significant changes via email or website notice.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-secondary mb-3">10. Contact Us</h2>
            <p>For privacy-related inquiries, email privacy@fitcheck.com or write to: FitCheck Privacy Team, Karachi, Pakistan.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
