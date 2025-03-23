import React, { useState, useEffect } from 'react';
import { PromptPanel } from '@/components/prompt-panel';
import { DiagramPanelWithProvider } from '@/components/diagram-panel';
import { SchemaPanel } from '@/components/schema-panel';
import { EntityEditorModal } from '@/components/entity-editor-modal';
import { ERDiagram, Entity, Project, DbType, Relationship } from '@shared/types';
import { useMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseSchemaToERD, convertERToSchema } from '@/lib/utils/schema-parser';

export default function Home() {
  const isMobile = useMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [currentProject, setCurrentProject] = useState<Project>({
    name: 'My Database Project',
    prompt: '',
    schema: '',
    dbType: 'PostgreSQL',
    diagram: { entities: [], relationships: [] }
  });
  
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [isEntityEditorOpen, setIsEntityEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch recent projects
  const { data: recentProjects = [] } = useQuery({
    queryKey: ['/api/projects'],
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Save project mutation
  const saveProjectMutation = useMutation({
    mutationFn: async (project: Project) => {
      if (project.id) {
        await apiRequest('PUT', `/api/projects/${project.id}`, project);
      } else {
        return apiRequest('POST', '/api/projects', project).then(res => res.json());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        description: currentProject.id 
          ? "Project updated successfully" 
          : "Project saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save project",
        variant: "destructive",
      });
    }
  });
  
  // Handle generate schema from prompt
  const handleGenerateSchema = (schema: string, diagram: ERDiagram) => {
    setCurrentProject({
      ...currentProject,
      schema,
      diagram
    });
  };
  
  // Handle diagram change
  const handleDiagramChange = (newDiagram: ERDiagram) => {
    // When diagram changes, update the schema too
    const newSchema = convertERToSchema(newDiagram, currentProject.dbType);
    
    setCurrentProject({
      ...currentProject,
      diagram: newDiagram,
      schema: newSchema
    });
  };
  
  // Handle database type change
  const handleDbTypeChange = (newDbType: DbType) => {
    // Convert the current diagram to schema with the new DB type
    const newSchema = convertERToSchema(currentProject.diagram, newDbType);
    
    setCurrentProject({
      ...currentProject,
      dbType: newDbType,
      schema: newSchema
    });
  };
  
  // Entity editor handlers
  const handleEntityEdit = (entity: Entity) => {
    setSelectedEntity(entity);
    setIsEntityEditorOpen(true);
  };
  
  const handleEntitySave = (entity: Entity) => {
    const entities = currentProject.diagram.entities.map(e => 
      e.id === entity.id ? entity : e
    );
    
    // If this is a new entity, add it
    if (!currentProject.diagram.entities.find(e => e.id === entity.id)) {
      entities.push(entity);
    }
    
    const newDiagram = {
      ...currentProject.diagram,
      entities
    };
    
    handleDiagramChange(newDiagram);
  };
  
  // Save the current project
  const handleSaveProject = () => {
    saveProjectMutation.mutate(currentProject);
  };
  
  // Load a project from the recent list
  const handleProjectSelect = (project: Project) => {
    setCurrentProject(project);
  };
  
  // Create a new project
  const handleNewProject = () => {
    setCurrentProject({
      name: 'New Database Project',
      prompt: '',
      schema: '',
      dbType: 'PostgreSQL',
      diagram: { entities: [], relationships: [] }
    });
    
    toast({
      description: "Created a new project"
    });
  };
  
  // Export the current project
  const handleExport = () => {
    const projectData = JSON.stringify(currentProject, null, 2);
    const blob = new Blob([projectData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      description: "Project exported successfully"
    });
  };
  
  // Add new relationship handler (placeholder)
  const handleAddRelationship = () => {
    toast({
      description: "Relationship feature coming soon!",
      variant: "default"
    });
  };
  
  return (
    <div className="bg-slate-100 font-sans text-slate-800 h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm py-3 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="ri-database-2-line text-primary text-2xl" />
            <h1 className="text-xl font-bold text-slate-800">AI DBMS Generator</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleNewProject}
              className="text-slate-600 hover:text-primary flex items-center"
            >
              <span className="ri-file-add-line mr-1" />
              <span className="hidden sm:inline">New</span>
            </button>
            <button 
              onClick={handleSaveProject}
              className="text-slate-600 hover:text-primary flex items-center"
            >
              <span className="ri-save-line mr-1" />
              <span className="hidden sm:inline">Save</span>
            </button>
            <button 
              onClick={handleExport}
              className="text-slate-600 hover:text-primary flex items-center"
            >
              <span className="ri-download-line mr-1" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Prompt Panel */}
        <PromptPanel 
          onGenerate={handleGenerateSchema} 
          onLoading={setIsLoading} 
          isMobile={isMobile} 
          recentProjects={recentProjects} 
          onProjectSelect={handleProjectSelect} 
        />
        
        {/* Diagram Panel */}
        <DiagramPanelWithProvider 
          diagram={currentProject.diagram} 
          onChange={handleDiagramChange} 
          onEntityEdit={handleEntityEdit} 
          onAddRelationship={handleAddRelationship} 
          isMobile={isMobile} 
        />
        
        {/* Schema Panel */}
        <SchemaPanel 
          schema={currentProject.schema} 
          dbType={currentProject.dbType} 
          onDbTypeChange={handleDbTypeChange} 
          diagram={currentProject.diagram}
          isMobile={isMobile} 
        />
      </div>
      
      {/* Entity Editor Modal */}
      <EntityEditorModal 
        entity={selectedEntity} 
        open={isEntityEditorOpen} 
        onClose={() => setIsEntityEditorOpen(false)} 
        onSave={handleEntitySave} 
      />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-medium">Generating Your Database...</p>
            <p className="text-slate-500 text-sm mt-1">Analyzing prompt and creating schema</p>
          </div>
        </div>
      )}
    </div>
  );
}
