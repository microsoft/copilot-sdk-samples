import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Boxes, Sparkles } from "lucide-react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import DemoCard from "./components/DemoCard";
import DemoDetailModal from "./components/DemoDetailModal";
import type { Catalog, Demo, SampleType } from "./types";
import "./index.css";

const App: React.FC = () => {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [activeView, setActiveView] = useState<SampleType | "all">("all");
  const [selectedDemo, setSelectedDemo] = useState<Demo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/catalog.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load catalog");
        }
        return response.json();
      })
      .then((data: Catalog) => {
        setCatalog(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load catalog");
        setLoading(false);
      });
  }, []);

  const { sdkCount, ghawCount } = useMemo(() => {
    if (!catalog) return { sdkCount: 0, ghawCount: 0 };
    return {
      sdkCount: catalog.demos.filter((d) => d.features.sdk).length,
      ghawCount: catalog.demos.filter((d) => d.features.ghaw).length,
    };
  }, [catalog]);

  const filteredDemos = useMemo(() => {
    if (!catalog) return { core: [], isv: [] };

    let demos = catalog.demos;

    if (activeView !== "all") {
      demos = demos.filter((demo) => {
        if (activeView === "sdk") return demo.features.sdk;
        if (activeView === "ghaw") return demo.features.ghaw;
        return true;
      });
    }

    const core = demos.filter((d) => d.tier === "mandatory");
    const isv = demos.filter(
      (d) => d.tier === "isv-tier-1" || d.tier === "isv-tier-2",
    );

    const teamsDemoIndex = isv.findIndex((d) => d.id === "teams");
    if (teamsDemoIndex > 0) {
      const teamsDemo = isv.splice(teamsDemoIndex, 1)[0];
      isv.unshift(teamsDemo);
    }

    return { core, isv };
  }, [catalog, activeView]);

  const handleDemoClick = (demo: Demo) => {
    setSelectedDemo(demo);
  };

  const handleCloseModal = () => {
    setSelectedDemo(null);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <p>Loading samples...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <h2>Unable to load catalog</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="app-error">
        <h2>No catalog found</h2>
      </div>
    );
  }

  const totalDemos = filteredDemos.core.length + filteredDemos.isv.length;

  return (
    <div className="app">
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        sdkCount={sdkCount}
        ghawCount={ghawCount}
      />

      <div className="app-body">
        <Sidebar />

        <main className="main">
          <div className="main-inner">
            {totalDemos === 0 ? (
              <div className="empty-state">
                <Boxes size={48} />
                <h3>No samples found</h3>
                <p>Try selecting a different view</p>
              </div>
            ) : (
              <>
                {filteredDemos.core.length > 0 && (
                  <section className="demo-section">
                    <header className="demo-section-header">
                      <div className="demo-section-title-group">
                        <Sparkles size={18} className="demo-section-icon" />
                        <h2 className="demo-section-title">Core Samples</h2>
                      </div>
                      <p className="demo-section-subtitle">
                        Essential patterns for SDK and workflow development
                      </p>
                    </header>
                    <motion.div
                      className="demo-grid"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {filteredDemos.core.map((demo, index) => (
                        <DemoCard
                          key={demo.id}
                          demo={demo}
                          onClick={() => handleDemoClick(demo)}
                          index={index}
                        />
                      ))}
                    </motion.div>
                  </section>
                )}

                {filteredDemos.isv.length > 0 && (
                  <section className="demo-section">
                    <header className="demo-section-header">
                      <div className="demo-section-title-group">
                        <Boxes size={18} className="demo-section-icon" />
                        <h2 className="demo-section-title">ISV Integrations</h2>
                      </div>
                      <p className="demo-section-subtitle">
                        Connect Copilot SDK with enterprise tools and platforms
                      </p>
                    </header>
                    <motion.div
                      className="demo-grid"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      {filteredDemos.isv.map((demo, index) => (
                        <DemoCard
                          key={demo.id}
                          demo={demo}
                          onClick={() => handleDemoClick(demo)}
                          index={index}
                        />
                      ))}
                    </motion.div>
                  </section>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence mode="wait">
        {selectedDemo && (
          <DemoDetailModal
            demo={selectedDemo}
            isOpen={!!selectedDemo}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
