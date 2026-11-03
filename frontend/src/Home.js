import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowRight, FaCode, FaBug, FaRobot, FaShieldAlt,
  FaGithub, FaChartLine, FaUsers, FaFileAlt,
  FaChalkboardTeacher, FaUserGraduate, FaUserTie,
  FaFlask, FaEye, FaStar, FaLock, FaPlay, FaCodeBranch,
} from "react-icons/fa";
import { BsBarChartFill, BsShieldFillCheck } from "react-icons/bs";
import { MdGrade, MdOutlineAnalytics } from "react-icons/md";
import { IoFingerPrint } from "react-icons/io5";
import "./Home.css";

const features = [
  { icon: <FaCode />,           title: "Function Attribution", desc: "Identify who wrote each function using AST analysis." },
  { icon: <FaBug />,            title: "Bug Tracking",         desc: "Track bug introducers & fixers via SZZ Algorithm." },
  { icon: <FaCodeBranch />,    title: "Review Impact",        desc: "Credit reviewers whose suggestions were merged." },
  { icon: <FaRobot />,          title: "AI Detection",         desc: "Detect AI-generated code using GraphCodeBERT." },
  { icon: <FaShieldAlt />,      title: "Evidence Reports",     desc: "Transparent grading reports with full proof." },
  { icon: <MdOutlineAnalytics />, title: "Contribution Analytics", desc: "Deep insights into every team member's effort." },
];

const steps = [
  { icon: <FaChalkboardTeacher />, step: "01", title: "Teacher Setup",   desc: "Create project & add students" },
  { icon: <FaGithub />,           step: "02", title: "Connect GitHub",   desc: "Fetch commits, PRs & diffs" },
  { icon: <FaCode />,             step: "03", title: "Students Code",    desc: "Push commits & collaborate" },
  { icon: <FaRobot />,            step: "04", title: "AI Analysis",      desc: "Analyze every contribution" },
  { icon: <MdGrade />,            step: "05", title: "Generate Grades",  desc: "Evidence-based fair scoring" },
];

const roles = [
  { icon: <FaUserTie />,      label: "HOD",         color: "#6675ff" },
  { icon: <FaChalkboardTeacher />, label: "Teacher", color: "#8c4fff" },
  { icon: <FaUserGraduate />, label: "Student",      color: "#6675ff" },
  { icon: <FaCode />,         label: "Coder",        color: "#8c4fff" },
  { icon: <FaFileAlt />,      label: "Documenter",   color: "#6675ff" },
  { icon: <FaFlask />,        label: "Tester",       color: "#8c4fff" },
  { icon: <FaEye />,          label: "Reviewer",     color: "#6675ff" },
  { icon: <FaUsers />,        label: "Coordinator",  color: "#8c4fff" },
];

const stats = [
  { icon: <FaCode />,          value: "500+",  label: "Projects" },
  { icon: <FaUserGraduate />,  value: "2500+", label: "Students" },
  { icon: <BsBarChartFill />,  value: "98%",   label: "Accuracy" },
  { icon: <BsShieldFillCheck />, value: "100%", label: "Fair Grading" },
];

