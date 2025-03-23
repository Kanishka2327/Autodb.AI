import Anthropic from '@anthropic-ai/sdk';
import { DatabaseSchema } from '@shared/types';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025

export class AnthropicService {
  private anthropic: Anthropic;
  
  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  async generateDatabaseSchema(prompt: string, dbType: string = 'mysql'): Promise<{ schema: DatabaseSchema; sqlCode: string }> {
    try {
      const systemPrompt = `You are an expert database architect. Your task is to generate a complete database schema based on a user's description.
      
First, analyze the requirements and design an optimal database structure. 
Then, provide TWO outputs in the exact format specified:

1. A structured JSON representation of the database schema with:
   - entities: array of tables, each with fields, data types, constraints
   - relationships: connections between tables with cardinality (1:1, 1:N, N:M)

2. The complete SQL code to create the schema in ${dbType} format

The JSON must be valid and follow this exact structure:
{
  "entities": [
    {
      "id": "unique-id-1",
      "name": "table_name",
      "fields": [
        {
          "id": "field-id-1",
          "name": "field_name",
          "type": "data_type",
          "isPrimaryKey": boolean,
          "isForeignKey": boolean,
          "isNotNull": boolean,
          "isUnique": boolean,
          "defaultValue": "optional_default_value",
          "references": {
            "table": "referenced_table_name",
            "field": "referenced_field_name"
          }
        }
      ],
      "position": {
        "x": 100,
        "y": 100
      }
    }
  ],
  "relationships": [
    {
      "id": "relationship-id-1",
      "sourceEntityId": "unique-id-of-source-entity",
      "sourceFieldId": "field-id-in-source-entity",
      "targetEntityId": "unique-id-of-target-entity",
      "targetFieldId": "field-id-in-target-entity",
      "type": "1:N"
    }
  ]
}

Place each entity at a reasonable position in the diagram by setting x/y coordinates.
Each ID must be unique. Use descriptive names for tables and fields.
For the SQL code, include appropriate comments, indexes, and constraints.

Respond with ONLY a JSON object with these exact two keys:
{
  "schema": {... the JSON schema as described above ...},
  "sqlCode": "... the complete SQL code as a string ..."
}`;

      // Call Anthropic API
      const response = await this.anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ],
      });
      
      try {
        // Extract and parse the JSON response
        const content = response.content[0].text;
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                         content.match(/{[\s\S]*?schema[\s\S]*?sqlCode[\s\S]*?}/);
        
        let jsonContent = '';
        if (jsonMatch && jsonMatch[1]) {
          jsonContent = jsonMatch[1];
        } else if (jsonMatch) {
          jsonContent = jsonMatch[0];
        } else {
          jsonContent = content;
        }
        
        // Clean the text to ensure it's valid JSON
        jsonContent = jsonContent.replace(/^\s*```json\s*/, '')
                                .replace(/\s*```\s*$/, '');
        
        const parsedResponse = JSON.parse(jsonContent);
        
        return {
          schema: parsedResponse.schema,
          sqlCode: parsedResponse.sqlCode
        };
      } catch (parseError) {
        console.error("Failed to parse Anthropic response:", parseError);
        throw new Error("Failed to parse the database schema from AI response");
      }
    } catch (error) {
      console.error("Anthropic API error:", error);
      throw new Error("Failed to generate database schema: " + (error as Error).message);
    }
  }
}

export default AnthropicService;
