import Link from "next/link";
import { FiBriefcase, FiMapPin, FiClock, FiArrowRight } from "react-icons/fi";

export const metadata = {
  title: "Careers | FitCheck",
  description: "Join the FitCheck team - explore open positions and grow with us.",
};

const jobs = [
  { title: "Frontend Developer", department: "Engineering", location: "Karachi, Pakistan", type: "Full-time" },
  { title: "Fashion Buyer", department: "Merchandising", location: "Karachi, Pakistan", type: "Full-time" },
  { title: "Social Media Manager", department: "Marketing", location: "Remote", type: "Full-time" },
  { title: "Customer Support Agent", department: "Operations", location: "Karachi, Pakistan", type: "Full-time" },
  { title: "Warehouse Associate", department: "Operations", location: "Karachi, Pakistan", type: "Part-time" },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <p className="eyebrow-light mb-3">FitCheck</p>

          <h1 className="editorial-title text-4xl md:text-5xl text-secondary">Careers at FitCheck</h1>
          <p className="text-gray-500 mt-2 text-sm">Join our team and help shape the future of fashion</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          <section>
            <h2 className="text-2xl font-bold text-secondary mb-4">Why Work With Us?</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { title: "Growth", desc: "We invest in our people with mentorship, learning budgets, and clear career paths." },
                { title: "Culture", desc: "Collaborative, inclusive, and fun. We believe great work comes from happy teams." },
                { title: "Impact", desc: "Your work reaches thousands of customers. Make a real difference every day." },
              ].map((item) => (
                <div key={item.title} className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-secondary mb-2">{item.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-secondary mb-6">Open Positions</h2>
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.title} className="flex items-center justify-between p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                  <div>
                    <h3 className="text-sm font-bold text-secondary group-hover:text-primary transition-colors">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><FiBriefcase size={12} /> {job.department}</span>
                      <span className="flex items-center gap-1"><FiMapPin size={12} /> {job.location}</span>
                      <span className="flex items-center gap-1"><FiClock size={12} /> {job.type}</span>
                    </div>
                  </div>
                  <FiArrowRight size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>
          </section>

          <section className="text-center bg-gray-50 rounded-2xl p-8 md:p-12">
            <h2 className="text-xl font-bold text-secondary mb-3">Don&apos;t see your role?</h2>
            <p className="text-sm text-gray-500 mb-6">Send us your resume and we&apos;ll keep you in mind for future opportunities.</p>
            <Link href="/contact" className="inline-block px-8 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all">
              Contact Us
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
