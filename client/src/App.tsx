import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { useState, useEffect } from "react";
import ApiKeyModal from "@/components/ApiKeyModal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  useEffect(() => {
    // Check if there's a saved API key in localStorage
    const savedApiKey = localStorage.getItem("anthropic_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      // If no API key is found, show the modal
      setShowApiKeyModal(true);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem("anthropic_api_key", key);
    setApiKey(key);
    setShowApiKeyModal(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
      {showApiKeyModal && (
        <ApiKeyModal
          onSave={handleSaveApiKey}
          onCancel={() => setShowApiKeyModal(false)}
        />
      )}
    </QueryClientProvider>
  );
}

export default App;
