import { useState, useEffect } from 'react';
import { ArrowRight, Brain, Code, Github, Globe, Linkedin, Twitter } from 'lucide-react';

interface LandingPageProps {
  onStartGame: () => void;
}

const LandingPage = ({ onStartGame }: LandingPageProps) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Animate in elements after component mounts
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#0a1929] to-[#000B18] text-white overflow-hidden relative">
      {/* Geometric background patterns */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="absolute top-20 left-20 w-96 h-96 rounded-full bg-blue-500 blur-[100px]"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-indigo-600 blur-[100px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-blue-500 rounded-full opacity-10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-blue-500 rounded-full opacity-5"></div>
      </div>

      {/* Main content */}
      <div className={`relative z-10 max-w-5xl mx-auto px-6 py-20 transition-all duration-1000 ease-in-out ${isReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <header className="mb-24 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Brain size={32} className="text-blue-400" />
            <h1 className="text-3xl font-bold">QuizQuest</h1>
          </div>
          <button 
            onClick={onStartGame}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition-all duration-300 hover:scale-105"
          >
            Start Game
            <ArrowRight size={18} />
          </button>
        </header>

        <main className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className={`transition-all duration-1000 delay-300 ${isReady ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
              <h2 className="text-5xl font-bold mb-3 py-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                Raghava Reddy N
              </h2>
              <p className="text-xl text-gray-300 mb-5">Web Developer & AI Enthusiast</p>
            </div>

            <p className={`text-lg text-gray-300 leading-relaxed transition-all duration-1000 delay-500 ${isReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              Welcome to QuizQuest, where knowledge meets challenge. I've crafted this interactive experience to test your knowledge across diverse topics while showcasing the potential of modern web technologies combined with AI capabilities.
            </p>

            <div className={`flex gap-5 transition-all duration-1000 delay-700 ${isReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                <Github size={24} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                <Linkedin size={24} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                <Twitter size={24} />
              </a>
              <a href="https://raghavareddy.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                <Globe size={24} />
              </a>
            </div>
          </div>

          <div className={`space-y-8 transition-all duration-1000 delay-700 ${isReady ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            <div className="bg-blue-900 bg-opacity-20 backdrop-blur-sm p-6 rounded-2xl border border-blue-800">
              <div className="flex items-center gap-3 mb-4">
                <Code size={24} className="text-blue-400" />
                <h3 className="text-xl font-semibold">Web Development Skills</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['React', 'TypeScript', 'Node.js', 'TailwindCSS', 'NextJS', 'GraphQL'].map((skill, i) => (
                  <span key={i} className="bg-blue-800 bg-opacity-30 px-3 py-1 rounded-full text-sm text-center">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-indigo-900 bg-opacity-20 backdrop-blur-sm p-6 rounded-2xl border border-indigo-800">
              <div className="flex items-center gap-3 mb-4">
                <Brain size={24} className="text-indigo-400" />
                <h3 className="text-xl font-semibold">AI Specializations</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['Machine Learning', 'NLP', 'Computer Vision', 'LLMs'].map((skill, i) => (
                  <span key={i} className="bg-indigo-800 bg-opacity-30 px-3 py-1 rounded-full text-sm text-center">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </main>

        <div className={`mt-20 text-center transition-all duration-1000 delay-1000 ${isReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <button 
            onClick={onStartGame}
            className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-10 py-4 rounded-full text-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
          >
            Start Your Quiz Journey
            <ArrowRight size={20} className="inline ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-gray-400 mt-4">Test your knowledge and win big!</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
