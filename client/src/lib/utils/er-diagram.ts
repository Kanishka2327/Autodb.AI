import { ERDiagram, Entity, Field, Relationship } from '@shared/types';
import { Node, Edge, Position } from 'reactflow';

/**
 * Converts an ER diagram to React Flow nodes and edges
 * @param diagram The ER diagram to convert
 * @returns React Flow nodes and edges
 */
export function convertERDiagramToFlow(diagram: ERDiagram): { nodes: Node[], edges: Edge[] } {
  const { entities, relationships } = diagram;
  
  // Create nodes
  const nodes: Node[] = entities.map(entity => ({
    id: entity.id,
    type: 'entityNode',
    position: entity.position,
    data: { entity }
  }));
  
  // Create edges
  const edges: Edge[] = relationships.map(relationship => {
    const sourceEntity = entities.find(e => e.id === relationship.sourceId);
    const targetEntity = entities.find(e => e.id === relationship.targetId);
    
    const sourcePosition = Position.Right;
    const targetPosition = Position.Left;
    
    // Determine edge style based on relationship type
    let markerEnd = { type: 'arrow' };
    let style = {};
    
    if (relationship.type === 'one-to-many') {
      markerEnd = { type: 'arrow', width: 20, height: 20 };
      style = { strokeWidth: 2 };
    } else if (relationship.type === 'many-to-many') {
      markerEnd = { type: 'arrow', width: 20, height: 20 };
      style = { strokeWidth: 2, strokeDasharray: '5,5' };
    }
    
    return {
      id: relationship.id,
      source: relationship.sourceId,
      target: relationship.targetId,
      sourceHandle: relationship.sourceField,
      targetHandle: relationship.targetField,
      type: 'smoothstep',
      animated: false,
      markerEnd,
      style,
      data: { relationship }
    };
  });
  
  return { nodes, edges };
}

/**
 * Converts React Flow nodes and edges to an ER diagram
 * @param nodes React Flow nodes
 * @param edges React Flow edges
 * @returns An ER diagram representation
 */
export function convertFlowToERDiagram(nodes: Node[], edges: Edge[]): ERDiagram {
  // Extract entities from nodes
  const entities: Entity[] = nodes.map(node => {
    const entityData = node.data.entity;
    return {
      ...entityData,
      position: node.position
    };
  });
  
  // Extract relationships from edges
  const relationships: Relationship[] = edges.map(edge => {
    return edge.data.relationship;
  });
  
  return { entities, relationships };
}

/**
 * Automatically layouts an ER diagram to reduce overlap
 * @param diagram The ER diagram to layout
 * @returns A new ER diagram with improved layout
 */
export function autoLayout(diagram: ERDiagram): ERDiagram {
  const { entities, relationships } = diagram;
  
  // Simple grid layout (can be replaced with more advanced algorithms)
  const gridCols = Math.ceil(Math.sqrt(entities.length));
  const cellWidth = 300;
  const cellHeight = 250;
  
  const positionedEntities = entities.map((entity, index) => {
    const col = index % gridCols;
    const row = Math.floor(index / gridCols);
    
    return {
      ...entity,
      position: {
        x: 100 + col * cellWidth,
        y: 100 + row * cellHeight
      }
    };
  });
  
  return {
    entities: positionedEntities,
    relationships
  };
}

/**
 * Creates a new entity for the ER diagram
 * @param name The name of the entity
 * @param position The position of the entity
 * @returns A new entity object
 */
export function createNewEntity(name: string, position: { x: number, y: number }): Entity {
  return {
    id: `entity-${Date.now()}`,
    name,
    position,
    fields: [
      {
        id: `field-${Date.now()}-0`,
        name: 'id',
        type: 'SERIAL',
        constraints: ['PRIMARY KEY'],
        isPrimaryKey: true,
        isForeignKey: false
      }
    ]
  };
}

/**
 * Creates a new field for an entity
 * @param entityId The ID of the entity
 * @param name The field name
 * @param type The field type
 * @param constraints The field constraints
 * @param isPrimaryKey Whether the field is a primary key
 * @returns A new field object
 */
export function createNewField(
  entityId: string,
  name: string,
  type: string,
  constraints: string[] = [],
  isPrimaryKey: boolean = false
): Field {
  return {
    id: `${entityId}-field-${Date.now()}`,
    name,
    type,
    constraints,
    isPrimaryKey,
    isForeignKey: false
  };
}

/**
 * Creates a new relationship between entities
 * @param sourceId The source entity ID
 * @param targetId The target entity ID
 * @param sourceField The source field
 * @param targetField The target field
 * @param type The relationship type
 * @returns A new relationship object
 */
export function createNewRelationship(
  sourceId: string,
  targetId: string,
  sourceField: string,
  targetField: string,
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
): Relationship {
  return {
    id: `relationship-${Date.now()}`,
    sourceId,
    targetId,
    sourceField,
    targetField,
    type
  };
}
