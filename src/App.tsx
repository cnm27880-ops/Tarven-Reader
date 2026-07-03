import { useState, useRef } from "react";
import { Layout } from "./components/Layout";
import { Sidebar } from "./components/Sidebar";
import { ReadingArea } from "./components/ReadingArea";
import { Toolbar } from "./components/Toolbar";
import { useChatManager } from "./hooks/useChatManager";
import { exportToTxt } from "./lib/utils";
import "./index.css";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    messages,
    theme,
    toggleTheme,
    viewMode,
    toggleViewMode,
    parseSillyTavernJson,
  } = useChatManager();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      parseSillyTavernJson(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      parseSillyTavernJson(e.target.files[0]);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleExport = () => {
    exportToTxt(messages);
  };

  return (
    <div 
      className="relative w-full h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        accept=".json" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileInput}
      />

      {/* Global Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm border-4 border-dashed border-muted-foreground m-4 rounded-2xl flex items-center justify-center">
          <h2 className="text-3xl font-serif text-foreground tracking-widest">
            Drop JSON File Here
          </h2>
        </div>
      )}

      <Layout onMenuClick={() => setIsSidebarOpen(true)}>
        <Sidebar 
          messages={messages} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
        
        <ReadingArea 
          messages={messages} 
          viewMode={viewMode}
          onUploadClick={triggerFileInput}
        />
        
        <Toolbar 
          theme={theme}
          toggleTheme={toggleTheme}
          viewMode={viewMode}
          toggleViewMode={toggleViewMode}
          onExport={handleExport}
          hasMessages={messages.length > 0}
        />
      </Layout>
    </div>
  );
}

export default App;
