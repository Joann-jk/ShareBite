import React, { useState, useEffect } from "react";
import { useAuth } from "../../lib/AuthContext";
import { useNavigate } from "react-router-dom";

// Custom Button component
function Button({ children, className = "", variant = "primary", ...props }) {
  const baseClasses = "px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg";
  const variants = {
    primary: "bg-yellow-500 text-black hover:bg-yellow-400 hover:shadow-yellow-500/25",
    secondary: "bg-gray-800 text-yellow-500 border border-yellow-500 hover:bg-yellow-500 hover:text-black",
    outline: "border-2 border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
  };


  
  return (
    <button
      {...props}
      className={`${baseClasses} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

const Homepage = () => {
  const {user,userRole} = useAuth()
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate()
  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (!user || !userRole) return;
    if (userRole === "donor") {
      navigate("/donor", { replace: true });
    } else if (userRole === "recipient") {
      navigate("/recipient", { replace: true });
    } else if (userRole === "volunteer") {
      navigate("/volunteer", { replace: true });
    }
    // If you want to handle other roles, add more cases here
  }, [user, userRole, navigate]);



  return (
    <div className="font-inter bg-black text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-black bg-opacity-95 backdrop-blur-md shadow-lg border-b border-gray-800">
        <div className="flex justify-between items-center px-10 py-4 max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-lg">S</span>
            </div>
            <h1 className="text-2xl font-bold text-white">ShareBite</h1>
          </div>
          <div className="flex items-center gap-8">
            <a href="#about" className="text-gray-300 hover:text-yellow-500 font-medium transition-colors duration-300 relative group">
              About
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-500 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#donors" className="text-gray-300 hover:text-yellow-500 font-medium transition-colors duration-300 relative group">
              For Donors
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-500 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#impact" className="text-gray-300 hover:text-yellow-500 font-medium transition-colors duration-300 relative group">
              Impact
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-500 group-hover:w-full transition-all duration-300"></span>
            </a>
            <Button><a href="/signup">Sign in</a></Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        {/* Subtle Background Elements */}
        <div className="absolute inset-0">
         

        </div>

        <div className={`relative z-10 text-center px-4 max-w-6xl mx-auto transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Main Tagline */}
          <div className="mb-8">
            <p className="text-yellow-500 text-xl font-medium mb-2 tracking-wide uppercase">Where Surplus Meets Purpose</p>
            <h2 className="text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              From Waste
              <span className="block text-yellow-500">To Wonder</span>
            </h2>
          </div>
          
          {/* Attractive Tagline */}
          <div className="mb-12">
            <p className="text-2xl text-gray-300 mb-4 leading-relaxed max-w-4xl mx-auto">
              <span className="text-yellow-500 font-semibold">"Every meal saved is a life touched."</span>
            </p>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
              ShareBite transforms surplus food into hope, connecting generous hearts with hungry families. 
              Because the shortest distance between abundance and need is human compassion.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button className="text-lg px-10 py-4 font-bold">
              Start Sharing Today
            </Button>
            <Button variant="outline" className="text-lg px-10 py-4">
              Discover Our Mission
            </Button>
          </div>
        </div>
      </section>

    
      {/* About Section */}
      <section id="about" className="py-20 px-10 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-yellow-500 text-lg font-medium mb-4 tracking-wide uppercase">Our Story</p>
            <h3 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Bridging Hearts Through Food
            </h3>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              In a world where 40% of food goes to waste while millions face hunger, ShareBite creates 
              the missing connection. We're not just reducing waste—we're building communities, 
              one shared meal at a time.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="bg-gray-800 border border-gray-700 p-8 rounded-xl hover:border-yellow-500 transition-colors duration-300">
                <h4 className="text-2xl font-semibold text-white mb-4 flex items-center">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></span>
                  Our Mission
                </h4>
                <p className="text-gray-300 leading-relaxed">
                  To create a world where no edible food is wasted and no person goes hungry. 
                  We connect surplus food with communities in need through technology, compassion, and action.
                </p>
              </div>
              <div className="bg-gray-800 border border-gray-700 p-8 rounded-xl hover:border-yellow-500 transition-colors duration-300">
                <h4 className="text-2xl font-semibold text-white mb-4 flex items-center">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></span>
                  Our Vision
                </h4>
                <p className="text-gray-300 leading-relaxed">
                  A sustainable future where every community has access to nutritious food, 
                  and every business contributes to social good through conscious food sharing.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="text-center bg-gray-800 border border-gray-700 p-8 rounded-xl hover:border-yellow-500 transition-colors duration-300">
                <div className="text-4xl font-bold text-yellow-500 mb-2">25K+</div>
                <div className="text-gray-300">Meals Rescued</div>
              </div>
              <div className="text-center bg-gray-800 border border-gray-700 p-8 rounded-xl hover:border-yellow-500 transition-colors duration-300">
                <div className="text-4xl font-bold text-yellow-500 mb-2">450+</div>
                <div className="text-gray-300">Partner Locations</div>
              </div>
              <div className="text-center bg-gray-800 border border-gray-700 p-8 rounded-xl hover:border-yellow-500 transition-colors duration-300">
                <div className="text-4xl font-bold text-yellow-500 mb-2">18</div>
                <div className="text-gray-300">Cities Connected</div>
              </div>
              <div className="text-center bg-gray-800 border border-gray-700 p-8 rounded-xl hover:border-yellow-500 transition-colors duration-300">
                <div className="text-4xl font-bold text-yellow-500 mb-2">99%</div>
                <div className="text-gray-300">Impact Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Donor Benefits */}
      <section id="donors" className="py-20 px-10 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-yellow-500 text-lg font-medium mb-4 tracking-wide uppercase">Partnership Benefits</p>
            <h3 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Why Choose ShareBite?
            </h3>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Join forward-thinking restaurants, grocery stores, and food services creating meaningful impact 
              while building stronger communities and sustainable business practices.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-xl hover:border-yellow-500 hover:bg-gray-800 transition-all duration-300 group">
              <div className="w-16 h-16 bg-yellow-500 bg-opacity-10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-opacity-20 transition-all duration-300">
                <div className="w-8 h-8 bg-yellow-500 rounded"></div>
              </div>
              <h4 className="text-2xl font-semibold text-white mb-4">Smart Waste Reduction</h4>
              <p className="text-gray-300 leading-relaxed">
                Transform surplus inventory into community impact with our intelligent matching system. 
                Track donations, measure impact, and maximize tax benefits seamlessly.
              </p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-xl hover:border-yellow-500 hover:bg-gray-800 transition-all duration-300 group">
              <div className="w-16 h-16 bg-yellow-500 bg-opacity-10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-opacity-20 transition-all duration-300">
                <div className="w-8 h-8 bg-yellow-500 rounded-full"></div>
              </div>
              <h4 className="text-2xl font-semibold text-white mb-4">Community Connection</h4>
              <p className="text-gray-300 leading-relaxed">
                Build authentic relationships with local families and organizations. 
                Create lasting positive change that strengthens your community presence and brand loyalty.
              </p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-xl hover:border-yellow-500 hover:bg-gray-800 transition-all duration-300 group">
              <div className="w-16 h-16 bg-yellow-500 bg-opacity-10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-opacity-20 transition-all duration-300">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg transform rotate-45"></div>
              </div>
              <h4 className="text-2xl font-semibold text-white mb-4">Business Excellence</h4>
              <p className="text-gray-300 leading-relaxed">
                Enhance ESG metrics, unlock tax advantages, and differentiate your brand. 
                Attract conscious consumers while contributing to UN Sustainable Development Goals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section id="impact" className="py-20 px-10 bg-gradient-to-r from-gray-900 to-black">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-yellow-500 text-lg font-medium mb-4 tracking-wide uppercase">Real Impact</p>
          <h3 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Transforming Lives, One Meal at a Time
          </h3>
          <p className="text-xl text-gray-300 leading-relaxed mb-16 max-w-4xl mx-auto">
            Every donation creates a ripple effect of positive change. Here's the measurable impact 
            we're creating together across communities nationwide.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
            <div className="bg-gray-900 bg-opacity-50 border border-yellow-500 border-opacity-30 p-8 rounded-xl">
              <div className="text-5xl font-bold text-yellow-500 mb-2">3.8M</div>
              <div className="text-gray-300 text-lg">Pounds Rescued</div>
            </div>
            <div className="bg-gray-900 bg-opacity-50 border border-yellow-500 border-opacity-30 p-8 rounded-xl">
              <div className="text-5xl font-bold text-yellow-500 mb-2">125K</div>
              <div className="text-gray-300 text-lg">Lives Touched</div>
            </div>
            <div className="bg-gray-900 bg-opacity-50 border border-yellow-500 border-opacity-30 p-8 rounded-xl">
              <div className="text-5xl font-bold text-yellow-500 mb-2">580</div>
              <div className="text-gray-300 text-lg">Active Partners</div>
            </div>
            <div className="bg-gray-900 bg-opacity-50 border border-yellow-500 border-opacity-30 p-8 rounded-xl">
              <div className="text-5xl font-bold text-yellow-500 mb-2">$2.1M</div>
              <div className="text-gray-300 text-lg">Value Created</div>
            </div>
          </div>
          
          <Button variant="secondary" className="text-lg px-8 py-4">
            View Detailed Impact Report
          </Button>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-10 bg-yellow-500">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-4xl lg:text-5xl font-bold text-black mb-6">
            Ready to Turn Waste Into Wonder?
          </h3>
          <p className="text-xl text-gray-800 mb-12 leading-relaxed max-w-3xl mx-auto">
            Join thousands of changemakers who've discovered that the most powerful way to fight hunger 
            is by sharing what we already have. Your surplus is someone's solution.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button className="text-lg px-10 py-4 bg-black text-yellow-500 hover:bg-gray-900 shadow-2xl">
              Become a Food Hero
            </Button>
            <Button variant="outline" className="text-lg px-10 py-4 border-black text-black hover:bg-black hover:text-yellow-500">
              Find Food Support
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 text-white py-16 px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-lg">S</span>
                </div>
                <h4 className="text-2xl font-bold">ShareBite</h4>
              </div>
              <p className="text-gray-400 leading-relaxed mb-4">
                Transforming surplus food into community hope. Where every meal saved is a life touched.
              </p>
              <p className="text-yellow-500 font-medium italic">
                "From Waste to Wonder"
              </p>
            </div>
            
            <div>
              <h5 className="text-lg font-semibold mb-4 text-yellow-500">Quick Links</h5>
              <div className="space-y-3">
                <p><a href="#" className="text-gray-400 hover:text-white transition-colors">How It Works</a></p>
                <p><a href="#" className="text-gray-400 hover:text-white transition-colors">For Donors</a></p>
                <p><a href="#" className="text-gray-400 hover:text-white transition-colors">For Recipients</a></p>
                <p><a href="#" className="text-gray-400 hover:text-white transition-colors">Success Stories</a></p>
              </div>
            </div>
            
            <div>
              <h5 className="text-lg font-semibold mb-4 text-yellow-500">Support</h5>
              <div className="space-y-3">
                <p><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></p>
                <p><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</a></p>
                <p><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></p>
                <p><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></p>
              </div>
            </div>
            
            <div>
              <h5 className="text-lg font-semibold mb-4 text-yellow-500">Connect</h5>
              <div className="space-y-3">
                <p className="text-gray-400">hello@sharebite.org</p>
                <p className="text-gray-400">+1 (555) 123-BITE</p>
                <div className="flex space-x-4 mt-6">
                  <a href="#" className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-all duration-300">
                    <span className="text-sm font-bold">f</span>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-all duration-300">
                    <span className="text-sm font-bold">t</span>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-all duration-300">
                    <span className="text-sm font-bold">in</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">© 2025 ShareBite. All rights reserved. | Turning waste into wonder, one meal at a time.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;