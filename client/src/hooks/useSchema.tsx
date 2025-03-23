import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DatabaseSchema, Entity, Relationship, GenerateSchemaResponse } from "@shared/types";
import { v4 as uuidv4 } from "uuid";
import { convertERToSchema } from "@/lib/utils/schema-parser";

export function useSchema() {
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [sqlCode, setSqlCode] = useState<string>("");
  const [dbType, setDbType] = useState<string>("mysql");
  const [isUpdatingCode, setIsUpdatingCode] = useState(false);
  const { toast } = useToast();

  // Get API key from local storage
  const getApiKey = () => localStorage.getItem("anthropic_api_key");

  // Mutation for generating schema from prompt
  const generateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/schema/generate", { 
        prompt, 
        dbType 
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
    
    // If we have a schema, update the SQL code for the new database type
    if (schema) {
      try {
        const newSqlCode = convertERToSchema(schema, type);
        setSqlCode(newSqlCode);
        
        toast({
          title: "Success",
          description: `SQL code updated for ${type}`,
          variant: "default",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to update SQL code: ${(error as Error).message}`,
          variant: "destructive",
        });
      }
    }
  }, [schema, toast]);

  // Update SQL code from the current diagram
  const updateCodeFromDiagram = useCallback(() => {
    if (!schema) {
      toast({
        title: "Error",
        description: "No schema available to update code from",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingCode(true);

    try {
      // Validate the schema
      const validationErrors = validateSchema(schema);
      
      if (validationErrors.length > 0) {
        // If there are validation errors, show them to the user
        toast({
          title: "Schema Validation Errors",
          description: validationErrors.join(". "),
          variant: "destructive",
        });
        setIsUpdatingCode(false);
        return;
      }

      // Generate SQL code from the schema
      const newSqlCode = convertERToSchema(schema, dbType);
      setSqlCode(newSqlCode);
      
      toast({
        title: "Success",
        description: "SQL code updated from diagram changes",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update SQL code: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingCode(false);
    }
  }, [schema, dbType, toast]);

  // Validate the schema for errors
  const validateSchema = (schema: DatabaseSchema): string[] => {
    const errors: string[] = [];
    
    // Check if there are any entities
    if (schema.entities.length === 0) {
      errors.push("Schema must have at least one entity");
      return errors;
    }
    
    // Check if each entity has a valid name and at least one field
    schema.entities.forEach(entity => {
      if (!entity.name || entity.name.trim() === '') {
        errors.push(`Entity with ID ${entity.id} has no name`);
      }
      
      if (!entity.fields || entity.fields.length === 0) {
        errors.push(`Entity '${entity.name || entity.id}' has no fields`);
      } else {
        // Check if each field has a valid name and type
        entity.fields.forEach(field => {
          if (!field.name || field.name.trim() === '') {
            errors.push(`Field in entity '${entity.name || entity.id}' has no name`);
          }
          
          if (!field.type || field.type.trim() === '') {
            errors.push(`Field '${field.name || field.id}' in entity '${entity.name || entity.id}' has no type`);
          }
        });
        
        // Check if there is at least one primary key
        const hasPrimaryKey = entity.fields.some(field => field.isPrimaryKey);
        if (!hasPrimaryKey) {
          errors.push(`Entity '${entity.name || entity.id}' has no primary key field`);
        }
      }
    });
    
    // Validate relationships
    schema.relationships.forEach(relationship => {
      // Check if source and target entities exist
      const sourceEntity = schema.entities.find(e => e.id === relationship.sourceEntityId);
      const targetEntity = schema.entities.find(e => e.id === relationship.targetEntityId);
      
      if (!sourceEntity) {
        errors.push(`Relationship '${relationship.id}' references non-existent source entity '${relationship.sourceEntityId}'`);
      }
      
      if (!targetEntity) {
        errors.push(`Relationship '${relationship.id}' references non-existent target entity '${relationship.targetEntityId}'`);
      }
      
      if (sourceEntity && targetEntity) {
        // Check if source and target fields exist
        const sourceField = sourceEntity.fields.find(f => f.id === relationship.sourceFieldId);
        const targetField = targetEntity.fields.find(f => f.id === relationship.targetFieldId);
        
        if (!sourceField) {
          errors.push(`Relationship '${relationship.id}' references non-existent source field '${relationship.sourceFieldId}'`);
        }
        
        if (!targetField) {
          errors.push(`Relationship '${relationship.id}' references non-existent target field '${relationship.targetFieldId}'`);
        }
        
        // Check if the relationship type is valid
        if (!relationship.type || !['1:1', '1:N', 'N:M'].includes(relationship.type)) {
          errors.push(`Relationship '${relationship.id}' has invalid type '${relationship.type}'`);
        }
      }
    });
    
    return errors;
  };

  return {
    schema,
    sqlCode,
    dbType,
    isGenerating: generateMutation.isPending,
    isUpdatingCode,
    generateSchema: (prompt: string) => generateMutation.mutate(prompt),
    updateSchema: setSchema,
    updateEntity,
    addRelationship,
    resetSchema,
    changeDbType,
    updateCodeFromDiagram
  };
}
