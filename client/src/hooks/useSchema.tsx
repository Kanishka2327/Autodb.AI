import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DatabaseSchema, Entity, Relationship, GenerateSchemaResponse } from "@shared/types";
import { v4 as uuidv4 } from "uuid";

export function useSchema() {
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [sqlCode, setSqlCode] = useState<string>("");
  const [dbType, setDbType] = useState<string>("mysql");
  const { toast } = useToast();

  // Get API key from local storage
  const getApiKey = () => localStorage.getItem("anthropic_api_key");

  // Mutation for generating schema from prompt
  const generateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error("API key is required");
      }

      const response = await apiRequest("POST", "/api/schema/generate", { 
        prompt, 
        dbType 
      }, {
        headers: {
          "x-api-key": apiKey
        }
      });
      
      return response.json() as Promise<GenerateSchemaResponse>;
    },
    onSuccess: (data) => {
      setSchema(data.schema);
      setSqlCode(data.sqlCode);
      
      toast({
        title: "Success",
        description: "Schema generated successfully!",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to generate schema: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update entity in schema
  const updateEntity = useCallback((entity: Entity) => {
    setSchema((prevSchema) => {
      if (!prevSchema) return null;

      const isNew = !prevSchema.entities.some(e => e.id === entity.id);
      
      let updatedEntities;
      if (isNew) {
        updatedEntities = [...prevSchema.entities, entity];
      } else {
        updatedEntities = prevSchema.entities.map(e => 
          e.id === entity.id ? entity : e
        );
      }

      return {
        ...prevSchema,
        entities: updatedEntities
      };
    });
  }, []);

  // Add relationship to schema
  const addRelationship = useCallback((relationship: Relationship) => {
    setSchema((prevSchema) => {
      if (!prevSchema) return null;

      return {
        ...prevSchema,
        relationships: [...prevSchema.relationships, relationship]
      };
    });
  }, []);

  // Reset schema
  const resetSchema = useCallback(() => {
    setSchema(null);
    setSqlCode("");
  }, []);

  // Change database type
  const changeDbType = useCallback((type: string) => {
    setDbType(type);
    // In a real-world scenario, we'd regenerate the SQL for the new DB type
  }, []);

  return {
    schema,
    sqlCode,
    dbType,
    isGenerating: generateMutation.isPending,
    generateSchema: (prompt: string) => generateMutation.mutate(prompt),
    updateSchema: setSchema,
    updateEntity,
    addRelationship,
    resetSchema,
    changeDbType
  };
}
