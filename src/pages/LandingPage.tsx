import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3,
  CreditCard,
  FileText,
  Home,
  Users,
  ArrowRight,
  Heart,
  Coffee,
} from "lucide-react";
import "../landingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Add a class to the body for this page-specific styling
    document.body.classList.add("landing-page-body");

    // Redirect to dashboard if user is logged in and auth state is determined
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }

    return () => {
      document.body.classList.remove("landing-page-body");
    };
  }, [user, loading, navigate]);

  // Render a simple loading state or nothing while checking auth to prevent flashing the landing page
  if (loading || user) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#ffffff",
        }}
      >
        {/* You can add a spinner component here if you like */}
      </div>
    );
  }

  // If not loading and no user, render the landing page
  return (
    <div className="landing-page">
      <header className="header">
        <div className="container">
          <nav className="nav">
            <a href="#" className="nav-logo">
              Veyro
            </a>
            <div>
              <a href="#features" className="nav-link">
                Features
              </a>
              <a href="/auth" className="btn btn-primary">
                Get Started <ArrowRight size={16} />
              </a>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container">
            <h1 className="hero-title">
              The Modern OS for Your
              <br />
              <span className="text-gradient">Transport Business</span>
            </h1>
            <p className="hero-subtitle">
              Veyro is a comprehensive business management system designed for
              the transport industry. It simplifies client management, bill
              generation, and payment tracking to help you run your business
              more efficiently.
            </p>
            <a href="/auth" className="btn btn-primary btn-large">
              Start For Free
            </a>
          </div>
        </section>

        <section id="features">
          <div className="container">
            <h2 className="section-title">Everything You Need to Succeed</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <Home />
                </div>
                <h3>Dashboard</h3>
                <p>
                  Get a real-time overview of your business with key stats on
                  bills, payments, and clients.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <Users />
                </div>
                <h3>Client Management</h3>
                <p>
                  Keep all your client information, history, and contacts
                  organized in one central hub.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <FileText />
                </div>
                <h3>Bill Generation</h3>
                <p>
                  Generate and send detailed, professional invoices in seconds.
                  No more manual calculations.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <CreditCard />
                </div>
                <h3>Payment Tracking</h3>
                <p>
                  Instantly see who's paid and who's overdue. Send reminders and
                  manage your cash flow effectively.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <BarChart3 />
                </div>
                <h3>Reporting</h3>
                <p>
                  Generate insightful reports to understand your business
                  performance and make informed decisions.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="container">
            <div className="cta-section">
              <h2 className="section-title">
                Ready to Streamline Your Business?
              </h2>
              <p>
                Sign up for Veyro today and take control of your transport
                business management. Join hundreds of businesses driving their
                success with our platform.
              </p>
              <a href="/auth" className="btn btn-large">
                Get Started Now
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <p className="flex items-center">
              © 2025 Shyam Jaiswal. Made with{" "}
              <Heart fill="red" color="red" className="inline-block h-4 w-4 mx-1" /> and{" "}
              <Coffee color="#FFC107" className="inline-block h-4 w-4 mx-1" /> in India
            </p>
            <div className="footer-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}