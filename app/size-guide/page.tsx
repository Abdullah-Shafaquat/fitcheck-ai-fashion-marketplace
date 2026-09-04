export const metadata = {
  title: "Size Guide | FitCheck",
  description: "Find your perfect fit with our comprehensive size guide.",
};

const sizeData = {
  Men: {
    headers: ["Size", "Chest (in)", "Waist (in)", "Hips (in)"],
    rows: [
      ["XS", "32-34", "28-30", "34-36"],
      ["S", "35-37", "31-33", "37-39"],
      ["M", "38-40", "34-36", "40-42"],
      ["L", "41-43", "37-39", "43-45"],
      ["XL", "44-46", "40-42", "46-48"],
      ["XXL", "47-49", "43-45", "49-51"],
    ],
  },
  Women: {
    headers: ["Size", "Bust (in)", "Waist (in)", "Hips (in)"],
    rows: [
      ["XS", "31-32", "24-25", "34-35"],
      ["S", "33-34", "26-27", "36-37"],
      ["M", "35-36", "28-29", "38-39"],
      ["L", "37-39", "30-32", "40-42"],
      ["XL", "40-42", "33-35", "43-45"],
      ["XXL", "43-45", "36-38", "46-48"],
    ],
  },
  Kids: {
    headers: ["Size", "Age", "Height (in)", "Chest (in)"],
    rows: [
      ["4-5Y", "4-5", "42-44", "23-24"],
      ["6-7Y", "6-7", "45-48", "25-26"],
      ["8-9Y", "8-9", "49-52", "27-28"],
      ["10-11Y", "10-11", "53-56", "29-30"],
      ["12-13Y", "12-13", "57-61", "31-33"],
    ],
  },
  Shoes: {
    headers: ["US", "EU", "UK", "CM"],
    rows: [
      ["7", "40", "6", "25"],
      ["8", "41", "7", "26"],
      ["9", "42.5", "8", "27"],
      ["10", "44", "9", "28"],
      ["11", "45", "10", "29"],
      ["12", "46", "11", "30"],
    ],
  },
};

export default function SizeGuidePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <p className="eyebrow-light mb-3">FitCheck</p>

          <h1 className="editorial-title text-4xl md:text-5xl text-secondary">Size Guide</h1>
          <p className="text-gray-500 mt-2 text-sm">Find your perfect fit</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          <section className="bg-gray-50 rounded-2xl p-6 md:p-8">
            <h2 className="text-lg font-bold text-secondary mb-2">How to Measure</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              Use a soft measuring tape and measure directly against your body. For the most accurate results, have someone help you measure.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 text-xs text-gray-600">
              <div className="bg-white rounded-xl p-4">
                <p className="font-semibold text-secondary mb-1">Chest / Bust</p>
                <p>Measure around the fullest part of your chest, keeping the tape level.</p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <p className="font-semibold text-secondary mb-1">Waist</p>
                <p>Measure around your natural waistline, the narrowest part of your torso.</p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <p className="font-semibold text-secondary mb-1">Hips</p>
                <p>Measure around the fullest part of your hips and buttocks.</p>
              </div>
            </div>
          </section>

          {(Object.entries(sizeData) as [string, typeof sizeData.Men][]).map(([category, data]) => (
            <section key={category}>
              <h2 className="text-xl font-bold text-secondary mb-4">{category}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {data.headers.map((h) => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        {row.map((cell, j) => (
                          <td key={j} className={`py-3 px-4 text-gray-600 ${j === 0 ? "font-semibold text-secondary" : ""}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <section className="bg-orange-50 rounded-2xl p-6">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-secondary">Tip:</span> If you&apos;re between sizes, we recommend sizing up for a more comfortable fit. Each product page also includes specific sizing notes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
