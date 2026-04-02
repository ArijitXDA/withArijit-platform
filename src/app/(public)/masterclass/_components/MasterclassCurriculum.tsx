const CURRICULUM = [
  {
    title: '🧠 AI Agents — No-Code Tools',
    type: 'no-code',
    items: ['⚡ Bolt.new', '🤖 Make.com', '🧩 OpenAI Agent Builder', '📊 Airtable', '🔁 Zapier', '🌐 Bubble'],
  },
  {
    title: '⚙️ AI Agents — Low-Code Platforms',
    type: 'low-code',
    items: ['🔗 n8n', '📈 Streamlit', '🎛️ Gradio', '🗄️ Supabase', '🏢 Power Apps'],
  },
  {
    title: '🤖 AI IDEs & Coding Environments',
    type: 'ide',
    items: ['🧠 Cursor', '👨‍💻 GitHub Copilot', '🧩 Claude Code', '🚀 Antigravity'],
  },
  {
    title: '🧩 Agentic AI Frameworks',
    type: 'frameworks',
    items: ['🔗 LangChain', '📚 LlamaIndex', '🕸️ LangGraph', '🤝 AutoGen', '👥 CrewAI', '⚙️ BabyAGI'],
  },
  {
    title: '🐍 Python — Data Analysis',
    type: 'python-data',
    items: ['📊 Pandas', '🔢 NumPy', '📈 Matplotlib', '🎨 Seaborn'],
  },
  {
    title: '🧠 Python — ML & AI',
    type: 'python-ml',
    items: ['🤖 Scikit-learn', '🧠 TensorFlow', '🧩 Keras', '🔥 PyTorch', '📚 Transformers'],
  },
  {
    title: '🚀 Model Fine-Tuning',
    type: 'finetune',
    items: ['🧠 LoRA', '⚡ PEFT'],
  },
  {
    title: '☁️ Deployment & Production',
    type: 'deploy',
    items: ['🐙 GitHub', '▲ Vercel', '🌐 Netlify', '🐳 Docker', '☁️ AWS', '🔷 Azure', '🟡 GCP', '🚄 Render', '🚆 Railway'],
  },
  {
    title: '📊 Business Intelligence',
    type: 'bi',
    items: ['📊 Power BI', '📈 Tableau', '📑 Advanced Excel', '🐍 Python for BI', '🤖 Copilot for Analytics'],
  },
  {
    title: '🔁 Automation & Enterprise',
    type: 'automation',
    items: ['🔄 Power Automate', '🤖 Copilot Studio', '☁️ OneDrive / SharePoint', '📐 DAX', '🧮 Power Query (M)'],
  },
  {
    title: '🧰 Daily AI Productivity',
    type: 'productivity',
    items: ['💬 ChatGPT (Custom GPTs)', '🧠 Claude Projects', '📓 Copilot Notebooks', '📚 NotebookLM', '🔎 Perplexity Spaces', '💎 Gemini Gems', '🗂️ Notion', '🎨 Gamma', '🖌️ Canva'],
  },
]

export function MasterclassCurriculum() {
  return (
    <section className="py-16 px-4 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 mb-4">
            Comprehensive Curriculum
          </span>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">🎯 What You Will Learn</h2>
          <p className="text-gray-500 text-sm">Master cutting-edge AI tools, frameworks &amp; platforms</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CURRICULUM.map(section => (
            <div key={section.type} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm mb-3">{section.title}</h3>
              <div className="flex flex-wrap gap-1.5">
                {section.items.map(item => (
                  <span key={item} className="text-xs bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded-lg">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-center text-gray-400 mt-6">
          📌 Note: Coverage depth varies by track. No prior coding knowledge required for non-tech tracks.
        </p>
      </div>
    </section>
  )
}