const contributors = [
  { name: "Sharath H N", pct: 92, danger: false },
  { name: "Ravi",        pct: 80, danger: false },
  { name: "Kiran",       pct: 75, danger: false },
  { name: "Rohit",       pct: 32, danger: true  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
          <IoFingerPrint className="logo-icon" />
          <div>
            <h2>CodeFingerprints</h2>
            <p>Track. Analyze. Grade Fairly.</p>
          </div>
        </div>
        <ul className="nav-links">
          <li>Features</li>
          <li>How It Works</li>
          <li>Roles</li>
        </ul>
        <button className="login-btn" onClick={() => navigate("/login")}>
          Login <FaArrowRight className="btn-icon" />
        </button>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <span className="tag">
            <FaRobot className="tag-icon" /> AI-Powered Contribution Tracking
          </span>
          <h1>
            Make Every<br />
            <span>Contribution Visible</span>
          </h1>
          <p>
            CodeFingerprints uses AI to analyze coding contributions,
            review impact, bug lifecycle tracking, and evidence-based
            grading for collaborative coding projects.
          </p>
          <div className="hero-buttons">
            <button className="primary-btn" onClick={() => navigate("/login")}>
              Get Started <FaArrowRight />
            </button>
            <button className="secondary-btn">
              <FaPlay className="play-icon" /> Watch Demo
            </button>
          </div>
          <div className="hero-badges">
            <span><FaRobot />  AI Powered</span>
            <span><BsBarChartFill /> Evidence Based</span>
            <span><BsShieldFillCheck /> Fair Grading</span>
            <span><FaLock /> Secure</span>
          </div>
        </div>

        {/* DASHBOARD MOCKUP */}
        <div className="hero-right">
          <div className="dashboard-card">
            <div className="dash-header">
              <FaChartLine className="dash-header-icon" />
              <span>Live Dashboard</span>
              <span className="live-dot" />
            </div>

            <div className="top-stats">
              {[
                { icon: <FaCode />,         val: "24",  label: "Projects" },
                { icon: <FaUserGraduate />, val: "128", label: "Students" },
                { icon: <BsBarChartFill />, val: "76%", label: "Contribution" },
                { icon: <FaRobot />,        val: "12%", label: "AI Code" },
              ].map((s, i) => (
                <div className="stat-box" key={i}>
                  <span className="stat-icon">{s.icon}</span>
                  <h3>{s.val}</h3>
                  <p>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="contributors">
              <h4><FaStar className="section-icon" /> Top Contributors</h4>
              {contributors.map((c, i) => (
                <div className="contributor" key={i}>
                  <span className="c-name">{c.name}</span>
                  <div className="progress">
                    <div style={{ width: `${c.pct}%` }} />
                  </div>
                  <span className={c.danger ? "danger" : "safe"}>{c.pct}%</span>
                </div>
              ))}
            </div>

            <div className="heatmap">
              <h4><BsBarChartFill className="section-icon" /> Contribution Heatmap</h4>
              <div className="heatmap-grid">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div className="heat-cell" key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="section-title">
          <span className="section-tag"><MdOutlineAnalytics /> Features</span>
          <h2>Powerful Features</h2>
          <p>Everything needed for fair project evaluation</p>
        </div>
        <div className="feature-grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon-wrap">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="workflow">
        <div className="section-title">
          <span className="section-tag"><FaGithub /> Process</span>
          <h2>How It Works</h2>
          <p>Five simple steps to fair grading</p>
        </div>
        <div className="workflow-grid">
          {steps.map((s, i) => (
            <div className="workflow-card" key={i}>
              <span className="step-num">{s.step}</span>
              <div className="workflow-icon">{s.icon}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROLES */}
      <section className="roles">
        <div className="section-title">
          <span className="section-tag"><FaUsers /> Roles</span>
          <h2>Supported Roles</h2>
          <p>Every team member gets recognized</p>
        </div>
        <div className="role-grid">
          {roles.map((r, i) => (
            <div className="role-card" key={i} style={{ "--role-color": r.color }}>
              <div className="role-icon-wrap">{r.icon}</div>
              <span>{r.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="stats-section">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-card-icon">{s.icon}</div>
            <h2>{s.value}</h2>
            <p>{s.label}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-inner">
          <span className="cta-tag"><FaRobot /> Get Started Today</span>
          <h2>Ready To Make Every Contribution Count?</h2>
          <p>Connect your GitHub repository and let AI analyze contributions automatically.</p>
          <button className="cta-btn" onClick={() => navigate("/login")}>
            Start Tracking Now <FaArrowRight />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-brand">
          <IoFingerPrint className="footer-logo-icon" />
          <div>
            <h2>CodeFingerprints</h2>
            <p>AI Powered Contribution Tracking for Collaborative Coding Projects.</p>
          </div>
        </div>
        <div>
          <h4>Resources</h4>
          <p>Documentation</p>
          <p>API Reference</p>
          <p>Support</p>
        </div>
        <div>
          <h4>Company</h4>
          <p>About</p>
          <p>Contact</p>
          <p>Privacy Policy</p>
        </div>
        <div>
          <h4>Roles</h4>
          <p>Teacher Portal</p>
          <p>HOD Portal</p>
          <p>Student Portal</p>
        </div>
      </footer>

    </div>
  );
}




